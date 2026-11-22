import "server-only";
import { DateTime } from "luxon";
import { createAdminClient } from "@/utils/supabase/admin";
import { expandRows, loadVisibleRows } from "./server";
import { sendCalendarEmail, sendCalendarPush } from "./notify";
import { formatRange } from "./time";
import { CAL_TZ } from "./types";

// Fallback reminders by email / ntfy for members who don't use Google sync.
// The cron runs every 10 minutes and sends anything starting within the
// member's lead time (+10 minutes), so a reminder can arrive up to 10
// minutes early but never late. calendar_reminders_sent makes each one
// go out once.

export const REMINDER_CHOICES = [
  { minutes: 15, label: "15 minutes before" },
  { minutes: 60, label: "1 hour before" },
  { minutes: 1440, label: "1 day before" },
] as const;

const TICK_MS = 10 * 60 * 1000;
/** All-day events are reminded as if they start at 7 AM Central. */
const ALL_DAY_HOUR = 7;

function remindAt(startIso: string, allDay: boolean): number {
  if (!allDay) return Date.parse(startIso);
  return DateTime.fromISO(startIso, { zone: "utc" }).setZone(CAL_TZ).set({ hour: ALL_DAY_HOUR }).toMillis();
}

export async function sendDueReminders(budgetMs = 25_000): Promise<{ sent: number }> {
  const deadline = Date.now() + budgetMs;
  const admin = createAdminClient();
  let sent = 0;
  const { data: prefs } = await admin
    .from("notification_prefs")
    .select("user_id, cal_reminder_minutes, cal_reminder_email, cal_reminder_ntfy, ntfy_enabled, ntfy_topic")
    .eq("cal_reminders", true);
  if (!prefs?.length) return { sent };
  const ids = prefs.map((p) => p.user_id as string);
  const { data: people } = await admin.from("profiles").select("id, email, status").in("id", ids);
  const personBy = new Map((people ?? []).map((p) => [p.id as string, p]));
  const now = Date.now();

  for (const pref of prefs) {
    if (Date.now() > deadline) break;
    const person = personBy.get(pref.user_id as string);
    if (!person || person.status !== "active") continue;
    const lead = Number(pref.cal_reminder_minutes) * 60000 || 3600000;
    const email = pref.cal_reminder_email ? (person.email as string | null) : null;
    const topic = pref.cal_reminder_ntfy && pref.ntfy_enabled ? (pref.ntfy_topic as string | null) : null;
    if (!email && !topic) continue;
    try {
      // Look a day further back than "now" so all-day events (reminded at
      // 7 AM, but starting at midnight) are included.
      const start = new Date(now - 86400000).toISOString();
      const end = new Date(now + lead + TICK_MS).toISOString();
      const rows = await loadVisibleRows(pref.user_id as string, start, end);
      if (!rows.length) continue;
      const occs = (await expandRows(admin, rows, start, end)).filter(({ occ }) => {
        const at = remindAt(occ.start, occ.allDay);
        return at >= now && at - lead < now + TICK_MS;
      });
      if (!occs.length) continue;
      const { data: noRsvps } = await admin
        .from("calendar_rsvps")
        .select("event_id, occurrence")
        .eq("user_id", pref.user_id)
        .eq("response", "no")
        .in("event_id", [...new Set(occs.map((o) => o.row.id))]);
      const skip = new Set((noRsvps ?? []).map((r) => `${r.event_id}|${r.occurrence}`));

      for (const { row, occ } of occs) {
        if (skip.has(`${row.id}|${occ.occurrence}`)) continue;
        // Claim first: only the run that inserts the row sends.
        const { data: claimed } = await admin
          .from("calendar_reminders_sent")
          .upsert(
            { user_id: pref.user_id, event_id: row.id, occurrence: occ.occurrence },
            { onConflict: "user_id,event_id,occurrence", ignoreDuplicates: true },
          )
          .select("event_id");
        if (!claimed?.length) continue;
        const alert = {
          title: `Reminder: ${occ.title}`,
          message: [formatRange(occ.start, occ.end, occ.allDay), occ.location].filter(Boolean).join("\n"),
          path: "/portal/calendar",
        };
        const jobs: Promise<boolean>[] = [];
        if (email) jobs.push(sendCalendarEmail(email, alert, "Change or turn off reminders under Team Calendar → Settings."));
        if (topic) jobs.push(sendCalendarPush(topic, alert, ["calendar", "alarm_clock"]));
        await Promise.allSettled(jobs);
        sent++;
      }
    } catch (e) {
      console.error("[calendar] reminders failed for", pref.user_id, e);
    }
  }

  // Housekeeping: forget reminders older than 60 days.
  await admin.from("calendar_reminders_sent").delete().lt("sent_at", new Date(now - 60 * 86400000).toISOString());
  return { sent };
}
