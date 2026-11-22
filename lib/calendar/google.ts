import "server-only";
import { CAL_TZ } from "./types";
import { hasExplicitKey } from "./crypto";

// Thin Google OAuth + Calendar API client (plain fetch, no googleapis
// dependency). Scope: calendar.app.created, which only lets us manage the
// one "Platy Pirates" calendar we create in each member's account.

export const GOOGLE_SCOPES = ["openid", "email", "https://www.googleapis.com/auth/calendar.app.created"];
const CAL_SCOPE = GOOGLE_SCOPES[2];
const API = "https://www.googleapis.com/calendar/v3";

export const CALENDAR_NAME = "Platy Pirates";
export const DEFAULT_REMINDER_MINUTES = 30;

export function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
  return { clientId, clientSecret };
}

/** What's missing before members can connect (empty = ready). */
export function googleSetupMissing(): string[] {
  const { clientId, clientSecret } = googleConfig();
  const missing: string[] = [];
  if (!clientId) missing.push("GOOGLE_CLIENT_ID");
  if (!clientSecret) missing.push("GOOGLE_CLIENT_SECRET");
  if (!hasExplicitKey()) missing.push("CALENDAR_ENC_KEY");
  return missing;
}

export const googleReady = () => googleSetupMissing().length === 0;

export class GoogleError extends Error {
  constructor(message: string, public status: number, public reason?: string) {
    super(message);
  }
  /** The member revoked access or the refresh token expired: they must reconnect. */
  get needsReconnect() {
    return this.reason === "invalid_grant" || this.status === 401;
  }
}

export function authUrl(state: string, redirectUri: string): string {
  const q = new URLSearchParams({
    client_id: googleConfig().clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
}

async function tokenCall(params: Record<string, string>): Promise<TokenResponse> {
  const { clientId, clientSecret } = googleConfig();
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, ...params }),
    cache: "no-store",
  });
  const body = (await r.json().catch(() => ({}))) as TokenResponse;
  if (!r.ok || body.error) {
    throw new GoogleError(body.error_description || body.error || `Google token error ${r.status}`, r.status, body.error);
  }
  return body;
}

export interface ExchangedTokens {
  refreshToken: string | null;
  accessToken: string;
  email: string | null;
  hasCalendarScope: boolean;
}

export async function exchangeCode(code: string, redirectUri: string): Promise<ExchangedTokens> {
  const t = await tokenCall({ code, redirect_uri: redirectUri, grant_type: "authorization_code" });
  let email: string | null = null;
  if (t.id_token) {
    // Straight from Google's token endpoint over TLS, so the payload can be
    // read without checking the signature (OIDC Core 3.1.3.7).
    try {
      const payload = JSON.parse(Buffer.from(t.id_token.split(".")[1], "base64url").toString("utf8"));
      if (typeof payload.email === "string") email = payload.email;
    } catch {
      email = null;
    }
  }
  return {
    refreshToken: t.refresh_token ?? null,
    accessToken: t.access_token,
    email,
    hasCalendarScope: (t.scope ?? "").split(" ").includes(CAL_SCOPE),
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const t = await tokenCall({ refresh_token: refreshToken, grant_type: "refresh_token" });
  return t.access_token;
}

export async function revokeToken(token: string): Promise<void> {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  }).catch(() => undefined);
}

/** One Calendar API call, with a single retry on rate limits / 5xx. */
export async function gcal<T = Record<string, unknown>>(
  accessToken: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<{ status: number; data: T | null }> {
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const retryable = r.status === 429 || r.status >= 500 || (r.status === 403 && (await peekRateLimit(r)));
    if (retryable && attempt < 2) {
      await new Promise((res) => setTimeout(res, 800 * (attempt + 1) + Math.random() * 400));
      continue;
    }
    const text = r.status === 204 ? "" : await r.text();
    let data: T | null = null;
    try {
      data = text ? (JSON.parse(text) as T) : null;
    } catch {
      data = null;
    }
    if (r.ok || r.status === 404 || r.status === 409 || r.status === 410) return { status: r.status, data };
    const err = (data as { error?: { message?: string; errors?: { reason?: string }[] } } | null)?.error;
    throw new GoogleError(err?.message || `Google Calendar error ${r.status}`, r.status, err?.errors?.[0]?.reason);
  }
}

async function peekRateLimit(r: Response): Promise<boolean> {
  try {
    const t = await r.clone().text();
    return /rateLimitExceeded|userRateLimitExceeded/.test(t);
  } catch {
    return false;
  }
}

/** Create the member's "Platy Pirates" calendar and give it a default 30-minute popup. */
export async function createTeamCalendar(accessToken: string): Promise<string> {
  const { data } = await gcal<{ id: string }>(accessToken, "POST", "/calendars", {
    summary: CALENDAR_NAME,
    description: "Team events from the Platy Pirates (FRC 9181) portal. Edits here are overwritten by the portal.",
    timeZone: CAL_TZ,
  });
  if (!data?.id) throw new GoogleError("Google didn't return the new calendar.", 500);
  try {
    await gcal(accessToken, "PATCH", `/users/me/calendarList/${encodeURIComponent(data.id)}`, {
      defaultReminders: [{ method: "popup", minutes: DEFAULT_REMINDER_MINUTES }],
    });
  } catch (e) {
    // Not fatal: members can still set notifications on the calendar in Google.
    console.warn("[calendar] couldn't set default reminders", e);
  }
  return data.id;
}

/** True if the calendar still exists in their account. */
export async function calendarExists(accessToken: string, calendarId: string): Promise<boolean> {
  const { status } = await gcal(accessToken, "GET", `/calendars/${encodeURIComponent(calendarId)}`);
  return status === 200;
}

export async function deleteTeamCalendar(accessToken: string, calendarId: string): Promise<void> {
  await gcal(accessToken, "DELETE", `/calendars/${encodeURIComponent(calendarId)}`);
}
