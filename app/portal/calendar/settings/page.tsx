import type { Metadata } from "next";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getCalendarContext } from "@/lib/calendar/server";
import { decrypt } from "@/lib/calendar/crypto";
import CalendarNav from "../CalendarNav";
import CopyField from "./CopyField";
import {
  disconnectGoogle, resetFeedToken, saveAlertsForm, saveMyEventStyleForm, saveRemindersForm, saveTeamEventStyleForm, syncGoogleNow,
} from "../actions";
import { EVENT_STYLES } from "@/lib/calendar/types";
import { btnCta, btnGhost, card, errorBox, eyebrow, h1, hintBox, inputBase, labelCls, muted } from "../styles";
import { googleSetupMissing } from "@/lib/calendar/google";
import { REMINDER_CHOICES } from "@/lib/calendar/reminders";
import { DateTime } from "luxon";
import { CAL_TZ } from "@/lib/calendar/types";

export const metadata: Metadata = { title: "Calendar settings" };

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.team9181.org").replace(/\/$/, "");
}

const GOOGLE_NOTICE: Record<string, { ok: boolean; text: string }> = {
  connected: { ok: true, text: "Google Calendar connected. Your events are being copied to the \u201cPlaty Pirates\u201d calendar now; a big calendar can take a few minutes." },
  denied: { ok: false, text: "Google access wasn't granted, so nothing was connected." },
  scope: { ok: false, text: "Google didn't grant calendar access. Try again and leave the calendar box ticked on Google's screen." },
  no_refresh: { ok: false, text: "Google didn't send a long-lived sign-in. Remove \u201cPlaty Pirates\u201d under myaccount.google.com \u2192 Security \u2192 Third-party access, then connect again." },
  expired: { ok: false, text: "That sign-in took too long or came from another tab. Please try again." },
  not_configured: { ok: false, text: "Google sync isn't set up on this site yet." },
  failed: { ok: false, text: "Something went wrong connecting to Google. Please try again." },
  signed_out: { ok: false, text: "You were signed out. Sign in and try again." },
};

interface GoogleLink {
  google_email: string | null;
  status: string;
  last_error: string | null;
  last_synced_at: string | null;
  dirty: boolean;
}

