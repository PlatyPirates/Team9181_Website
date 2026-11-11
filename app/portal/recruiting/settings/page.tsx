import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { requireLead } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import { KIND_LABEL, KINDS, type Kind, type RecruitingSource } from "@/lib/recruiting";
import { buildAppsScript } from "@/lib/recruiting-script";
import { regenerateSecret } from "../actions";
import SourcesForm from "./SourcesForm";
import CopyBlock from "./CopyBlock";

export const metadata: Metadata = { title: "Recruiting settings" };

const btnSmall =
  "rounded border border-[color:var(--p-border-strong)] px-2 py-1 text-xs text-[color:var(--p-accent)] hover:bg-[color:var(--p-cta-bg)] hover:text-[color:var(--p-cta-text)]";
const h2 = "mb-3 font-display text-2xl font-extrabold text-[color:var(--p-text)]";

export default async function RecruitingSettingsPage() {
  await requireLead("/portal/recruiting/settings");
  const sb = await createClient();
  const [{ data: srcRows, error: srcErr }, { data: secretRow }] = await Promise.all([
    sb.from("recruiting_sources").select("kind, mode, google_form_url, google_sheet_url"),
    sb.from("recruiting_secret").select("secret").eq("id", 1).maybeSingle(),
  ]);

  if (srcErr) {
    return (
      <main className="mx-auto max-w-[1000px] px-6 py-10">
        <h1 className="font-display text-4xl font-extrabold text-[color:var(--p-text)]">Recruiting settings</h1>
        <p className="mt-6 rounded border border-[color:var(--p-error-border)] bg-[color:var(--p-error-bg)] p-4 text-sm text-[color:var(--p-error-text)]">
          {srcErr.message}. Run <code>supabase/migrations/0003_recruiting.sql</code> in the Supabase SQL editor, then reload.
        </p>
      </main>
    );
  }

  const sources = Object.fromEntries(
    KINDS.map((k) => [k, (srcRows as RecruitingSource[]).find((r) => r.kind === k) ?? { kind: k, mode: "native", google_form_url: null, google_sheet_url: null }]),
  ) as Record<Kind, RecruitingSource>;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "www.team9181.org";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("192.168.") ? "http" : "https");
  const endpoint = `${proto}://${host}/api/recruiting/intake`;
  const secret = (secretRow?.secret as string | undefined) ?? "";
  const googleKinds = KINDS.filter((k) => sources[k].mode === "google" || sources[k].google_form_url);

  return (
    <main className="mx-auto max-w-[1000px] px-6 py-10">
      <Link href="/portal/recruiting" className="font-mono text-xs uppercase tracking-[0.14em] text-[color:var(--p-accent)]">
        ← Recruiting
      </Link>
      <h1 className="mt-2 font-display text-4xl font-extrabold text-[color:var(--p-text)]">Recruiting settings</h1>
      <p className="mt-3 max-w-2xl text-[color:var(--p-text-muted)]">
        Choose where each Join Us tile sends people. Either way, every submission shows up in the Recruiting app and
        triggers the email and phone alerts Leads turned on in <Link className="underline" href="/portal/profile#alerts">their Profile</Link>.
      </p>

      <section className="mt-8">
        <h2 className={h2}>Which form each tile uses</h2>
        <SourcesForm sources={sources} />
      </section>

      <section className="mt-12">
        <h2 className={h2}>Connect a Google Form (one-time setup)</h2>
        <ol className="max-w-3xl list-decimal space-y-2 pl-5 text-[color:var(--p-text)]">
          <li>Open your Google Form, go to the <b>Responses</b> tab, and click <b>Link to Sheets</b> (skip if it already has one). Open that Sheet.</li>
          <li>In the Sheet, click <b>Extensions → Apps Script</b>. Delete anything in the editor.</li>
          <li>Press <b>Copy script</b> below for the right audience and paste it in. Click the save icon.</li>
          <li>In the function menu at the top, pick <b>setup</b> and press <b>Run</b>. Google will ask you to approve access: choose your account, then <b>Advanced → Go to project → Allow</b>.</li>
          <li>Done. Submit a test response to the form and it should show up in Recruiting within a few seconds. To copy older responses, pick <b>importExistingResponses</b> and press Run (no alerts are sent for those).</li>
        </ol>
        <p className="mt-3 max-w-3xl text-sm text-[color:var(--p-text-muted)]">
          One form for everyone? Use the <b>auto</b> script and the portal will sort each response by its answers. The
          script points at <code>{endpoint}</code>, so copy it from the live site (not a preview) for the real form.
        </p>

        <div className="mt-6 space-y-6">
          {[...(googleKinds.length ? googleKinds : KINDS), "auto" as const].map((k) => (
            <div key={k}>
              <h3 className="mb-2 font-display text-lg font-extrabold text-[color:var(--p-text)]">
                {k === "auto" ? "One form for all audiences (auto)" : `${KIND_LABEL[k]} form`}
              </h3>
              <CopyBlock text={buildAppsScript({ endpoint, secret, kind: k })} />
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-[color:var(--p-text-muted)]">
          <span>Script key leaked, or a Lead left the team?</span>
          <form action={regenerateSecret}>
            <button className={btnSmall}>Make a new key</button>
          </form>
          <span>Old scripts stop working until you paste the new one.</span>
        </div>
      </section>

      {KINDS.some((k) => sources[k].google_sheet_url) && (
        <section className="mt-12">
          <h2 className={h2}>Response Sheets</h2>
          <ul className="flex flex-wrap gap-3">
            {KINDS.filter((k) => sources[k].google_sheet_url).map((k) => (
              <li key={k}>
                <a href={sources[k].google_sheet_url!} target="_blank" rel="noopener" className={btnSmall}>
                  {KIND_LABEL[k]} sheet ↗
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
