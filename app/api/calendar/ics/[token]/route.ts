import { createAdminClient } from "@/utils/supabase/admin";
import { loadFeedEvents } from "@/lib/calendar/server";
import { buildIcs, icsResponse } from "@/lib/calendar/ics";
import { sha256 } from "@/lib/calendar/crypto";

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.team9181.org").replace(/\/$/, "");
}

/** A member's personal feed. The token in the URL is the only credential. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token: raw } = await params;
  const token = decodeURIComponent(raw).replace(/\.ics$/i, "");
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return new Response("Not found", { status: 404 });

  const admin = createAdminClient();
  const { data: row } = await admin.from("calendar_feed_tokens").select("user_id").eq("token_hash", sha256(token)).maybeSingle();
  if (!row) return new Response("Not found", { status: 404 });
  const uid = row.user_id as string;
  const { data: prof } = await admin.from("profiles").select("status, full_name").eq("id", uid).maybeSingle();
  if (!prof || prof.status !== "active") return new Response("Not found", { status: 404 });

  const now = Date.now();
  try {
    const items = await loadFeedEvents(uid, new Date(now - 30 * 86400000).toISOString(), new Date(now + 365 * 86400000).toISOString());
    const body = buildIcs(
      "Platy Pirates team calendar",
      items.map(({ row: ev, occ, category }) => ({
        uid: `${ev.id}-${occ.occurrence ? Date.parse(occ.occurrence) : "0"}@team9181.org`,
        title: ev.is_private ? `${occ.title} (personal)` : occ.title,
        start: occ.start,
        end: occ.end,
        allDay: occ.allDay,
        location: occ.location,
        description: [occ.description, occ.notes && `Notes: ${occ.notes}`, `${siteUrl()}/portal/calendar`].filter(Boolean).join("\n\n"),
        url: ev.link_url,
        categories: category ? [category] : [],
        updatedAt: ev.updated_at,
      })),
      `Team 9181 events for ${prof.full_name || "you"}. Keep this link private.`,
    );
    return icsResponse(body, "platy-pirates-team.ics");
  } catch (err) {
    console.error("[calendar] personal feed failed", err);
    return new Response("Calendar temporarily unavailable.", { status: 503 });
  }
}
