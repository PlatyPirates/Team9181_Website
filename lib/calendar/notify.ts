import "server-only";
import { createAdminClient } from "@/utils/supabase/admin";

// Calendar alerts by email (Resend) and phone push (ntfy), reusing the same
// settings members already have under Profile → alerts. Members can switch
// calendar alerts off with notification_prefs.cal_alerts. Never throws.

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.team9181.org").replace(/\/$/, "");
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export interface CalendarAlert {
  title: string;
  message: string;
  path: string; // e.g. /portal/calendar/requests
}

/** Email one person through Resend. Resolves false on failure; never throws. */
export async function sendCalendarEmail(to: string, alert: CalendarAlert, footer: string): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey || !to) return false;
  const from =
    process.env.CALENDAR_FROM_EMAIL || process.env.RECRUITING_FROM_EMAIL || "Platy Pirates <onboarding@resend.dev>";
  const link = `${siteUrl()}${alert.path}`;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        subject: alert.title,
        html: `<div style="font-family:system-ui,sans-serif">
          <h2 style="margin:0 0 8px">${esc(alert.title)}</h2>
          <p style="margin:0 0 16px;white-space:pre-line">${esc(alert.message)}</p>
          <p><a href="${esc(link)}">Open the team calendar →</a></p>
          <p style="color:#777;font-size:12px">${esc(footer)}</p>
        </div>`,
      }),
    });
    if (!r.ok) console.error("[calendar] Resend failed", r.status, await r.text());
    return r.ok;
  } catch (e) {
    console.error("[calendar] Resend failed", e);
    return false;
  }
}

/** Phone push through ntfy. Resolves false on failure; never throws. */
export async function sendCalendarPush(topic: string, alert: CalendarAlert, tags: string[] = ["calendar"]): Promise<boolean> {
  if (!topic) return false;
  const ntfyServer = (process.env.NTFY_SERVER || "https://ntfy.sh").replace(/\/$/, "");
  try {
    const r = await fetch(ntfyServer, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, title: alert.title, message: alert.message, click: `${siteUrl()}${alert.path}`, tags }),
    });
    if (!r.ok) console.error("[calendar] ntfy failed", r.status);
    return r.ok;
  } catch (e) {
    console.error("[calendar] ntfy failed", e);
    return false;
  }
}

export async function notifyMembers(userIds: string[], alert: CalendarAlert) {
  try {
    const ids = [...new Set(userIds.filter(Boolean))];
    if (!ids.length) return;
    const admin = createAdminClient();
    const [{ data: people }, { data: prefs }] = await Promise.all([
      admin.from("profiles").select("id, email, status").in("id", ids),
      admin.from("notification_prefs").select("user_id, email_alerts, ntfy_enabled, ntfy_topic, cal_alerts").in("user_id", ids),
    ]);
    const prefBy = new Map((prefs ?? []).map((p) => [p.user_id as string, p]));
    const jobs: Promise<unknown>[] = [];
    for (const p of people ?? []) {
      if (p.status !== "active") continue;
      const pref = prefBy.get(p.id as string);
      if (pref && pref.cal_alerts === false) continue;
      const wantsEmail = pref ? Boolean(pref.email_alerts) : true;
      if (wantsEmail && p.email) {
        jobs.push(sendCalendarEmail(p.email as string, alert, "Turn calendar alerts off under Team Calendar → Settings."));
      }
      if (pref?.ntfy_enabled && pref.ntfy_topic) jobs.push(sendCalendarPush(pref.ntfy_topic as string, alert));
    }
    await Promise.allSettled(jobs);
  } catch (e) {
    console.error("[calendar] notify failed", e);
  }
}

/** Everyone holding a permission (active members only). */
export async function membersWithPermission(perm: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("calendar_user_permissions").select("user_id").eq("permission", perm);
  return (data ?? []).map((r) => r.user_id as string);
}

/** Parents of a student. */
export async function parentsOf(studentId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("guardian_links").select("parent_id").eq("student_id", studentId);
  return (data ?? []).map((r) => r.parent_id as string);
}
