import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import type { Member } from "@/lib/auth";
import { expandEvent } from "./recurrence";
import {
  CAL_PERMISSIONS, DEFAULT_COLOR, LABEL_COLOR, PRIVATE_COLOR,
  type CalendarCategory, type CalendarContext, type CalendarEventRow, type CalendarGroup,
  type CalendarPermission, type ExceptionRow, asCalSize, passesGroupFilter, type GridEvent, type MiniMember, type Occurrence, type RsvpResponse,
} from "./types";

export const EVENT_COLS =
  "id, title, description, notes, custom_label, location, link_url, starts_at, ends_at, all_day, rrule, rrule_until, category_id, tags, is_private, created_by, updated_by, on_behalf_of, status, reviewed_by, review_note, created_at, updated_at";

/** PostgREST filter: one-offs overlapping the range, or series still running in it. */
export function rangeFilter(start: string, end: string): string {
  const s = `"${new Date(start).toISOString()}"`;
  const e = `"${new Date(end).toISOString()}"`;
  return `and(rrule.is.null,starts_at.lt.${e},ends_at.gt.${s}),and(rrule.not.is.null,starts_at.lt.${e},or(rrule_until.is.null,rrule_until.gt.${s}))`;
}

export async function myPermissions(sb: SupabaseClient, uid: string): Promise<CalendarPermission[]> {
  const { data } = await sb.from("calendar_user_permissions").select("permission").eq("user_id", uid);
  return (data ?? [])
    .map((r) => r.permission as CalendarPermission)
    .filter((p) => (CAL_PERMISSIONS as readonly string[]).includes(p));
}

export async function myStudents(sb: SupabaseClient, uid: string): Promise<MiniMember[]> {
  const { data } = await sb.from("guardian_links").select("student_id").eq("parent_id", uid);
  const ids = (data ?? []).map((r) => r.student_id as string);
  if (!ids.length) return [];
  const { data: profs } = await sb.from("profiles").select("id, full_name, username").in("id", ids);
  return (profs ?? []) as MiniMember[];
}

export async function getCalendarContext(member: Member): Promise<CalendarContext> {
  const sb = await createClient();
  const [perms, students, groupsRes, catsRes, prefsRes, teamStyle] = await Promise.all([
    myPermissions(sb, member.id),
    myStudents(sb, member.id),
    sb.from("calendar_groups").select("id, slug, name, kind, auto_rule, is_preset, sort").order("sort"),
    sb.from("calendar_categories").select("id, name, color, is_preset, archived, sort").order("sort").order("name"),
    sb.from("notification_prefs").select("*").eq("user_id", member.id).maybeSingle(),
    teamEventStyle(sb),
  ]);
  if (groupsRes.error) throw new Error(groupsRes.error.message);
  const groups = (groupsRes.data ?? []) as CalendarGroup[];
  const viewerIds = [member.id, ...students.map((s) => s.id)];
  const seeAll = perms.includes("edit_any_event") || perms.includes("approve_requests");
  const mine = await viewerGroupIds(sb, viewerIds, seeAll);
  return {
    me: { id: member.id, full_name: member.full_name, username: member.username, role: member.role },
    perms,
    students,
    groups,
    myGroupIds: [...mine],
    categories: (catsRes.data ?? []) as CalendarCategory[],
    hiddenGroups: ((prefsRes.data?.cal_hidden_groups as string[] | null) ?? []).filter((id) => mine.has(id)),
    showLocalTz: Boolean(prefsRes.data?.cal_show_local_tz),
    eventStyle: asStyle(prefsRes.data?.cal_event_style) ?? teamStyle,
    myEventStyle: asStyle(prefsRes.data?.cal_event_style),
    teamEventStyle: teamStyle,
    calSize: asCalSize(prefsRes.data?.cal_size),
  };
}

const asStyle = (v: unknown): "tint" | "solid" | null => (v === "tint" || v === "solid" ? v : null);

/** The team default event style (0006). Falls back to tint before the migration runs. */
export async function teamEventStyle(sb?: SupabaseClient): Promise<"tint" | "solid"> {
  try {
    const client = sb ?? createAdminClient();
    const { data } = await client.from("calendar_settings").select("event_style").eq("id", true).maybeSingle();
    return asStyle(data?.event_style) ?? "tint";
  } catch {
    return "tint";
  }
}

