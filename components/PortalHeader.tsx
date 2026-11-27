import Link from "next/link";
import { asset } from "@/lib/asset";
import { roleLabel, type Member } from "@/lib/auth";
import type { PortalTheme } from "@/lib/portal-theme";
import SignOutButton from "./SignOutButton";
import PortalThemeToggle from "./PortalThemeToggle";
import PortalPublicSiteMenu from "./PortalPublicSiteMenu";

export default function PortalHeader({ member, theme }: { member: Member; theme: PortalTheme }) {
  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--p-border-strong)] bg-[color:var(--p-surface-strong)] backdrop-blur">
      {/* Three columns: the centered content stays lined up with the page, and the
          theme switch sits in the window's far-right corner. */}
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1200px)_1fr] items-center">
      <div aria-hidden />
      <div className="flex min-w-0 items-center justify-between gap-4 px-6 py-3">
        <div className="flex min-w-0 items-center gap-6">
          <Link href="/portal" className="flex items-center gap-3 text-[color:var(--p-text)] no-underline hover:text-[color:var(--p-text)]">
            <img src={asset("/mascot.svg")} alt="" className="block size-9" />
            <span className="flex flex-col leading-tight">
              <strong className="font-display text-lg font-extrabold">Platy Pirates</strong>
              <span className="font-mono text-[0.65rem] tracking-[0.14em] text-[color:var(--p-accent)]">
                MEMBER PORTAL · FRC 9181
              </span>
            </span>
          </Link>
          <PortalPublicSiteMenu />
        </div>
        <nav className="flex items-center gap-5">
          <Link href="/portal" className="rounded border border-[color:var(--p-accent-strong)] bg-transparent px-4 py-2 font-mono text-xs uppercase tracking-[0.14em] text-[color:var(--p-accent)] no-underline hover:bg-[color:var(--p-cta-bg)] hover:text-[color:var(--p-cta-text)]!">
            Apps
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="font-body text-sm font-semibold">{member.full_name || member.username}</div>
              <div className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[color:var(--p-accent)]">
                {roleLabel(member)}
              </div>
            </div>
            <SignOutButton />
          </div>
        </nav>
      </div>
      <div className="flex justify-end pr-4 sm:pr-6">
        <PortalThemeToggle current={theme} />
      </div>
      </div>
    </header>
  );
}
