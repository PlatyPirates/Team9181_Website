import Link from "next/link";
import { asset } from "@/lib/asset";
import { roleLabel, type Member } from "@/lib/auth";
import type { PortalTheme } from "@/lib/portal-theme";
import SignOutButton from "./SignOutButton";
import PortalThemeToggle from "./PortalThemeToggle";
import PortalPublicSiteMenu from "./PortalPublicSiteMenu";

// Outlined pill shared by Apps / Public site / Sign out. The text color carries
// `!` so the site-wide dark-theme `a:hover` rule can't repaint it.
export const PORTAL_NAV_BUTTON =
  "rounded border border-[color:var(--p-accent-strong)] bg-transparent px-4 py-2 font-mono text-xs uppercase tracking-[0.14em] text-[color:var(--p-accent)] no-underline hover:bg-[color:var(--p-cta-bg)] hover:text-[color:var(--p-cta-text)]!";

// Same pill, sized down to share one row three-across on phones.
const MOBILE_BUTTON =
  "flex items-center justify-center rounded border border-[color:var(--p-accent-strong)] bg-transparent px-1 py-2 text-center font-mono text-[0.68rem] uppercase tracking-[0.08em] whitespace-nowrap text-[color:var(--p-accent)] no-underline hover:bg-[color:var(--p-cta-bg)] hover:text-[color:var(--p-cta-text)]! disabled:opacity-60";

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/portal" className="flex min-w-0 items-center gap-3 text-[color:var(--p-text)] no-underline hover:text-[color:var(--p-text)]!">
      <img src={asset("/platypus_9181.svg")} alt="" className={`block shrink-0 ${compact ? "size-8" : "size-9"}`} />
      <span className="flex min-w-0 flex-col leading-tight">
        <strong className={`font-display font-extrabold ${compact ? "text-base" : "text-lg"}`}>Platy Pirates</strong>
        <span className={`truncate font-mono tracking-[0.14em] text-[color:var(--p-accent)] ${compact ? "text-[0.58rem]" : "text-[0.65rem]"}`}>
          MEMBER PORTAL · FRC 9181
        </span>
      </span>
    </Link>
  );
}

export default function PortalHeader({ member, theme }: { member: Member; theme: PortalTheme }) {
  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--p-border-strong)] bg-[color:var(--p-surface-strong)] backdrop-blur">
      {/* Phones: two rows. Logo + theme switch on top, then the three buttons
          side by side underneath. */}
      <div className="px-4 py-2.5 md:hidden">
        <div className="flex items-center justify-between gap-3">
          <Brand compact />
          <PortalThemeToggle current={theme} />
        </div>
        <nav className="mt-2.5 grid grid-cols-3 gap-2">
          <Link href="/" className={MOBILE_BUTTON}>Public site</Link>
          <Link href="/portal" className={MOBILE_BUTTON}>Apps</Link>
          <SignOutButton className={MOBILE_BUTTON} />
        </nav>
      </div>

      {/* Wider screens: three columns. The centered content stays lined up with the
          page, and the theme switch sits in the window's far-right corner. */}
      <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1200px)_1fr] items-center md:grid">
        <div aria-hidden />
        <div className="flex min-w-0 items-center justify-between gap-4 px-6 py-3">
          <div className="flex min-w-0 items-center gap-6">
            <Brand />
            <PortalPublicSiteMenu />
          </div>
          <nav className="flex items-center gap-5">
            <Link href="/portal" className={PORTAL_NAV_BUTTON}>
              Apps
            </Link>
            <div className="flex items-center gap-3">
              <div className="hidden text-right lg:block">
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
