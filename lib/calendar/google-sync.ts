import "server-only";
import { after } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { decrypt } from "./crypto";
import { categoryNames, exceptionsFor, loadVisibleRows } from "./server";
import { siteUrl } from "./notify";
import { buildGooglePayload, type GoogleEventBody } from "./google-payload";
import {
  calendarExists, createTeamCalendar, gcal, GoogleError, googleReady, refreshAccessToken,
} from "./google";

// One-way push: the portal is the source of truth, and each connected
// member's "Platy Pirates" calendar is brought in line with what they can
// see. Any write that could change that marks every link dirty (database
// triggers in 0005); this module pushes dirty links right after the
// request (after()) and the 10-minute cron retries whatever is left.
// Content hashes mean an unchanged event costs no Google calls.

const PAST_DAYS = 30;
const FUTURE_DAYS = 366;

interface LinkRow {
  user_id: string;
  refresh_token_enc: string;
  google_calendar_id: string | null;
  status: string;
}

interface MapRow {
  event_id: string;
  google_event_id: string;
  extra_ids: string[];
  content_hash: string;
}

const path = (calId: string, eventId?: string) =>
  `/calendars/${encodeURIComponent(calId)}/events${eventId ? `/${encodeURIComponent(eventId)}` : ""}`;

/** Insert-or-update by our fixed id. Returns the etag. */
async function putEvent(token: string, calId: string, body: GoogleEventBody, known: boolean): Promise<string | null> {
  if (known) {
    const r = await gcal<{ etag?: string }>(token, "PUT", path(calId, body.id), body);
    if (r.status === 200) return r.data?.etag ?? null;
  }
  const ins = await gcal<{ etag?: string }>(token, "POST", path(calId), body);
  if (ins.status === 200) return ins.data?.etag ?? null;
  if (ins.status === 409) {
    // The id exists already (e.g. deleted earlier, which Google keeps as cancelled).
    const r = await gcal<{ etag?: string }>(token, "PUT", path(calId, body.id), body);
    if (r.status === 200) return r.data?.etag ?? null;
  }
  if (ins.status === 404) throw new CalendarGone("The Platy Pirates calendar is missing in Google. It will be recreated on the next sync.");
  throw new GoogleError(`Couldn't save "${body.summary}" to Google (${ins.status}).`, ins.status);
}

async function removeEvent(token: string, calId: string, googleId: string) {
  await gcal(token, "DELETE", path(calId, googleId)); // 404/410 = already gone
}

class CalendarGone extends Error {}

export interface SyncResult {
  pushed: number;
  removed: number;
  unchanged: number;
  done: boolean;
}

