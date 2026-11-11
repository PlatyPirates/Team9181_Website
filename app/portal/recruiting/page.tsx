import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireLead } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import { KIND_LABEL, STATUSES, STATUS_LABEL, type Inquiry, type InquiryKind, type InquiryStatus } from "@/lib/recruiting";
import { deleteInquiry, updateInquiry } from "./actions";

export const metadata: Metadata = { title: "Recruiting" };

const TABS = ["all", "student", "mentor", "sponsor", "other"] as const;
type Tab = (typeof TABS)[number];
const FILTERS = ["open", "all", ...STATUSES] as const;
type Filter = (typeof FILTERS)[number];

const btnSmall =
  "rounded border border-[color:var(--p-border-strong)] px-2 py-1 text-xs text-[color:var(--p-accent)] hover:bg-[color:var(--p-cta-bg)] hover:text-[color:var(--p-cta-text)]";
const selectCls =
  "rounded border border-[color:var(--p-border)] bg-[color:var(--p-input-bg)] px-2 py-1 text-sm text-[color:var(--p-text)]";
const chip =
  "rounded-full px-2 py-0.5 font-mono text-[0.62rem] uppercase tracking-[0.14em]";

export default async function RecruitingPage({ searchParams }: { searchParams: Promise<{ tab?: string; status?: string }> }) {
  await requireLead("/portal/recruiting");
  const sp = await searchParams;
  const tab: Tab = (TABS as readonly string[]).includes(sp.tab ?? "") ? (sp.tab as Tab) : "all";
  const filter: Filter = (FILTERS as readonly string[]).includes(sp.status ?? "") ? (sp.status as Filter) : "open";
  const href = (t: Tab, f: Filter) => `/portal/recruiting?tab=${t}&status=${f}`;

  return (
    <main className="mx-auto max-w-[1200px] px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-[color:var(--p-accent)]">LEAD</span>
          <h1 className="mt-1 font-display text-4xl font-extrabold text-[color:var(--p-text)]">Recruiting</h1>
          <p className="mt-3 max-w-2xl text-[color:var(--p-text-muted)]">
            Everyone who filled out a Join Us form, from the website or a Google Form.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/portal/profile#alerts" className={btnSmall}>My alerts</Link>
          <Link href="/portal/recruiting/settings" className={btnSmall}>Settings</Link>
        </div>
      </div>

      <nav className="mt-8 flex flex-wrap gap-2 border-b border-[color:var(--p-border)] pb-3" aria-label="Audience">
        {TABS.map((t) => (
          <Link
            key={t}
            href={href(t, filter)}
            aria-current={t === tab ? "page" : undefined}
            className={`rounded px-3 py-1.5 font-mono text-xs uppercase tracking-[0.14em] ${
              t === tab
                ? "bg-[color:var(--p-cta-bg)] text-[color:var(--p-cta-text)]"
                : "text-[color:var(--p-accent)] hover:bg-[color:var(--p-surface)]"
            }`}
          >
            {t === "all" ? "All" : KIND_LABEL[t]}
          </Link>
        ))}
      </nav>
      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={href(tab, f)}
            className={f === filter ? "font-bold text-[color:var(--p-text)] underline" : "text-[color:var(--p-text-muted)] hover:text-[color:var(--p-text)]"}
          >
            {f === "open" ? "Open (new + contacted)" : f === "all" ? "Everything" : STATUS_LABEL[f]}
          </Link>
        ))}
      </div>

      <div className="mt-6">
        <Suspense fallback={<p className="text-[color:var(--p-text-muted)]">Loading submissions…</p>}>
          <InquiryList tab={tab} filter={filter} />
        </Suspense>
      </div>
    </main>
  );
}

