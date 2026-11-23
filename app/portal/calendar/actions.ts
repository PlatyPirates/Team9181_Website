"use server";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { requireMember } from "@/lib/auth";
import { buildRRule, endSeriesBefore, seriesEnd } from "@/lib/calendar/recurrence";
import { myPermissions, myStudents, EVENT_COLS } from "@/lib/calendar/server";
import { wallToUtc, formatRange } from "@/lib/calendar/time";
import { membersWithPermission, notifyMembers, parentsOf } from "@/lib/calendar/notify";
import { decrypt, encrypt, newFeedToken, sha256 } from "@/lib/calendar/crypto";
import { deleteTeamCalendar, refreshAccessToken, revokeToken } from "@/lib/calendar/google";
import { queueGoogleSync } from "@/lib/calendar/google-sync";
import { createAdminClient } from "@/utils/supabase/admin";
import type { CalendarEventRow, EditScope, EventInput, RsvpResponse } from "@/lib/calendar/types";

export interface ActionResult {
  ok?: boolean;
  error?: string;
  message?: string;
  id?: string;
}

const clip = (s: string | null | undefined, n: number) => {
  const t = (s ?? "").trim();
  return t ? t.slice(0, n) : null;
};

function cleanUrl(u: string): string | null {
  const t = u.trim();
  if (!t) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function cleanTags(tags: string[]): string[] {
  const out = new Set<string>();
  for (const t of tags ?? []) {
    const v = String(t).trim().replace(/^#/, "").toLowerCase().slice(0, 30);
    if (v) out.add(v);
  }
  return [...out].slice(0, 15);
}

/** Validate the form and turn Central wall times into UTC. */
function timesFrom(input: EventInput): { starts_at: string; ends_at: string } | { error: string } {
  if (!input.startDate) return { error: "Pick a start date." };
  try {
    if (input.allDay) {
      const endDate = input.endDate || input.startDate;
      const starts_at = wallToUtc(input.startDate, "00:00");
      // all-day ends are exclusive: midnight after the last day
      const last = new Date(`${endDate}T00:00:00Z`);
      last.setUTCDate(last.getUTCDate() + 1);
      const ends_at = wallToUtc(last.toISOString().slice(0, 10), "00:00");
      if (ends_at <= starts_at) return { error: "The end date is before the start date." };
      return { starts_at, ends_at };
    }
    const starts_at = wallToUtc(input.startDate, input.startTime || "00:00");
    const ends_at = wallToUtc(input.endDate || input.startDate, input.endTime || input.startTime || "00:00");
    if (Date.parse(ends_at) < Date.parse(starts_at)) return { error: "The event ends before it starts." };
    return { starts_at, ends_at };
  } catch {
    return { error: "That date or time isn't valid." };
  }
}

async function context() {
  const me = await requireMember("/portal/calendar");
  const sb = await createClient();
  const [perms, students] = await Promise.all([myPermissions(sb, me.id), myStudents(sb, me.id)]);
  return { me, sb, perms: new Set(perms), students };
}

async function publicGroupId(sb: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await sb.from("calendar_groups").select("id").eq("kind", "public").maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

async function setGroups(sb: Awaited<ReturnType<typeof createClient>>, eventId: string, groupIds: string[]) {
  const { data: existing } = await sb.from("calendar_event_groups").select("group_id").eq("event_id", eventId);
  const have = new Set((existing ?? []).map((r) => r.group_id as string));
  const want = new Set(groupIds);
  const remove = [...have].filter((g) => !want.has(g));
  const add = [...want].filter((g) => !have.has(g));
  if (remove.length) {
    const { error } = await sb.from("calendar_event_groups").delete().eq("event_id", eventId).in("group_id", remove);
    if (error) return error.message;
  }
  if (add.length) {
    const { error } = await sb.from("calendar_event_groups").insert(add.map((group_id) => ({ event_id: eventId, group_id })));
    if (error) return error.message;
  }
  return null;
}

function revalidate() {
  revalidatePath("/portal/calendar");
  revalidatePath("/portal/calendar/requests");
  queueGoogleSync();
}

function alertApprovers(title: string, when: string, who: string) {
  after(async () => {
    const approvers = await membersWithPermission("approve_requests");
    await notifyMembers(approvers, {
      title: `Calendar request: ${title}`,
      message: `${who} asked to add "${title}" (${when}) as a team event.`,
      path: "/portal/calendar/requests",
    });
  });
}

// ---------------------------------------------------------------------------
// Create / edit
// ---------------------------------------------------------------------------

export async function saveEvent(input: EventInput): Promise<ActionResult> {
  const { me, sb, perms, students } = await context();
  const title = clip(input.title, 200);
  if (!title) return { error: "Give the event a title." };
  const times = timesFrom(input);
  if ("error" in times) return { error: times.error };
  const link_url = input.linkUrl.trim() ? cleanUrl(input.linkUrl) : null;
  if (input.linkUrl.trim() && !link_url) return { error: "The link must be a web address (https://…)." };

  // "For my student" only matters when creating; an edit keeps the event's owner.
  const forStudent = !input.id && input.forStudent && students.some((s) => s.id === input.forStudent) ? input.forStudent : null;
  if (!input.id && input.forStudent && !forStudent) return { error: "You can only create events for your own student." };
  if (forStudent && !perms.has("create_for_student")) return { error: "You don't have permission to create events for your student." };

  const pubId = await publicGroupId(sb);
  let groupIds = [...new Set(input.groupIds ?? [])].filter((g) => g !== pubId);
  if (input.makePublic && pubId && perms.has("mark_public") && input.mode === "team") groupIds.push(pubId);
  if (input.mode === "personal") groupIds = [];
  if (input.mode === "team" && groupIds.length === 0) return { error: "Pick at least one group who should see this event." };

  const rrule = buildRRule(input.recurrence, times.starts_at);
  const fields = {
    title,
    description: clip(input.description, 5000),
    notes: clip(input.notes, 5000),
    custom_label: clip(input.customLabel, 60),
    location: clip(input.location, 300),
    link_url,
    starts_at: times.starts_at,
    ends_at: times.ends_at,
    all_day: Boolean(input.allDay),
    rrule,
    rrule_until: seriesEnd(rrule, times.starts_at, times.ends_at),
    category_id: input.categoryId || null,
    tags: cleanTags(input.tags),
  };

  // ---- create ---------------------------------------------------------
  if (!input.id) {
    let status: "approved" | "pending" = "approved";
    if (input.mode === "personal") {
      if (!forStudent && !perms.has("create_personal")) return { error: "You don't have permission to create personal events." };
    } else if (perms.has("create_team_event") && !forStudent) {
      status = "approved";
    } else if (perms.has("request_team_event") || (forStudent && perms.has("create_for_student"))) {
      status = "pending";
    } else {
      return { error: "You don't have permission to add team events." };
    }
    const { data, error } = await sb
      .from("calendar_events")
      .insert({ ...fields, is_private: input.mode === "personal", status, created_by: me.id, on_behalf_of: forStudent })
      .select("id")
      .single();
    if (error || !data) return { error: error?.message ?? "Couldn't save the event." };
    const id = data.id as string;
    const gErr = await setGroups(sb, id, groupIds);
    if (gErr) return { error: `Saved, but the groups didn't: ${gErr}`, id };
    if (status === "pending") alertApprovers(title, formatRange(times.starts_at, times.ends_at, fields.all_day), me.full_name || me.username);
    revalidate();
    return {
      ok: true,
      id,
      message: status === "pending" ? "Sent for approval. It shows on the calendar once an approver says yes." : "Event added.",
    };
  }

  // ---- edit -----------------------------------------------------------
  const { data: current, error: curErr } = await sb.from("calendar_events").select(EVENT_COLS).eq("id", input.id).maybeSingle();
  if (curErr || !current) return { error: "That event no longer exists, or you can't see it." };
  const ev = current as CalendarEventRow;
  const scope: EditScope = ev.rrule ? input.scope ?? "all" : "all";

  if (scope === "this" && ev.rrule && input.occurrence) {
    const { error } = await sb.from("calendar_event_exceptions").upsert(
      {
        event_id: ev.id,
        original_start: input.occurrence,
        kind: "modified",
        starts_at: times.starts_at,
        ends_at: times.ends_at,
        title,
        location: fields.location,
        description: fields.description,
        notes: fields.notes,
        updated_by: me.id,
      },
      { onConflict: "event_id,original_start" },
    );
    if (error) return { error: error.message };
    revalidate();
    return { ok: true, id: ev.id, message: "Updated this date only." };
  }

  // Status + privacy when switching between personal and team.
  let is_private = ev.is_private;
  let status = ev.status;
  let message = "Saved.";
  if (input.mode === "personal") {
    is_private = true;
    status = "approved";
  } else if (ev.is_private || ev.status === "rejected") {
    is_private = false;
    const behalf = ev.on_behalf_of !== null;
    status = perms.has("create_team_event") && !behalf ? "approved" : "pending";
    if (status === "pending") message = "Sent for approval as a team event.";
  }
  const groupsToSet = input.mode === "personal" ? [] : groupIds;

  const iAmOwner = ev.created_by === me.id || ev.on_behalf_of === me.id
    || students.some((st) => st.id === ev.created_by || st.id === ev.on_behalf_of);
  if (input.mode === "personal" && !ev.is_private && !iAmOwner) {
    return { error: "Only the person who created this team event can turn it into a personal one." };
  }

  if (scope === "following" && ev.rrule && input.occurrence && Date.parse(input.occurrence) > Date.parse(ev.starts_at)) {
    // End the old series before this date, start a new one from here.
    const cut = endSeriesBefore(ev.rrule, input.occurrence);
    const { error: cutErr } = await sb
      .from("calendar_events")
      .update({ rrule: cut, rrule_until: seriesEnd(cut, ev.starts_at, ev.ends_at) })
      .eq("id", ev.id);
    if (cutErr) return { error: cutErr.message };
    // A parent splitting their student's series keeps it the student's.
    const behalf = ev.on_behalf_of ?? (students.some((st) => st.id === ev.created_by) ? ev.created_by : null);
    const splitStatus = !is_private && behalf ? "pending" : status;
    const { data, error } = await sb
      .from("calendar_events")
      .insert({ ...fields, is_private, status: splitStatus, created_by: me.id, on_behalf_of: behalf })
      .select("id")
      .single();
    if (error || !data) return { error: error?.message ?? "Couldn't split the series." };
    await setGroups(sb, data.id as string, groupsToSet);
    revalidate();
    return { ok: true, id: data.id as string, message: "Updated this and following dates." };
  }

  // Whole event / series. Groups first so an approver never loses sight of it.
  const gErr = await setGroups(sb, ev.id, groupsToSet);
  if (gErr) return { error: gErr };
  const { error } = await sb.from("calendar_events").update({ ...fields, is_private, status }).eq("id", ev.id);
  if (error) return { error: error.message };
  if (status === "pending" && ev.status !== "pending") {
    alertApprovers(title, formatRange(times.starts_at, times.ends_at, fields.all_day), me.full_name || me.username);
  }
  revalidate();
  return { ok: true, id: ev.id, message };
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteEvent(id: string, scope: EditScope, occurrence: string): Promise<ActionResult> {
  const { sb } = await context();
  const { data: current } = await sb.from("calendar_events").select("id, rrule, starts_at, ends_at").eq("id", id).maybeSingle();
  if (!current) return { error: "That event no longer exists." };
  if (current.rrule && scope === "this" && occurrence) {
    const { error } = await sb
      .from("calendar_event_exceptions")
      .upsert({ event_id: id, original_start: occurrence, kind: "cancelled" }, { onConflict: "event_id,original_start" });
    if (error) return { error: error.message };
    revalidate();
    return { ok: true, message: "Removed that date. The rest of the series is unchanged." };
  }
  if (current.rrule && scope === "following" && occurrence && Date.parse(occurrence) > Date.parse(current.starts_at as string)) {
    const cut = endSeriesBefore(current.rrule as string, occurrence);
    const { error } = await sb
      .from("calendar_events")
      .update({ rrule: cut, rrule_until: seriesEnd(cut, current.starts_at as string, current.ends_at as string) })
      .eq("id", id);
    if (error) return { error: error.message };
    revalidate();
    return { ok: true, message: "Removed this and following dates." };
  }
  const { error, count } = await sb.from("calendar_events").delete({ count: "exact" }).eq("id", id);
  if (error) return { error: error.message };
  if (!count) return { error: "You don't have permission to delete this event." };
  revalidate();
  return { ok: true, message: "Event deleted." };
}

// ---------------------------------------------------------------------------
// RSVPs and comments (for yourself, or as a parent for your student)
// ---------------------------------------------------------------------------

export async function setRsvp(eventId: string, occurrence: string, forUser: string, response: RsvpResponse | null): Promise<ActionResult> {
  const { me, sb, students } = await context();
  const target = forUser || me.id;
  if (target !== me.id && !students.some((s) => s.id === target)) return { error: "You can only RSVP for yourself or your student." };
  if (response === null) {
    const { error } = await sb.from("calendar_rsvps").delete().eq("event_id", eventId).eq("occurrence", occurrence).eq("user_id", target);
    if (error) return { error: error.message };
  } else {
    if (!["yes", "no", "maybe"].includes(response)) return { error: "Pick Going, Maybe or Can't go." };
    const { error } = await sb
      .from("calendar_rsvps")
      .upsert({ event_id: eventId, occurrence, user_id: target, response }, { onConflict: "event_id,occurrence,user_id" });
    if (error) return { error: error.message };
  }
  revalidate();
  return { ok: true };
}

export async function addComment(eventId: string, forUser: string, body: string): Promise<ActionResult> {
  const { me, sb, students } = await context();
  const text = clip(body, 4000);
  if (!text) return { error: "Write something first." };
  const author = forUser || me.id;
  if (author !== me.id && !students.some((s) => s.id === author)) return { error: "You can only comment as yourself or your student." };
  const { error } = await sb.from("calendar_comments").insert({ event_id: eventId, author_id: author, body: text });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function removeComment(commentId: string): Promise<ActionResult> {
  const { sb } = await context();
  const { error, count } = await sb
    .from("calendar_comments")
    .update({ deleted_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", commentId);
  if (error) return { error: error.message };
  if (!count) return { error: "You can't remove that comment." };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

export async function decideRequest(formData: FormData): Promise<void> {
  const { sb, perms } = await context();
  if (!perms.has("approve_requests")) return;
  const id = String(formData.get("id") ?? "");
  const decision = formData.get("decision") === "approve" ? "approved" : "rejected";
  const note = clip(String(formData.get("note") ?? ""), 1000);
  const groupIds = formData.getAll("group").map(String);
  const makePublic = formData.get("public") === "on";
  const { data: ev } = await sb.from("calendar_events").select("id, title, starts_at, ends_at, all_day, created_by, on_behalf_of, status").eq("id", id).maybeSingle();
  if (!ev || ev.status !== "pending") return;

  if (decision === "approved") {
    const pubId = await publicGroupId(sb);
    const want = groupIds.filter((g) => g !== pubId);
    if (makePublic && pubId && perms.has("mark_public")) want.push(pubId);
    if (want.length === 0) return;
    const gErr = await setGroups(sb, id, want);
    if (gErr) throw new Error(gErr);
  }
  const { error } = await sb.from("calendar_events").update({ status: decision, review_note: note }).eq("id", id);
  if (error) throw new Error(error.message);

  const recipients = [ev.created_by as string, ev.on_behalf_of as string | null].filter(Boolean) as string[];
  after(async () => {
    const parents = ev.on_behalf_of ? [] : await parentsOf(ev.created_by as string);
    await notifyMembers([...recipients, ...parents], {
      title: decision === "approved" ? `Approved: ${ev.title}` : `Not approved: ${ev.title}`,
      message:
        decision === "approved"
          ? `"${ev.title}" (${formatRange(ev.starts_at as string, ev.ends_at as string, Boolean(ev.all_day))}) is now on the team calendar.${note ? `\n\nNote: ${note}` : ""}`
          : `"${ev.title}" wasn't approved as a team event.${note ? `\n\nNote: ${note}` : ""} You can edit it and send it again.`,
      path: "/portal/calendar",
    });
  });
  revalidate();
}

// ---------------------------------------------------------------------------
// My settings: hidden groups, time zone, alerts, personal feed
// ---------------------------------------------------------------------------

export async function savePrefs(patch: { hiddenGroups?: string[]; showLocalTz?: boolean; calAlerts?: boolean; calSize?: string }): Promise<ActionResult> {
  const me = await requireMember("/portal/calendar");
  const sb = await createClient();
  const row: Record<string, unknown> = { user_id: me.id, updated_at: new Date().toISOString() };
  if (patch.hiddenGroups) row.cal_hidden_groups = patch.hiddenGroups.slice(0, 50);
  if (typeof patch.showLocalTz === "boolean") row.cal_show_local_tz = patch.showLocalTz;
  if (typeof patch.calAlerts === "boolean") row.cal_alerts = patch.calAlerts;
  if (patch.calSize === "compact" || patch.calSize === "default" || patch.calSize === "large") row.cal_size = patch.calSize;
  const { error } = await sb.from("notification_prefs").upsert(row, { onConflict: "user_id" });
  if (error) return { error: error.message };
  if (patch.hiddenGroups) queueGoogleSync();
  return { ok: true };
}

export async function saveAlertsForm(formData: FormData): Promise<void> {
  await savePrefs({ calAlerts: formData.get("cal_alerts") === "on" });
  revalidatePath("/portal/calendar/settings");
}

/** Make (or replace) my personal feed URL. Service-role table, so done server-side. */
export async function resetFeedToken(): Promise<void> {
  const me = await requireMember("/portal/calendar/settings");
  const admin = createAdminClient();
  const token = newFeedToken();
  await admin
    .from("calendar_feed_tokens")
    .upsert({ user_id: me.id, token_hash: sha256(token), token_enc: encrypt(token), created_at: new Date().toISOString() });
  revalidatePath("/portal/calendar/settings");
}

// ---------------------------------------------------------------------------
// Fallback reminders and Google Calendar sync
// ---------------------------------------------------------------------------

export async function saveRemindersForm(formData: FormData): Promise<void> {
  const me = await requireMember("/portal/calendar/settings");
  const sb = await createClient();
  const minutes = Number(formData.get("cal_reminder_minutes"));
  const { error } = await sb.from("notification_prefs").upsert(
    {
      user_id: me.id,
      cal_reminders: formData.get("cal_reminders") === "on",
      cal_reminder_minutes: [15, 60, 1440].includes(minutes) ? minutes : 60,
      cal_reminder_email: formData.get("cal_reminder_email") === "on",
      cal_reminder_ntfy: formData.get("cal_reminder_ntfy") === "on",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(error.message);
  revalidatePath("/portal/calendar/settings");
}

/** Push my Google calendar again now (also clears a stuck error). */
export async function syncGoogleNow(): Promise<void> {
  const me = await requireMember("/portal/calendar/settings");
  const admin = createAdminClient();
  await admin
    .from("google_calendar_links")
    .update({ dirty: true, last_error: null, updated_at: new Date().toISOString() })
    .eq("user_id", me.id)
    .eq("status", "active");
  queueGoogleSync();
  revalidatePath("/portal/calendar/settings");
}

/** Disconnect: revoke our access at Google, optionally delete the Platy Pirates calendar, forget the link. */
export async function disconnectGoogle(formData: FormData): Promise<void> {
  const me = await requireMember("/portal/calendar/settings");
  const admin = createAdminClient();
  const { data: link } = await admin
    .from("google_calendar_links")
    .select("refresh_token_enc, google_calendar_id")
    .eq("user_id", me.id)
    .maybeSingle();
  if (link) {
    const refresh = decrypt(link.refresh_token_enc as string);
    if (refresh) {
      if (formData.get("remove_calendar") === "on" && link.google_calendar_id) {
        try {
          await deleteTeamCalendar(await refreshAccessToken(refresh), link.google_calendar_id as string);
        } catch (e) {
          console.warn("[calendar] couldn't delete the Google calendar", e);
        }
      }
      await revokeToken(refresh);
    }
    await admin.from("google_event_map").delete().eq("user_id", me.id);
    await admin.from("google_calendar_links").delete().eq("user_id", me.id);
  }
  revalidatePath("/portal/calendar/settings");
}

// ---------------------------------------------------------------------------
// Event style: my own choice, and the team default (Leads only)
// ---------------------------------------------------------------------------

export async function saveMyEventStyleForm(formData: FormData): Promise<void> {
  const me = await requireMember("/portal/calendar/settings");
  const v = String(formData.get("style") ?? "");
  const style = v === "tint" || v === "solid" ? v : null; // "" = team default
  const sb = await createClient();
  const { error } = await sb
    .from("notification_prefs")
    .upsert({ user_id: me.id, cal_event_style: style, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
  revalidatePath("/portal/calendar");
  revalidatePath("/portal/calendar/settings");
}

export async function saveTeamEventStyleForm(formData: FormData): Promise<void> {
  const me = await requireMember("/portal/calendar/settings");
  if (me.role !== "lead") throw new Error("Only coaches and team admins can change the team style.");
  const v = String(formData.get("style") ?? "");
  if (v !== "tint" && v !== "solid") return;
  const sb = await createClient();
  const { error } = await sb
    .from("calendar_settings")
    .update({ event_style: v, updated_by: me.id, updated_at: new Date().toISOString() })
    .eq("id", true);
  if (error) throw new Error(error.message);
  revalidatePath("/portal/calendar");
  revalidatePath("/portal/calendar/settings");
}
