import type { Metadata } from "next";
import { requireMember } from "@/lib/auth";

export const metadata: Metadata = { title: "Team Calendar" };

export default async function Page() {
  await requireMember("/portal/calendar");
  return (
    <main className="mx-auto max-w-[1200px] px-6 py-10">
      <span className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-[color:var(--p-accent)]">COMING SOON</span>
      <h1 className="mt-1 font-display text-4xl font-extrabold text-[color:var(--p-text)]">Team Calendar</h1>
      <p className="mt-3 max-w-xl text-[color:var(--p-text-muted)]">
        Meetings, build nights, outreach events, and competition weeks will live here.
      </p>
      <a href="/portal" className="mt-6 inline-block font-mono text-xs uppercase tracking-[0.14em] text-[color:var(--p-accent)] hover:text-[color:var(--p-accent-strong)]">
        ← Back to portal
      </a>
    </main>
  );
}
