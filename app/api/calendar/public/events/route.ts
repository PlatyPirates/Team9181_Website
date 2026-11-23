import { NextResponse } from "next/server";
import { loadPublicEvents, teamEventStyle } from "@/lib/calendar/server";

const MAX_RANGE_MS = 400 * 86400000;

/** Public site calendar data: approved events in the Public Calendar group only. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const s = Date.parse(url.searchParams.get("start") ?? "");
  const e = Date.parse(url.searchParams.get("end") ?? "");
  if (isNaN(s) || isNaN(e) || e <= s || e - s > MAX_RANGE_MS) {
    return NextResponse.json({ error: "Bad date range." }, { status: 400 });
  }
  try {
    const [events, style] = await Promise.all([
      loadPublicEvents(new Date(s).toISOString(), new Date(e).toISOString()),
      teamEventStyle(),
    ]);
    return NextResponse.json(
      {
        style,
        events: events.map((o) => ({
          id: `${o.eventId}|${o.occurrence}`,
          title: o.title,
          start: o.start,
          end: o.end,
          allDay: o.allDay,
          location: o.location,
          description: o.description,
          category: o.category,
          color: o.color,
          linkUrl: o.linkUrl,
        })),
      },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
    );
  } catch (err) {
    console.error("[calendar] public events failed", err);
    return NextResponse.json({ error: "Couldn't load events." }, { status: 500 });
  }
}
