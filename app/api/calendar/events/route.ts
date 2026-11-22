import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getMember } from "@/lib/auth";
import { loadGridEvents } from "@/lib/calendar/server";

const MAX_RANGE_MS = 400 * 86400000;

/** Portal grid data: occurrences the signed-in member can see. RLS decides. */
export async function GET(req: Request) {
  const member = await getMember();
  if (!member || member.status !== "active") return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const url = new URL(req.url);
  const start = url.searchParams.get("start") ?? "";
  const end = url.searchParams.get("end") ?? "";
  const s = Date.parse(start);
  const e = Date.parse(end);
  if (isNaN(s) || isNaN(e) || e <= s || e - s > MAX_RANGE_MS) {
    return NextResponse.json({ error: "Bad date range." }, { status: 400 });
  }
  try {
    const sb = await createClient();
    const events = await loadGridEvents(sb, member.id, new Date(s).toISOString(), new Date(e).toISOString());
    return NextResponse.json({ events }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Couldn't load events.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
