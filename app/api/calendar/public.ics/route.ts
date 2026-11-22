import { loadPublicEvents } from "@/lib/calendar/server";
import { buildIcs, icsResponse } from "@/lib/calendar/ics";

/** Anyone's calendar app can subscribe to this: public team events only. */
export async function GET() {
  const now = Date.now();
  const start = new Date(now - 30 * 86400000).toISOString();
  const end = new Date(now + 365 * 86400000).toISOString();
  try {
    const events = await loadPublicEvents(start, end);
    const body = buildIcs(
      "Platy Pirates (FRC 9181)",
      events.map((o) => ({
        uid: `${o.eventId}-${o.occurrence ? Date.parse(o.occurrence) : "0"}@team9181.org`,
        title: o.title,
        start: o.start,
        end: o.end,
        allDay: o.allDay,
        location: o.location,
        description: o.description,
        url: o.linkUrl,
        categories: o.category ? [o.category] : [],
        updatedAt: o.updatedAt,
      })),
      "Public events for FRC Team 9181, the Platy Pirates.",
    );
    return icsResponse(body, "platy-pirates.ics", 900);
  } catch (err) {
    console.error("[calendar] public.ics failed", err);
    return new Response("Calendar temporarily unavailable.", { status: 503 });
  }
}
