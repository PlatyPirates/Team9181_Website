import type { Metadata } from "next";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import { getCalendarContext } from "@/lib/calendar/server";
import CalendarNav from "./CalendarNav";
import CalendarClient from "./CalendarClient";
import { eyebrow, h1, muted, errorBox } from "./styles";

export const metadata: Metadata = { title: "Team Calendar" };

export default async function CalendarPage() {
  const member = await requireMember("/portal/calendar");
  let ctx;
  try {
    ctx = await getCalendarContext(member);
  } catch {
    ctx = null;
  }
  let pending = 0;
  if (ctx?.perms.includes("approve_requests")) {
    const sb = await createClient();
    const { count } = await sb.from("calendar_events").select("id", { count: "exact", head: true }).eq("status", "pending");
    pending = count ?? 0;
  }

  return (
    <main className="mx-auto max-w-[1700px] px-4 py-10 sm:px-6">
      <span className={eyebrow}>CREW</span>
      <h1 className={h1}>Team Calendar</h1>
      <p className={`mt-3 max-w-2xl ${muted}`}>
        Meetings, build nights, outreach events and competition weeks. Click a day to add an event, or an event to RSVP and comment.
      </p>
      {ctx ? (
        <>
          <CalendarNav active="calendar" perms={ctx.perms} pendingCount={pending} />
          <CalendarClient ctx={ctx} />
        </>
      ) : (
        <p className={`mt-6 ${errorBox}`}>
          The calendar isn&apos;t set up yet. Run <code>supabase/migrations/0004_calendar.sql</code> in the Supabase SQL editor.
        </p>
      )}
    </main>
  );
}