export async function exceptionsFor(sb: SupabaseClient, rows: CalendarEventRow[]): Promise<Map<string, ExceptionRow[]>> {
  const ids = rows.filter((r) => r.rrule).map((r) => r.id);
  const map = new Map<string, ExceptionRow[]>();
  for (let i = 0; i < ids.length; i += 150) {
    const { data } = await sb
      .from("calendar_event_exceptions")
      .select("event_id, original_start, kind, starts_at, ends_at, title, location, description, notes")
      .in("event_id", ids.slice(i, i + 150));
    for (const x of (data ?? []) as ExceptionRow[]) {
      const list = map.get(x.event_id) ?? [];
      list.push(x);
      map.set(x.event_id, list);
    }
  }
  return map;
}

export async function expandRows(sb: SupabaseClient, rows: CalendarEventRow[], start: string, end: string) {
  const ex = await exceptionsFor(sb, rows);
  const out: { row: CalendarEventRow; occ: Occurrence }[] = [];
  for (const row of rows) {
    for (const occ of expandEvent(row, ex.get(row.id) ?? [], start, end)) out.push({ row, occ });
  }
  out.sort((a, b) => a.occ.start.localeCompare(b.occ.start));
  return out;
}

/** Portal grid: everything the signed-in member can see in the range (RLS decides). */
export async function loadGridEvents(sb: SupabaseClient, uid: string, start: string, end: string): Promise<GridEvent[]> {
  const { data, error } = await sb
    .from("calendar_events")
    .select(EVENT_COLS)
    .or(rangeFilter(start, end))
    .neq("status", "rejected")
    .limit(2000);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as CalendarEventRow[];
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [occs, groupsRes, catsRes, rsvpRes] = await Promise.all([
    expandRows(sb, rows, start, end),
    sb.from("calendar_event_groups").select("event_id, group_id").in("event_id", ids),
    sb.from("calendar_categories").select("id, color"),
    sb.from("calendar_rsvps").select("event_id, occurrence, response").eq("user_id", uid).in("event_id", ids),
  ]);
  const groupsBy = new Map<string, string[]>();
  for (const g of groupsRes.data ?? []) {
    const l = groupsBy.get(g.event_id as string) ?? [];
    l.push(g.group_id as string);
    groupsBy.set(g.event_id as string, l);
  }
  const colorBy = new Map((catsRes.data ?? []).map((c) => [c.id as string, c.color as string]));
  const rsvpBy = new Map((rsvpRes.data ?? []).map((r) => [`${r.event_id}|${r.occurrence}`, r.response as RsvpResponse]));
  return occs.map(({ row, occ }) => ({
    ...occ,
    recurring: Boolean(row.rrule),
    status: row.status,
    isPrivate: row.is_private,
    categoryId: row.category_id,
    customLabel: row.custom_label,
    color: row.is_private
      ? PRIVATE_COLOR
      : (row.category_id && colorBy.get(row.category_id)) || (row.custom_label ? LABEL_COLOR : DEFAULT_COLOR),
    groupIds: groupsBy.get(row.id) ?? [],
    tags: row.tags ?? [],
    createdBy: row.created_by,
    onBehalfOf: row.on_behalf_of,
    myRsvp: rsvpBy.get(`${row.id}|${occ.occurrence}`) ?? null,
  }));
}

export interface PublicOccurrence extends Occurrence {
  category: string | null;
  color: string;
  linkUrl: string | null;
  updatedAt: string;
}

/** Approved events in the Public Calendar group. Server-only (service role). */
export async function loadPublicEvents(start: string, end: string): Promise<PublicOccurrence[]> {
  const admin = createAdminClient();
  const { data: pub } = await admin.from("calendar_groups").select("id").eq("kind", "public");
  const pubIds = (pub ?? []).map((g) => g.id as string);
  if (!pubIds.length) return [];
  const { data: links } = await admin.from("calendar_event_groups").select("event_id").in("group_id", pubIds);
  const ids = [...new Set((links ?? []).map((l) => l.event_id as string))];
  if (!ids.length) return [];
  const { data } = await admin
    .from("calendar_events")
    .select(EVENT_COLS)
    .in("id", ids)
    .eq("status", "approved")
    .eq("is_private", false)
    .or(rangeFilter(start, end));
  const rows = (data ?? []) as CalendarEventRow[];
  const { data: cats } = await admin.from("calendar_categories").select("id, name, color");
  const catBy = new Map((cats ?? []).map((c) => [c.id as string, c]));
  const occs = await expandRows(admin, rows, start, end);
  return occs.map(({ row, occ }) => {
    const c = row.category_id ? catBy.get(row.category_id) : undefined;
    return {
      ...occ,
      notes: null, // notes are for members only
      category: (c?.name as string | undefined) ?? row.custom_label ?? null,
      color: (c?.color as string | undefined) ?? (row.custom_label ? LABEL_COLOR : DEFAULT_COLOR),
      linkUrl: row.link_url,
      updatedAt: row.updated_at,
    };
  });
}

