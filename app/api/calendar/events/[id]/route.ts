import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getMember } from "@/lib/auth";
import { EVENT_COLS } from "@/lib/calendar/server";
import type { CalendarEventRow } from "@/lib/calendar/types";

/** Everything the event panel shows: details, RSVPs, comments, history. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const member = await getMember();
  if (!member || member.status !== "active") return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await params;
  const occurrence = new URL(req.url).searchParams.get("occ") ?? "";
  const sb = await createClient();

  const { data: evData } = await sb.from("calendar_events").select(EVENT_COLS).eq("id", id).maybeSingle();
  if (!evData) return NextResponse.json({ error: "This event was removed, or you can't see it." }, { status: 404 });
  const ev = evData as CalendarEventRow;

  const [groups, rsvps, comments, activity, exc, canEdit, canDelete] = await Promise.all([
    sb.from("calendar_event_groups").select("group_id").eq("event_id", id),
    sb.from("calendar_rsvps").select("user_id, response, set_by, updated_at").eq("event_id", id).eq("occurrence", occurrence),
    sb.from("calendar_comments").select("id, author_id, posted_by, body, created_at, edited_at, deleted_at").eq("event_id", id).order("created_at"),
    sb.from("calendar_event_activity").select("id, actor_id, subject_id, by_parent, action, detail, at").eq("event_id", id).order("at", { ascending: false }).limit(30),
    occurrence
      ? sb.from("calendar_event_exceptions").select("starts_at, ends_at, title, location, description, notes, kind").eq("event_id", id).eq("original_start", occurrence).maybeSingle()
      : Promise.resolve({ data: null }),
    sb.rpc("cal_can_edit", { eid: id }),
    sb.rpc("cal_can_delete", { eid: id }),
  ]);

  const peopleIds = new Set<string>();
  const add = (x: unknown) => { if (typeof x === "string") peopleIds.add(x); };
  [ev.created_by, ev.updated_by, ev.on_behalf_of, ev.reviewed_by].forEach(add);
  (rsvps.data ?? []).forEach((r) => { add(r.user_id); add(r.set_by); });
  (comments.data ?? []).forEach((c) => { add(c.author_id); add(c.posted_by); });
  (activity.data ?? []).forEach((a) => { add(a.actor_id); add(a.subject_id); });
  const { data: people } = peopleIds.size
    ? await sb.from("profiles").select("id, full_name, username").in("id", [...peopleIds])
    : { data: [] as { id: string; full_name: string; username: string }[] };
  const names: Record<string, string> = {};
  for (const p of people ?? []) names[p.id as string] = (p.full_name as string) || (p.username as string);

  return NextResponse.json(
    {
      event: ev,
      exception: exc.data ?? null,
      groupIds: (groups.data ?? []).map((g) => g.group_id as string),
      rsvps: rsvps.data ?? [],
      comments: (comments.data ?? []).map((c) => (c.deleted_at ? { ...c, body: "" } : c)),
      activity: activity.data ?? [],
      names,
      canEdit: Boolean(canEdit.data),
      canDelete: Boolean(canDelete.data),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
