import type { Metadata } from "next";
import { requireMember } from "@/lib/auth";

export const metadata: Metadata = { title: "Training" };

export default async function Page() {
  await requireMember("/portal/training");
  return (
    <main className="mx-auto max-w-[1200px] px-6 py-10">
      <span className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-[color:var(--p-accent)]">COMING SOON</span>
      <h1 className="mt-1 font-display text-4xl font-extrabold text-[color:var(--p-text)]">Training</h1>
      <p className="mt-3 max-w-xl text-[color:var(--p-text-muted)]">Shop safety, software onboarding, and skill checkoffs will live here.</p>
      <a href="/portal" className="mt-6 inline-block font-mono text-xs uppercase tracking-[0.14em] text-[color:var(--p-accent)] hover:text-[color:var(--p-accent-strong)]">
        ← Back to portal
      </a>
    </main>
  );
}
