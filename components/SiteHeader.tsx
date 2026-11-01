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

// Ignore a trailing slash so "/team" and "/team/" both count as the Crew page.
const isCurrent = (pathname: string, href: string) =>
  (pathname.replace(/\/$/, "") || "/") === (href.replace(/\/$/, "") || "/");

export default function SiteHeader() {
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
          className={`flex flex-wrap gap-1 max-[780px]:w-full max-[780px]:flex-col max-[780px]:pt-2 ${open ? "" : "max-[780px]:hidden"}`}
        >
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
        </nav>
      </Wrap>
    </header>
  );
}
