import Link from "next/link";
import type { PortalApp } from "@/lib/portal-apps";
import PortalIcon from "./PortalIcon";

export default function PortalTile({ app }: { app: PortalApp }) {
  return (
    <Link
      href={app.href}
      className="portal-surface group flex flex-col overflow-hidden rounded-xl border border-[color:var(--p-border)] bg-[color:var(--p-surface)] shadow-[0_8px_24px_rgba(0,0,0,0.15)] transition hover:-translate-y-0.5 hover:border-[color:var(--p-border-strong)] hover:shadow-[0_14px_30px_rgba(0,0,0,0.25)]"
    >
      <div className={`flex h-20 items-center justify-between gap-3 px-5 ${app.color}`}>
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white/18 backdrop-blur-sm transition group-hover:bg-white/28">
          <PortalIcon name={app.icon} className="size-6" />
        </div>
        <span className="font-mono text-[0.72rem] uppercase tracking-[0.18em] opacity-90">{app.tag}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="font-display text-xl font-extrabold text-[color:var(--p-text)]">{app.title}</h3>
        <p className="flex-1 text-sm text-[color:var(--p-text-muted)]">{app.description}</p>
        <span className="font-mono text-xs uppercase tracking-[0.14em] text-[color:var(--p-accent)] group-hover:text-[color:var(--p-accent-strong)]">
          Open {app.title} →
        </span>
      </div>
    </Link>
  );
}
