import Link from "next/link";
import type { PortalApp } from "@/lib/portal-apps";
import PortalIcon from "./PortalIcon";

export default function PortalTile({ app }: { app: PortalApp }) {
  return (
    <Link
      href={app.href}
      className="portal-surface group flex flex-col overflow-hidden rounded-xl border border-[color:var(--p-border)] bg-[color:var(--p-surface)] shadow-[0_8px_24px_rgba(0,0,0,0.15)] transition hover:-translate-y-0.5 hover:border-[color:var(--p-border-strong)] hover:shadow-[0_14px_30px_rgba(0,0,0,0.25)]"
    >
      <div className={`flex h-14 items-center justify-between gap-2 px-3 sm:h-20 sm:gap-3 sm:px-5 ${app.color}`}>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg sm:size-11 bg-white/18 backdrop-blur-sm transition group-hover:bg-white/28">
          <PortalIcon name={app.icon} className="size-5 sm:size-6" />
        </div>
        <span className="truncate font-mono text-[0.58rem] uppercase tracking-[0.12em] opacity-90 sm:text-[0.72rem] sm:tracking-[0.18em]">{app.tag}</span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:gap-2 sm:p-5">
        <h3 className="font-display text-base leading-tight font-extrabold sm:text-xl text-[color:var(--p-text)]">{app.title}</h3>
        <p className="line-clamp-3 flex-1 text-xs text-[color:var(--p-text-muted)] sm:line-clamp-none sm:text-sm">{app.description}</p>
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.1em] text-[color:var(--p-accent)] sm:text-xs sm:tracking-[0.14em] group-hover:text-[color:var(--p-accent-strong)]">
          {app.soon ? (
            <>Coming soon<span className="hidden sm:inline"> · Leads only</span></>
          ) : (
            <>Open<span className="hidden sm:inline"> {app.title}</span> →</>
          )}
        </span>
      </div>
    </Link>
  );
}
