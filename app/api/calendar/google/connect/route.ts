import { NextResponse, type NextRequest } from "next/server";
import { getMember } from "@/lib/auth";
import { authUrl, googleReady } from "@/lib/calendar/google";
import { randomToken } from "@/lib/calendar/crypto";

const STATE_COOKIE = "cal_google_state";

/** Settings → Connect Google Calendar. Sends the member to Google's consent screen. */
export async function GET(req: NextRequest) {
  const settings = new URL("/portal/calendar/settings", req.nextUrl.origin);
  const member = await getMember();
  if (!member || member.status !== "active") {
    return NextResponse.redirect(new URL(`/portal/login?next=${encodeURIComponent("/portal/calendar/settings")}`, req.nextUrl.origin));
  }
  if (!googleReady()) {
    settings.searchParams.set("google", "not_configured");
    return NextResponse.redirect(settings);
  }
  // The redirect URI follows the host you're on, so preview and production
  // both work (each must be listed in the Google Cloud OAuth client).
  const redirectUri = `${req.nextUrl.origin}/api/calendar/google/oauth/callback`;
  const state = randomToken(24);
  const res = NextResponse.redirect(authUrl(state, redirectUri));
  res.cookies.set(STATE_COOKIE, `${state}.${member.id}`, {
    httpOnly: true,
    secure: req.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/api/calendar/google",
    maxAge: 600,
  });
  return res;
}
