import type { ReactNode } from "react";
import Link from "next/link";
import { asset } from "@/lib/asset";
import { getPortalTheme } from "@/lib/portal-theme-server";

const SHELL =
  "portal-root min-h-[100vh] bg-[color:var(--p-bg)] bg-[radial-gradient(var(--p-grid-color)_1px,transparent_1px)] bg-[length:3px_3px] text-[color:var(--p-text)]";

/** Dark, centered shell for sign-in / sign-up / recovery pages. */
export async function PortalAuthShell({ children }: { children: ReactNode }) {
  const theme = await getPortalTheme();
  return (
    <div data-portal-theme={theme} className={SHELL}>
      <div className="mx-auto flex max-w-[1120px] items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3 text-[color:var(--p-text)] no-underline hover:text-[color:var(--p-text)]">
          <img src={asset("/mascot.svg")} alt="" className="block size-9" />
          <span className="flex flex-col leading-tight">
            <strong className="font-display text-lg font-extrabold">Platy Pirates</strong>
            <span className="font-mono text-[0.65rem] tracking-[0.14em] text-[color:var(--p-accent)]">
              FRC TEAM No. 9181
            </span>
          </span>
        </Link>
        <Link
          href="/"
          className="font-mono text-xs uppercase tracking-[0.14em] text-[color:var(--p-text-muted)] hover:text-[color:var(--p-accent)]"
        >
          ← Back to site
        </Link>
      </div>
      <div className="mx-auto flex max-w-md flex-col items-stretch px-6 pt-8 pb-16">
        {children}
      </div>
    </div>
  );
}

export function PortalAuthCard({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="portal-surface rounded-xl border border-[color:var(--p-border)] bg-[color:var(--p-surface)] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
      <span className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-[color:var(--p-accent)]">{eyebrow}</span>
      <h1 className="mt-2 mb-1 font-display text-3xl font-extrabold text-[color:var(--p-text)]">{title}</h1>
      {subtitle ? <p className="mb-5 text-[color:var(--p-text-muted)]">{subtitle}</p> : null}
      {children}
    </div>
  );
}