export default async function CalendarSettingsPage({ searchParams }: { searchParams: Promise<{ google?: string }> }) {
  const member = await requireMember("/portal/calendar/settings");
  const ctx = await getCalendarContext(member);
  const sb = await createClient();
  const { data: prefs } = await sb
    .from("notification_prefs")
    .select("cal_alerts, email_alerts, ntfy_enabled, ntfy_topic, cal_reminders, cal_reminder_minutes, cal_reminder_email, cal_reminder_ntfy")
    .eq("user_id", member.id)
    .maybeSingle();
  const notice = GOOGLE_NOTICE[(await searchParams).google ?? ""];
  const googleMissing = googleSetupMissing();
  let google: GoogleLink | null = null;
  try {
    const { data } = await createAdminClient()
      .from("google_calendar_links")
      .select("google_email, status, last_error, last_synced_at, dirty")
      .eq("user_id", member.id)
      .maybeSingle();
    google = (data as GoogleLink | null) ?? null;
  } catch {
    google = null;
  }
  const canManage = ctx.perms.includes("manage_permissions");

  let feedUrl: string | null = null;
  try {
    const admin = createAdminClient();
    const { data: tok } = await admin.from("calendar_feed_tokens").select("token_enc").eq("user_id", member.id).maybeSingle();
    const token = tok ? decrypt(tok.token_enc as string) : null;
    if (token) feedUrl = `${siteUrl()}/api/calendar/ics/${token}.ics`;
  } catch {
    feedUrl = null;
  }
  const publicUrl = `${siteUrl()}/api/calendar/public.ics`;
  const webcal = (u: string) => u.replace(/^https?:/, "webcal:");

  return (
    <main className="mx-auto max-w-[1200px] px-6 py-10">
      <span className={eyebrow}>CALENDAR</span>
      <h1 className={h1}>Subscribe &amp; settings</h1>
      <CalendarNav active="settings" perms={ctx.perms} />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className={`${card} p-5`}>
          <h2 className="font-display text-xl font-extrabold text-[color:var(--p-text)]">Subscribe in your calendar app</h2>
          <p className={`mt-2 text-sm ${muted}`}>
            Your personal link shows every team event you can see (and your personal events), following the group filter on the calendar page.
            Keep it private: anyone with the link can read it.
          </p>
          {feedUrl ? (
            <div className="mt-4 grid gap-3">
              <CopyField label="Your personal calendar link" value={feedUrl} />
              <div className="flex flex-wrap gap-2 text-sm">
                <a className={btnGhost} href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal(feedUrl))}`} target="_blank" rel="noreferrer">Add to Google Calendar</a>
                <a className={btnGhost} href={webcal(feedUrl)}>Add to Apple / Outlook</a>
              </div>
              <form action={resetFeedToken}>
                <button className={`text-xs ${muted} underline`}>Reset link (the old one stops working)</button>
              </form>
            </div>
          ) : (
            <form action={resetFeedToken} className="mt-4">
              <button className={btnCta}>Create my calendar link</button>
            </form>
          )}
          <p className={`mt-4 ${hintBox} text-xs`}>
            Calendar apps check these links on their own schedule. Google can take 12 to 24 hours to show changes; Apple and Outlook are usually faster.
            For instant updates in Google, use <a href="#google" className="underline">Google Calendar sync</a> below instead.
          </p>
          <div className="mt-4">
            <span className={labelCls}>Public team calendar (anyone)</span>
            <CopyField label="Public calendar link" value={publicUrl} hideLabel />
          </div>
        </section>

        <section className={`${card} p-5`}>
          <h2 className="font-display text-xl font-extrabold text-[color:var(--p-text)]">Alerts</h2>
          <p className={`mt-2 text-sm ${muted}`}>
            Calendar alerts (a request needs approval, your request was approved or not) use the email and phone settings on your{" "}
            <a href="/portal/profile#alerts" className="text-[color:var(--p-accent)] underline">Profile</a>.
            Right now: email {prefs?.email_alerts === false ? "off" : "on"}, phone {prefs?.ntfy_enabled ? "on" : "off"}.
          </p>
          <form action={saveAlertsForm} className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="cal_alerts" defaultChecked={prefs?.cal_alerts !== false} /> Send me calendar alerts
            </label>
            <button className={btnGhost}>Save</button>
          </form>

<form action={saveRemindersForm} className="mt-6 grid gap-3 border-t border-[color:var(--p-border)] pt-5 text-sm">
            <h3 className="font-display text-lg font-extrabold text-[color:var(--p-text)]">Event reminders</h3>
            <p className={muted}>
              {google && google.status === "active"
                ? "Google Calendar sends your reminders now. Turn these on too only if you also want an email or phone push."
                : "Get a reminder before each event you can see (skipped for events you said you can\u2019t go to). With Google sync on, Google sends reminders instead."}
            </p>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="cal_reminders" defaultChecked={Boolean(prefs?.cal_reminders)} /> Remind me
            </label>
            <label className="flex flex-wrap items-center gap-2">
              <span>When</span>
              <select name="cal_reminder_minutes" defaultValue={String(prefs?.cal_reminder_minutes ?? 60)} className={inputBase}>
                {REMINDER_CHOICES.map((c) => (
                  <option key={c.minutes} value={c.minutes}>{c.label}</option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="cal_reminder_email" defaultChecked={prefs?.cal_reminder_email !== false} /> Email
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="cal_reminder_ntfy" defaultChecked={prefs?.cal_reminder_ntfy !== false} />
                Phone push{!(prefs?.ntfy_enabled && prefs?.ntfy_topic) && (
                  <span className={`text-xs ${muted}`}>(set up phone alerts on your Profile first)</span>
                )}
              </label>
            </div>
            <p className={`text-xs ${muted}`}>All-day events are reminded as if they start at 7 AM. Reminders can arrive up to 10 minutes early.</p>
            <div>
              <button className={btnGhost}>Save reminders</button>
            </div>
          </form>
        </section>

        <section id="look" className={`${card} p-5 lg:col-span-2`}>
          <h2 className="font-display text-xl font-extrabold text-[color:var(--p-text)]">Calendar look</h2>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <form action={saveMyEventStyleForm} className="grid gap-3 text-sm">
              <span className={labelCls}>My event style</span>
              <label className="flex items-center gap-2">
                <input type="radio" name="style" value="" defaultChecked={ctx.myEventStyle === null} />
                Team default ({EVENT_STYLES.find((x) => x.value === ctx.teamEventStyle)?.label})
              </label>
              {EVENT_STYLES.map((st) => (
                <label key={st.value} className="flex items-center gap-2">
                  <input type="radio" name="style" value={st.value} defaultChecked={ctx.myEventStyle === st.value} />
                  <StyleSample style={st.value} /> {st.label}
                  <span className={`text-xs ${muted}`}>{st.hint}</span>
                </label>
              ))}
              <div>
                <button className={btnGhost}>Save my style</button>
              </div>
            </form>
            {member.role === "lead" && (
              <form action={saveTeamEventStyleForm} className="grid gap-3 text-sm">
                <span className={labelCls}>Team default (coaches and team admins)</span>
                <p className={muted}>Used on the public calendar page and for every member who hasn&apos;t picked their own.</p>
                {EVENT_STYLES.map((st) => (
                  <label key={st.value} className="flex items-center gap-2">
                    <input type="radio" name="style" value={st.value} defaultChecked={ctx.teamEventStyle === st.value} />
                    <StyleSample style={st.value} /> {st.label}
                  </label>
                ))}
                <div>
                  <button className={btnGhost}>Save team default</button>
                </div>
                <p className={`text-xs ${muted}`}>The public page can take up to 5 minutes to switch.</p>
              </form>
            )}
          </div>
        </section>

        <section id="google" className={`${card} p-5 lg:col-span-2`}>
          <h2 className="font-display text-xl font-extrabold text-[color:var(--p-text)]">Google Calendar sync</h2>
          <p className={`mt-2 max-w-3xl text-sm ${muted}`}>
            Connect your Google account to get a separate &ldquo;Platy Pirates&rdquo; calendar that updates within seconds of any change,
            with Google&apos;s own reminders (30 minutes before, popup; change it in Google under the calendar&apos;s settings).
            The portal only touches that one calendar, never your others. Edits you make to it in Google are overwritten by the portal for now;
            two-way editing is coming next.
          </p>
          {notice && (
            <p className={`mt-4 ${notice.ok ? hintBox : errorBox}`} role="status">{notice.text}</p>
          )}
          {googleMissing.length > 0 && !google ? (
            <p className={`mt-4 ${hintBox}`}>
              Google sync isn&apos;t switched on for this site yet.
              {canManage && (
                <> Missing setting{googleMissing.length > 1 ? "s" : ""} on Vercel: <code>{googleMissing.join(", ")}</code>.</>
              )}
            </p>
          ) : google ? (
            <div className="mt-4 grid gap-3 text-sm">
              <p>
                Connected as <strong>{google.google_email ?? "your Google account"}</strong>.{" "}
                {google.status === "revoked" ? (
                  <span className="text-[color:var(--p-error-text)]">Google access ended. Connect again to resume.</span>
                ) : google.last_synced_at ? (
                  <span className={muted}>
                    Last synced {DateTime.fromISO(google.last_synced_at).setZone(CAL_TZ).toFormat("LLL d 'at' h:mm a 'CT'")}
                    {google.dirty ? " (an update is queued)" : ""}.
                  </span>
                ) : (
                  <span className={muted}>First sync in progress.</span>
                )}
              </p>
              {google.last_error && google.status !== "revoked" && <p className={errorBox}>Last sync problem: {google.last_error}</p>}
              <div className="flex flex-wrap items-center gap-2">
                {google.status === "revoked" ? (
                  <a className={btnCta} href="/api/calendar/google/connect">Connect again</a>
                ) : (
                  <form action={syncGoogleNow}>
                    <button className={btnGhost}>Sync now</button>
                  </form>
                )}
                <span className={`text-xs ${muted}`}>Mode: push to Google (two-way coming soon)</span>
              </div>
              <form action={disconnectGoogle} className="mt-2 flex flex-wrap items-center gap-3 rounded border border-[color:var(--p-border)] p-3">
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="remove_calendar" defaultChecked /> Also delete the Platy Pirates calendar from my Google account
                </label>
                <button className={btnGhost}>Disconnect Google</button>
              </form>
            </div>
          ) : (
            <div className="mt-4">
              <a className={btnCta} href="/api/calendar/google/connect">Connect Google Calendar</a>
              <p className={`mt-2 text-xs ${muted}`}>
                Google may show an &ldquo;unverified app&rdquo; notice until the team&apos;s Google app is verified. It&apos;s safe to continue.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

/** A tiny example event in each style. */
function StyleSample({ style }: { style: "tint" | "solid" }) {
  const c = "#0f766e";
  return (
    <span
      aria-hidden
      className="inline-block w-24 truncate rounded-md px-1.5 py-0.5 text-[0.7rem] font-semibold"
      style={
        style === "solid"
          ? { background: c, color: "#fff" }
          : { background: `color-mix(in srgb, ${c} 16%, var(--p-surface, #fffdf8))`, borderLeft: `4px solid ${c}`, color: "var(--p-text)" }
      }
    >
      Build night
    </span>
  );
}
