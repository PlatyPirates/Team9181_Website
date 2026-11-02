import Link from "next/link";
import { asset } from "@/lib/asset";
import { roleLabel, type Member } from "@/lib/auth";
import type { PortalTheme } from "@/lib/portal-theme";
import SignOutButton from "./SignOutButton";
import PortalThemeToggle from "./PortalThemeToggle";

export default function PortalHeader({ member, theme }: { member: Member; theme: PortalTheme }) {
  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--p-border-strong)] bg-[color:var(--p-surface-strong)] backdrop-blur">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-6 py-3">
        <Link href="/portal" className="flex items-center gap-3 text-[color:var(--p-text)] no-underline hover:text-[color:var(--p-text)]">
          <img src={asset("/mascot.svg")} alt="" className="block size-9" />
          <span className="flex flex-col leading-tight">
            <strong className="font-display text-lg font-extrabold">Platy Pirates</strong>
            <span className="font-mono text-[0.65rem] tracking-[0.14em] text-[color:var(--p-accent)]">
              MEMBER PORTAL · FRC 9181
            </span>
          </span>
        </Link>
        <nav className="flex items-center gap-5">
          <Link href="/portal" className="font-mono text-xs uppercase tracking-[0.14em] hover:text-[color:var(--p-accent)]">
            Home
          </Link>
          <Link
            href="/"
            className="hidden font-mono text-xs uppercase tracking-[0.14em] text-[color:var(--p-text-muted)] hover:text-[color:var(--p-accent)] sm:inline"
          >
            Public site
          </Link>
          <PortalThemeToggle current={theme} />
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
    </header>
  );
}