/** Bring one member's Google calendar in line with the portal. */
export async function syncUser(userId: string, deadline = Date.now() + 25_000): Promise<SyncResult> {
  const admin = createAdminClient();
  const { data: link } = await admin
    .from("google_calendar_links")
    .select("user_id, refresh_token_enc, google_calendar_id, status")
    .eq("user_id", userId)
    .maybeSingle<LinkRow>();
  if (!link || link.status === "revoked") return { pushed: 0, removed: 0, unchanged: 0, done: true };

  const { data: prof } = await admin.from("profiles").select("status").eq("id", userId).maybeSingle();
  if (prof?.status !== "active") return { pushed: 0, removed: 0, unchanged: 0, done: true };

  const refresh = decrypt(link.refresh_token_enc);
  if (!refresh) throw new GoogleError("The saved Google sign-in can't be read (was CALENDAR_ENC_KEY changed?).", 401, "invalid_grant");
  const token = await refreshAccessToken(refresh);

  // Make sure our calendar still exists; recreate it if the member deleted it.
  let calId = link.google_calendar_id;
  if (!calId || !(await calendarExists(token, calId))) {
    calId = await createTeamCalendar(token);
    await admin.from("google_event_map").delete().eq("user_id", userId);
    await admin.from("google_calendar_links").update({ google_calendar_id: calId, updated_at: new Date().toISOString() }).eq("user_id", userId);
  }

  const now = Date.now();
  const winStart = new Date(now - PAST_DAYS * 86400000).toISOString();
  const winEnd = new Date(now + FUTURE_DAYS * 86400000).toISOString();
  const [rows, catBy, mapRes] = await Promise.all([
    loadVisibleRows(userId, winStart, winEnd),
    categoryNames(),
    admin.from("google_event_map").select("event_id, google_event_id, extra_ids, content_hash").eq("user_id", userId),
  ]);
  const ex = await exceptionsFor(admin, rows);
  const map = new Map(((mapRes.data ?? []) as MapRow[]).map((m) => [m.event_id, m]));
  const portalUrl = `${siteUrl()}/portal/calendar`;
  const res: SyncResult = { pushed: 0, removed: 0, unchanged: 0, done: true };

  // Soonest first, so a cut-off backfill still covers the next few weeks.
  rows.sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
  for (const row of rows) {
    const cat = (row.category_id && catBy.get(row.category_id)) || row.custom_label || null;
    const p = buildGooglePayload(row, ex.get(row.id) ?? [], { category: cat, portalUrl });
    const m = map.get(row.id);
    if (m && m.content_hash === p.hash) {
      res.unchanged++;
      continue;
    }
    if (Date.now() > deadline) {
      res.done = false;
      break;
    }
    const etag = await putEvent(token, calId, p.main, Boolean(m));
    const oldExtras = new Set(m?.extra_ids ?? []);
    for (const x of p.extras) {
      await putEvent(token, calId, x, oldExtras.has(x.id));
      oldExtras.delete(x.id);
    }
    for (const stale of oldExtras) await removeEvent(token, calId, stale);
    await admin.from("google_event_map").upsert({
      user_id: userId,
      event_id: row.id,
      google_event_id: p.main.id,
      extra_ids: p.extras.map((x) => x.id),
      content_hash: p.hash,
      etag,
      pushed_at: new Date().toISOString(),
    });
    res.pushed++;
  }

  // Remove what they can no longer see. Events that simply aged out of the
  // window (ended more than PAST_DAYS ago) stay in their calendar as history.
  if (res.done) {
    const seen = new Set(rows.map((r) => r.id));
    const orphans = [...map.values()].filter((m) => !seen.has(m.event_id));
    if (orphans.length) {
      const { data: still } = await admin
        .from("calendar_events")
        .select("id, status, ends_at, rrule, rrule_until")
        .in("id", orphans.map((o) => o.event_id).slice(0, 300));
      const byId = new Map((still ?? []).map((e) => [e.id as string, e]));
      for (const o of orphans) {
        if (Date.now() > deadline) {
          res.done = false;
          break;
        }
        const e = byId.get(o.event_id);
        const lastEnd = e ? ((e.rrule ? e.rrule_until : e.ends_at) as string | null) : null;
        const agedOut = e && e.status === "approved" && lastEnd !== null && Date.parse(lastEnd) < Date.parse(winStart);
        if (agedOut) continue;
        await removeEvent(token, calId, o.google_event_id);
        for (const x of o.extra_ids ?? []) await removeEvent(token, calId, x);
        await admin.from("google_event_map").delete().eq("user_id", userId).eq("event_id", o.event_id);
        res.removed++;
      }
    }
  }
  return res;
}

/** Push every dirty link, within a time budget. Never throws. */
export async function syncDirtyLinks(budgetMs = 25_000): Promise<{ users: number; errors: number }> {
  if (!googleReady()) return { users: 0, errors: 0 };
  const deadline = Date.now() + budgetMs;
  const admin = createAdminClient();
  let users = 0;
  let errors = 0;
  try {
    const { data } = await admin
      .from("google_calendar_links")
      .select("user_id")
      .eq("status", "active")
      .eq("dirty", true)
      .order("last_synced_at", { ascending: true, nullsFirst: true })
      .limit(50);
    for (const { user_id } of data ?? []) {
      if (Date.now() > deadline) break;
      // Claim it, so two overlapping runs don't push the same member.
      const { data: claimed } = await admin
        .from("google_calendar_links")
        .update({ dirty: false })
        .eq("user_id", user_id)
        .eq("dirty", true)
        .select("user_id");
      if (!claimed?.length) continue;
      users++;
      try {
        const r = await syncUser(user_id as string, deadline);
        await admin
          .from("google_calendar_links")
          .update({
            ...(r.done ? { last_synced_at: new Date().toISOString() } : { dirty: true }),
            last_error: null,
            status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user_id);
      } catch (e) {
        errors++;
        const reconnect = e instanceof GoogleError && e.needsReconnect;
        console.error("[calendar] Google sync failed", user_id, e);
        await admin
          .from("google_calendar_links")
          .update({
            dirty: !reconnect,
            status: reconnect ? "revoked" : "active",
            last_error: reconnect
              ? "Google sign-in expired or was removed. Connect again."
              : (e instanceof Error ? e.message : String(e)).slice(0, 500),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user_id);
      }
    }
  } catch (e) {
    console.error("[calendar] Google sync run failed", e);
  }
  return { users, errors };
}

/** Call from a server action or route after a calendar change. */
export function queueGoogleSync() {
  if (!googleReady()) return;
  after(() => syncDirtyLinks(20_000).then(() => undefined));
}

/** Re-check everyone once a day so new dates roll into the 12-month window. */
export async function markStaleLinksDirty() {
  const admin = createAdminClient();
  await admin
    .from("google_calendar_links")
    .update({ dirty: true })
    .eq("status", "active")
    .lt("last_synced_at", new Date(Date.now() - 86400000).toISOString());
}