/** Groups a viewer counts as "in" for the filter (incl. their students' groups). */
export async function viewerGroupIds(sb: SupabaseClient, viewerIds: string[], seeAll: boolean): Promise<Set<string>> {
  const [{ data: groups }, { data: gm }] = await Promise.all([
    sb.from("calendar_groups").select("id, kind"),
    sb.from("calendar_group_members").select("group_id").in("user_id", viewerIds).eq("excluded", false),
  ]);
  const mine = new Set((gm ?? []).map((r) => r.group_id as string));
  for (const g of groups ?? []) if (g.kind !== "members" || seeAll) mine.add(g.id as string);
  return mine;
}

/**
 * The event rows one member sees (approved, visible to them, passing their
 * group filter) in a range. Server-only (service role). Used by the
 * personal .ics feed, Google push and reminders.
 */
export async function loadVisibleRows(uid: string, start: string, end: string): Promise<CalendarEventRow[]> {
  const admin = createAdminClient();
  const { data: idRows, error } = await admin.rpc("calendar_visible_event_ids", {
    uid, range_start: start, range_end: end,
  });
  if (error) throw new Error(error.message);
  const ids = ((idRows ?? []) as unknown[]).map((r) => (typeof r === "string" ? r : Object.values(r as object)[0]) as string);
  if (!ids.length) return [];
  const [students, perms, prefs] = await Promise.all([
    myStudents(admin, uid),
    myPermissions(admin, uid),
    admin.from("notification_prefs").select("cal_hidden_groups").eq("user_id", uid).maybeSingle(),
  ]);
  const viewerIds = [uid, ...students.map((s) => s.id)];
  const myGroups = await viewerGroupIds(admin, viewerIds, perms.includes("edit_any_event") || perms.includes("approve_requests"));
  const hidden = new Set(((prefs.data?.cal_hidden_groups as string[] | null) ?? []));
  const rows: CalendarEventRow[] = [];
  const groupsBy = new Map<string, string[]>();
  // .in() goes in the URL, so read in chunks.
  for (let i = 0; i < ids.length; i += 150) {
    const chunk = ids.slice(i, i + 150);
    const [{ data }, { data: eg }] = await Promise.all([
      admin.from("calendar_events").select(EVENT_COLS).in("id", chunk),
      admin.from("calendar_event_groups").select("event_id, group_id").in("event_id", chunk),
    ]);
    rows.push(...((data ?? []) as CalendarEventRow[]));
    for (const g of eg ?? []) groupsBy.set(g.event_id as string, [...(groupsBy.get(g.event_id as string) ?? []), g.group_id as string]);
  }
  return rows.filter((r) =>
    passesGroupFilter(
      groupsBy.get(r.id) ?? [], myGroups, hidden,
      r.is_private && (viewerIds.includes(r.created_by ?? "") || viewerIds.includes(r.on_behalf_of ?? "")),
    ),
  );
}

/** Category id -> name (server-only). */
export async function categoryNames(): Promise<Map<string, string>> {
  const { data } = await createAdminClient().from("calendar_categories").select("id, name");
  return new Map((data ?? []).map((c) => [c.id as string, c.name as string]));
}

/** What one member's personal .ics feed shows. Server-only (service role). */
export async function loadFeedEvents(uid: string, start: string, end: string) {
  const rows = await loadVisibleRows(uid, start, end);
  if (!rows.length) return [];
  const catBy = await categoryNames();
  const occs = await expandRows(createAdminClient(), rows, start, end);
  return occs.map(({ row, occ }) => ({ row, occ, category: (row.category_id && catBy.get(row.category_id)) || row.custom_label }));
}
