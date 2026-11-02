import type { Metadata } from "next";
import { requireMember, roleLabel } from "@/lib/auth";
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