async function InquiryList({ tab, filter }: { tab: Tab; filter: Filter }) {
  const sb = await createClient();
  let q = sb
    .from("recruiting_inquiries")
    .select("id, kind, source, name, email, phone, organization, message, details, status, notes, submitted_at")
    .order("submitted_at", { ascending: false })
    .limit(300);
  if (tab !== "all") q = q.eq("kind", tab);
  if (filter === "open") q = q.in("status", ["new", "contacted"]);
  else if (filter !== "all") q = q.eq("status", filter);
  const { data, error } = await q;

  if (error) {
    return (
      <p className="rounded border border-[color:var(--p-error-border)] bg-[color:var(--p-error-bg)] p-4 text-sm text-[color:var(--p-error-text)]">
        Couldn&apos;t load submissions: {error.message}. If this mentions a missing table, run{" "}
        <code>supabase/migrations/0003_recruiting.sql</code> in the Supabase SQL editor.
      </p>
    );
  }
  const rows = (data ?? []) as Inquiry[];
  if (rows.length === 0) {
    return (
      <p className="rounded border border-dashed border-[color:var(--p-border-strong)] p-8 text-center text-[color:var(--p-text-muted)]">
        Nothing here yet.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {rows.map((r) => (
        <InquiryCard key={r.id} r={r} />
      ))}
    </ul>
  );
}

const STATUS_TONE: Record<InquiryStatus, string> = {
  new: "bg-[color:var(--p-chip-bg)] text-[color:var(--p-chip-text)]",
  contacted: "bg-sky-700 text-white",
  accepted: "bg-emerald-700 text-white",
  declined: "bg-stone-500 text-white",
  archived: "bg-stone-400 text-white",
};

function InquiryCard({ r }: { r: Inquiry }) {
  const when = new Date(r.submitted_at).toLocaleString("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const details = Object.entries(r.details ?? {}).filter(([, v]) => String(v ?? "").trim());
  return (
    <li
      id={`inq-${r.id}`}
      className="portal-surface scroll-mt-24 rounded-xl border border-[color:var(--p-border)] bg-[color:var(--p-surface)] p-5 target:ring-2 target:ring-[color:var(--p-accent)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-extrabold text-[color:var(--p-text)]">{r.name || r.email || "No name given"}</h3>
          <div className="mt-0.5 font-mono text-[0.68rem] uppercase tracking-[0.12em] text-[color:var(--p-text-faint)]">
            {when} · {r.source === "google" ? "Google Form" : "Website"}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className={`${chip} border border-[color:var(--p-border-strong)] text-[color:var(--p-accent)]`}>{KIND_LABEL[r.kind as InquiryKind]}</span>
          <span className={`${chip} ${STATUS_TONE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
        </div>
      </div>

      <dl className="mt-3 space-y-1 text-sm text-[color:var(--p-text-muted)]">
        {r.email && (
          <div>
            <dt className="inline font-semibold text-[color:var(--p-text)]">Email: </dt>
            <dd className="inline"><a href={`mailto:${r.email}`} className="text-[color:var(--p-accent)] underline">{r.email}</a></dd>
          </div>
        )}
        {r.phone && (
          <div>
            <dt className="inline font-semibold text-[color:var(--p-text)]">Phone: </dt>
            <dd className="inline"><a href={`tel:${r.phone}`} className="text-[color:var(--p-accent)] underline">{r.phone}</a></dd>
          </div>
        )}
        {r.organization && (
          <div>
            <dt className="inline font-semibold text-[color:var(--p-text)]">{r.kind === "student" ? "School" : "Organization"}: </dt>
            <dd className="inline">{r.organization}</dd>
          </div>
        )}
      </dl>
      {r.message && <p className="mt-3 whitespace-pre-line text-sm text-[color:var(--p-text)]">{r.message}</p>}

      {details.length > 0 && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-mono text-xs uppercase tracking-[0.14em] text-[color:var(--p-accent)]">All answers</summary>
          <dl className="mt-2 space-y-2">
            {details.map(([q, a]) => (
              <div key={q}>
                <dt className="font-semibold text-[color:var(--p-text)]">{q}</dt>
                <dd className="whitespace-pre-line text-[color:var(--p-text-muted)]">{String(a)}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}

      <form action={updateInquiry} className="mt-4 flex flex-col gap-2 border-t border-[color:var(--p-border)] pt-3">
        <input type="hidden" name="id" value={r.id} />
        <textarea
          name="notes"
          defaultValue={r.notes ?? ""}
          placeholder="Notes for the other Leads (who reached out, next steps…)"
          className={`${selectCls} min-h-[60px] resize-y`}
        />
        <div className="flex flex-wrap items-center gap-2">
          <select name="status" defaultValue={r.status} className={selectCls} aria-label="Status">
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
          <button className={btnSmall}>Save</button>
        </div>
      </form>
      {(r.status === "declined" || r.status === "archived") && (
        <form action={deleteInquiry} className="mt-2 text-right">
          <input type="hidden" name="id" value={r.id} />
          <button className="text-xs text-[color:var(--p-text-faint)] underline hover:text-[color:var(--p-error-text)]">Delete permanently</button>
        </form>
      )}
    </li>
  );
}
