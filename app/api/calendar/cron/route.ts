import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { markStaleLinksDirty, syncDirtyLinks } from "@/lib/calendar/google-sync";
import { sendDueReminders } from "@/lib/calendar/reminders";

// Called every 10 minutes by Supabase pg_cron + pg_net (or Vercel Cron) with
// "Authorization: Bearer <CALENDAR_CRON_SECRET>". Retries Google pushes,
// rolls new dates into each member's Google window, and sends fallback
// email / ntfy reminders.

export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CALENDAR_CRON_SECRET || process.env.CRON_SECRET;
  if (!secret) return false;
  const got = req.headers.get("authorization") ?? "";
  const want = `Bearer ${secret}`;
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function run(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const started = Date.now();
  const result: Record<string, unknown> = {};
  try {
    const reminders = await sendDueReminders(20_000);
    result.reminders = reminders;
  } catch (e) {
    result.remindersError = e instanceof Error ? e.message : String(e);
  }
  try {
    await markStaleLinksDirty();
    result.google = await syncDirtyLinks(Math.max(5_000, 50_000 - (Date.now() - started)));
  } catch (e) {
    result.googleError = e instanceof Error ? e.message : String(e);
  }
  result.ms = Date.now() - started;
  return NextResponse.json(result);
}

export const GET = run;
export const POST = run;
