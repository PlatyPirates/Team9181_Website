import "server-only";
import { createAdminClient } from "@/utils/supabase/admin";
import { KIND_SINGULAR, type InquiryKind, type SourceMode } from "@/lib/recruiting";

export interface NewInquiry {
  kind: InquiryKind;
  source: SourceMode;
  externalId?: string | null;
  name: string;
  email: string;
  phone?: string | null;
  organization?: string | null;
  message?: string | null;
  details: Record<string, string>;
  submittedAt?: string | null;
}

export type RecordResult =
  | { ok: true; id: string; duplicate: boolean; inquiry: NewInquiry }
  | { ok: false; error: string };

/** Save one submission. Every source (native form, Google Apps Script) goes through here. */
export async function recordInquiry(input: NewInquiry): Promise<RecordResult> {
  const admin = createAdminClient();

  if (input.externalId) {
    const { data: existing } = await admin
      .from("recruiting_inquiries")
      .select("id")
      .eq("external_id", input.externalId)
      .maybeSingle();
    if (existing) return { ok: true, id: existing.id as string, duplicate: true, inquiry: input };
  }

  const submitted = input.submittedAt ? new Date(input.submittedAt) : null;
  const { data, error } = await admin
    .from("recruiting_inquiries")
    .insert({
      kind: input.kind,
      source: input.source,
      external_id: input.externalId || null,
      name: input.name.slice(0, 200),
      email: input.email.slice(0, 320),
      phone: input.phone?.slice(0, 50) || null,
      organization: input.organization?.slice(0, 200) || null,
      message: input.message?.slice(0, 5000) || null,
      details: input.details,
      submitted_at: submitted && !isNaN(submitted.getTime()) ? submitted.toISOString() : new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Insert failed" };
  return { ok: true, id: data.id as string, duplicate: false, inquiry: input };
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.team9181.org").replace(/\/$/, "");
}

interface Recipient {
  email: string;
  full_name: string;
  email_alerts: boolean;
  ntfy_enabled: boolean;
  ntfy_topic: string | null;
  kinds: string[];
}

async function recipientsFor(kind: InquiryKind): Promise<Recipient[]> {
  const admin = createAdminClient();
  const { data: leads } = await admin
    .from("profiles")
    .select("id, email, full_name")
    .eq("role", "lead")
    .eq("status", "active");
  if (!leads?.length) return [];
  const { data: prefs } = await admin
    .from("notification_prefs")
    .select("user_id, email_alerts, ntfy_enabled, ntfy_topic, kinds")
    .in("user_id", leads.map((l) => l.id));
  const byId = new Map((prefs ?? []).map((p) => [p.user_id as string, p]));
  return leads
    .map((l) => {
      const p = byId.get(l.id as string);
      return {
        email: l.email as string,
        full_name: l.full_name as string,
        // Leads who never opened their alert settings still get email.
        email_alerts: p ? Boolean(p.email_alerts) : true,
        ntfy_enabled: p ? Boolean(p.ntfy_enabled) : false,
        ntfy_topic: (p?.ntfy_topic as string | null) ?? null,
        kinds: (p?.kinds as string[] | undefined) ?? ["student", "mentor", "sponsor"],
      };
    })
    .filter((r) => kind === "other" || r.kinds.includes(kind));
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Email (Resend) + phone push (ntfy) to every Lead who opted in. Never throws. */
export async function notifyNewInquiry(id: string, inq: NewInquiry) {
  try {
    const recipients = await recipientsFor(inq.kind);
    const who = inq.name || inq.email || "Someone";
    const what = KIND_SINGULAR[inq.kind];
    const title = `New ${what} inquiry: ${who}`;
    const link = `${siteUrl()}/portal/recruiting?tab=${inq.kind === "other" ? "all" : inq.kind}#inq-${id}`;
    const summary = [
      inq.email && `Email: ${inq.email}`,
      inq.phone && `Phone: ${inq.phone}`,
      inq.organization && `Org/school: ${inq.organization}`,
      inq.message && `\n${inq.message.slice(0, 400)}`,
    ]
      .filter(Boolean)
      .join("\n");

    const jobs: Promise<unknown>[] = [];

    const emailTo = recipients.filter((r) => r.email_alerts && r.email).map((r) => r.email);
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey && emailTo.length) {
      const rows = Object.entries(inq.details)
        .filter(([, v]) => String(v ?? "").trim())
        .map(([q, a]) => `<tr><td style="padding:4px 12px 4px 0;vertical-align:top;color:#6b1e2a"><b>${esc(q)}</b></td><td style="padding:4px 0">${esc(String(a)).replace(/\n/g, "<br>")}</td></tr>`)
        .join("");
      jobs.push(
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: process.env.RECRUITING_FROM_EMAIL || "Platy Pirates <onboarding@resend.dev>",
            to: emailTo,
            reply_to: inq.email || undefined,
            subject: title,
            html: `<div style="font-family:system-ui,sans-serif">
              <h2 style="margin:0 0 8px">${esc(title)}</h2>
              <p style="margin:0 0 16px;color:#555">Via ${inq.source === "google" ? "Google Form" : "the website"}. Reply to this email to answer them directly.</p>
              <table style="border-collapse:collapse">${rows}</table>
              <p style="margin-top:20px"><a href="${esc(link)}">Open in the Recruiting app →</a></p>
            </div>`,
          }),
        }).then(async (r) => {
          if (!r.ok) console.error("[recruiting] Resend failed", r.status, await r.text());
        }),
      );
    }

    const ntfyServer = (process.env.NTFY_SERVER || "https://ntfy.sh").replace(/\/$/, "");
    const topics = [...new Set(recipients.filter((r) => r.ntfy_enabled && r.ntfy_topic).map((r) => r.ntfy_topic!))];
    for (const topic of topics) {
      jobs.push(
        fetch(ntfyServer, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, title, message: summary || title, click: link, tags: ["pirate_flag"] }),
        }).then((r) => {
          if (!r.ok) console.error("[recruiting] ntfy failed", r.status);
        }),
      );
    }

    await Promise.allSettled(jobs);
  } catch (e) {
    console.error("[recruiting] notify failed", e);
  }
}

/** Send one test push so a Lead can confirm their phone is set up. */
export async function sendTestPush(topic: string) {
  const ntfyServer = (process.env.NTFY_SERVER || "https://ntfy.sh").replace(/\/$/, "");
  const r = await fetch(ntfyServer, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      topic,
      title: "Platy Pirates test alert",
      message: "Phone alerts are working. New Join Us submissions will show up here.",
      click: `${siteUrl()}/portal/recruiting`,
      tags: ["pirate_flag"],
    }),
  });
  return r.ok;
}
