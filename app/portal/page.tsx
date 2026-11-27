import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireMember, roleLabel, type Member } from "@/lib/auth";
import { myMissingFields } from "@/lib/profile-server";
import { visibleApps } from "@/lib/portal-apps";
import PortalTile from "@/components/PortalTile";

export const metadata: Metadata = { title: "Portal" };

export default async function PortalDashboard() {
  const m = await requireMember("/portal");
  const apps = visibleApps(m.role);
  return (
    <main className="mx-auto max-w-[1200px] px-6 py-10">
      <div className="mb-10">
        <span className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-[color:var(--p-accent)]">
          {roleLabel(m)}
        </span>
        <h1 className="mt-1 font-display text-4xl font-extrabold text-[color:var(--p-text)]">
          Welcome back, {m.full_name?.split(" ")[0] || m.username}!
        </h1>
        <p className="mt-2 max-w-xl text-[color:var(--p-text-muted)]">
          Pick an app to pick up where you left off.
        </p>
      </div>
      <Suspense fallback={null}>
        <ProfileNudge me={m} />
      </Suspense>
      <div className="mb-4 flex items-center gap-3">
        <span className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-[color:var(--p-accent)]">Your apps</span>
        <span className="h-px flex-1 bg-[color:var(--p-border)]" />
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {apps.map((app) => (
          <PortalTile key={app.key} app={app} />
        ))}
      </div>
    </main>
  );
}

async function ProfileNudge({ me }: { me: Member }) {
  const r = await myMissingFields(me);
  if (!r || r.missing.length === 0) return null;
  const pct = r.total ? Math.round(((r.total - r.missing.length) / r.total) * 100) : 100;
  return (
    <Link
      href="/portal/profile"
      className="portal-surface mb-8 flex flex-wrap items-center gap-4 rounded-xl border border-[color:var(--p-border)] border-l-4 border-l-[color:var(--p-accent-strong)] bg-[color:var(--p-surface)] p-4 text-[color:var(--p-text)] no-underline hover:border-[color:var(--p-accent)]"
    >
      <div className="min-w-0 flex-1">
        <div className="font-semibold">Finish your profile ({pct}% done)</div>
        <div className="text-sm text-[color:var(--p-text-muted)]">
          Still needed: {r.missing.slice(0, 4).join(", ")}
          {r.missing.length > 4 ? ` and ${r.missing.length - 4} more` : ""}.
        </div>
      </div>
      <span className="font-mono text-xs uppercase tracking-[0.14em] text-[color:var(--p-accent)]">Open profile →</span>
    </Link>
  );
}
