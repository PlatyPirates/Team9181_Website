"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { asset } from "@/lib/asset";
import { Wrap } from "@/components/ui";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/team", label: "Crew" },
  { href: "/robots", label: "Robots & Log" },
  { href: "/sponsors", label: "Sponsors" },
  { href: "/resources", label: "Resources" },
  { href: "/social", label: "Connect" },
  { href: "/join", label: "Join Us" },
];

const isCurrent = (pathname: string, href: string) =>
  (pathname.replace(/\/$/, "") || "/") === (href.replace(/\/$/, "") || "/");

export default function SiteHeaderClient({
  account,
}: {
  account: { name: string; href: string } | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b-4 border-gold bg-maroon-deep">
      <Wrap className="flex flex-wrap items-center justify-between gap-4 py-3">
        <Link href="/" className="flex items-center gap-3 text-cream no-underline hover:text-cream">
          <img src={asset("/mascot.svg")} alt="" className="block size-[42px]" />
          <span className="flex flex-col leading-[1.1]">
            <strong className="font-display text-[1.25rem] font-extrabold text-cream">Platy Pirates</strong>
            <span className="font-mono text-[0.72rem] tracking-[0.12em] text-gold-light">FRC TEAM No. 9181</span>
          </span>
        </Link>

        <button
          className="hidden rounded border-2 border-gold bg-transparent px-2.5 py-1.5 text-base text-cream max-[780px]:inline-block"
          aria-expanded={open}
          aria-controls="primary-nav"
          onClick={() => setOpen((o) => !o)}
        >
          ☰ Menu
        </button>

        <nav
          id="primary-nav"
          aria-label="Primary"
          className={`flex flex-1 flex-wrap items-center justify-end gap-1 max-[780px]:w-full max-[780px]:flex-col max-[780px]:items-stretch max-[780px]:justify-start max-[780px]:pt-2 ${open ? "" : "max-[780px]:hidden"}`}
        >
          <div className="flex flex-wrap gap-1 max-[780px]:flex-col">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                aria-current={isCurrent(pathname, href) ? "page" : undefined}
                onClick={() => setOpen(false)}
                className="rounded px-3 py-2 text-[0.92rem] font-semibold text-parchment no-underline hover:bg-gold/18 hover:text-gold-light aria-[current=page]:bg-gold/18 aria-[current=page]:text-gold-light aria-[current=page]:shadow-[inset_0_-3px_0_var(--color-gold)]"
              >
                {label}
              </Link>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2 max-[780px]:ml-0 max-[780px]:mt-2">
            {account ? (
              <Link
                href={account.href}
                onClick={() => setOpen(false)}
                aria-label={`Signed in as ${account.name} — open portal`}
                className="flex items-center gap-2 rounded border border-gold/60 bg-gold/15 px-3 py-1.5 text-[0.9rem] font-semibold text-cream no-underline hover:border-gold hover:bg-gold/25 hover:text-cream"
              >
                <span
                  aria-hidden
                  className="flex size-7 items-center justify-center rounded-full bg-gold font-mono text-xs font-bold text-maroon-deep"
                >
                  {account.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-gold-light">Signed in</span>
                  <span className="text-sm">{account.name}</span>
                </span>
              </Link>
            ) : (
              <Link
                href="/portal/login"
                onClick={() => setOpen(false)}
                className="rounded border border-gold bg-transparent px-3 py-2 text-[0.9rem] font-semibold text-gold-light no-underline hover:bg-gold hover:text-maroon-deep"
              >
                Sign In
              </Link>
            )}
          </div>
        </nav>
      </Wrap>
    </header>
  );
}
