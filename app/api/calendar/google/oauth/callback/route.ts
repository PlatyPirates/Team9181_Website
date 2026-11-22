import { NextResponse, after, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getMember } from "@/lib/auth";
import { createAdminClient } from "@/utils/supabase/admin";
import { encrypt, decrypt } from "@/lib/calendar/crypto";
import {
  calendarExists, createTeamCalendar, exchangeCode, googleReady, revokeToken,
} from "@/lib/calendar/google";
import { syncDirtyLinks } from "@/lib/calendar/google-sync";

export const maxDuration = 60;

const STATE_COOKIE = "cal_google_state";

function same(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Google sends the member back here after they allow (or deny) access. */
export async function GET(req: NextRequest) {
  const back = (status: string) => {
    const u = new URL("/portal/calendar/settings", req.nextUrl.origin);
    u.searchParams.set("google", status);
    const res = NextResponse.redirect(u);
    res.cookies.set(STATE_COOKIE, "", { path: "/api/calendar/google", maxAge: 0 });
    return res;
  };

  const member = await getMember();
  if (!member || member.status !== "active") return back("signed_out");
  if (!googleReady()) return back("not_configured");

  const q = req.nextUrl.searchParams;
  const cookie = req.cookies.get(STATE_COOKIE)?.value ?? "";
  const [state, uid] = cookie.split(".");
  if (!state || uid !== member.id || !same(state, q.get("state") ?? "")) return back("expired");
  if (q.get("error")) return back("denied");
  const code = q.get("code");
  if (!code) return back("denied");

  const admin = createAdminClient();
  try {
    const redirectUri = `${req.nextUrl.origin}/api/calendar/google/oauth/callback`;
    const t = await exchangeCode(code, redirectUri);
    if (!t.hasCalendarScope) {
      if (t.refreshToken) await revokeToken(t.refreshToken);
      return back("scope");
    }
    if (!t.refreshToken) return back("no_refresh");

    // Reconnecting the same Google account keeps the same calendar.
    const { data: old } = await admin
      .from("google_calendar_links")
      .select("google_email, google_calendar_id, refresh_token_enc")
      .eq("user_id", member.id)
      .maybeSingle();
    let calId: string | null = null;
    if (old?.google_calendar_id && old.google_email && old.google_email === t.email) {
      calId = (await calendarExists(t.accessToken, old.google_calendar_id as string)) ? (old.google_calendar_id as string) : null;
    }
    if (old && !calId) {
      // Different account (or the calendar is gone): forget the old mapping.
      await admin.from("google_event_map").delete().eq("user_id", member.id);
      const oldToken = old.refresh_token_enc ? decrypt(old.refresh_token_enc as string) : null;
      if (oldToken && old.google_email !== t.email) after(() => revokeToken(oldToken));
    }
    if (!calId) calId = await createTeamCalendar(t.accessToken);

    const now = new Date().toISOString();
    const { error } = await admin.from("google_calendar_links").upsert({
      user_id: member.id,
      google_email: t.email,
      refresh_token_enc: encrypt(t.refreshToken),
      google_calendar_id: calId,
      mode: "push",
      status: "active",
      last_error: null,
      dirty: true,
      updated_at: now,
    });
    if (error) throw new Error(error.message);

    // Google sends reminders now, so switch the email/ntfy fallback off.
    await admin.from("notification_prefs").upsert({ user_id: member.id, cal_reminders: false, updated_at: now }, { onConflict: "user_id" });

    after(() => syncDirtyLinks(50_000).then(() => undefined));
    return back("connected");
  } catch (e) {
    console.error("[calendar] Google connect failed", e);
    return back("failed");
  }
}
