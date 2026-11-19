"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { asset } from "@/lib/asset";
import { Wrap } from "@/components/ui";

type NavLink = { href: string; label: string; children?: { href: string; label: string }[] };

// Add `children` to give a link a dropdown: it opens on hover (or keyboard focus) on
// desktop, and the sub-links are listed under it in the phone menu.
const NAV_LINKS: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/team", label: "Crew" },
  { href: "/robots", label: "Robots & Log" },
  {
    href: "/sponsors",
    label: "Sponsors",
    children: [
      { href: "/sponsors", label: "Our Sponsors" },
      { href: "/sponsors/levels", label: "Sponsor Levels" },
    ],
  },
  // { href: "/resources", label: "Resources" },
  { href: "/social", label: "Connect" },
  { href: "/join", label: "Join Us" },
];

const isCurrent = (pathname: string, href: string) =>
  (pathname.replace(/\/$/, "") || "/") === (href.replace(/\/$/, "") || "/");

// A dropdown parent counts as current when you're on any of its pages.
const isSectionCurrent = (pathname: string, link: NavLink) =>
  isCurrent(pathname, link.href) || !!link.children?.some((c) => isCurrent(pathname, c.href));

const linkClass =
  "rounded px-3 py-2 text-[0.92rem] font-semibold text-parchment no-underline hover:bg-gold/18 hover:text-gold-light aria-[current=page]:bg-gold/18 aria-[current=page]:text-gold-light aria-[current=page]:shadow-[inset_0_-3px_0_var(--color-gold)]";

export default function SiteHeaderShell({ account }: { account: ReactNode }) {
  const [open, setOpen] = useState(false);
  // Which dropdown the mouse is over. Tracked in JS rather than CSS :hover, because
  // Tailwind's hover: only applies on devices that report a hover-capable pointer, which
  // some touchscreen laptops don't, even with a mouse plugged in.
  const [hovered, setHovered] = useState<string | null>(null);
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
            {NAV_LINKS.map((link) => {
              const current = isSectionCurrent(pathname, link);
              if (!link.children) {
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={current ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={linkClass}
                  >
                    {link.label}
                  </Link>
                );
              }
              return (
                <div
                  key={link.href}
                  data-open={hovered === link.href}
                  onMouseEnter={() => setHovered(link.href)}
                  onMouseLeave={() => setHovered(null)}
                  className="group relative max-[780px]:flex max-[780px]:flex-col"
                >
                  <Link
                    href={link.href}
                    aria-current={current ? "page" : undefined}
                    aria-haspopup="true"
                    onClick={() => setOpen(false)}
                    className={`${linkClass} inline-flex items-center gap-1.5`}
                  >
                    {link.label}
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 10 6"
                      className="size-2.5 transition-transform duration-350 group-data-[open=true]:rotate-180 group-focus-within:rotate-180 max-[780px]:hidden"
                    >
                      <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </Link>
                  {/* pt-2 bridges the gap so the menu stays open while the pointer moves down to it */}
                  <div className="invisible absolute top-full left-0 z-50 pt-2 opacity-0 -translate-y-2 transition-[opacity,translate,visibility] duration-350 ease-out group-data-[open=true]:visible group-focus-within:visible group-data-[open=true]:opacity-100 group-focus-within:opacity-100 group-data-[open=true]:translate-y-0 group-focus-within:translate-y-0 max-[780px]:visible max-[780px]:static max-[780px]:translate-y-0 max-[780px]:pt-0 max-[780px]:opacity-100 motion-reduce:transition-none">
                    <ul className="origin-top scale-y-[0.6] transition-[scale] duration-380 ease-[cubic-bezier(0.34,1.5,0.5,1)] group-data-[open=true]:scale-y-100 group-focus-within:scale-y-100 max-[780px]:scale-y-100 motion-reduce:transition-none min-w-[200px] overflow-hidden rounded-md border border-gold/40 border-t-[3px] border-t-gold bg-maroon-deep py-1.5 shadow-[0_10px_24px_rgba(0,0,0,0.3)] max-[780px]:min-w-0 max-[780px]:border-0 max-[780px]:bg-transparent max-[780px]:py-0 max-[780px]:pl-4 max-[780px]:shadow-none">
                      {link.children.map((child, i) => (
                        <li
                          key={child.href}
                          // Links slide in one after another as the menu unfolds.
                          style={{ transitionDelay: hovered === link.href ? `${100 + i * 70}ms` : "0ms" }}
                          className="-translate-x-3 opacity-0 transition-[opacity,translate] duration-260 ease-out group-data-[open=true]:translate-x-0 group-focus-within:translate-x-0 group-data-[open=true]:opacity-100 group-focus-within:opacity-100 max-[780px]:translate-x-0 max-[780px]:opacity-100 motion-reduce:transition-none"
                        >
                          <Link
                            href={child.href}
                            aria-current={isCurrent(pathname, child.href) ? "page" : undefined}
                            onClick={(e) => {
                              setOpen(false);
                              setHovered(null);
                              e.currentTarget.blur(); // otherwise focus keeps the menu open after navigating
                            }}
                            className="block px-4 py-2 text-[0.9rem] font-semibold whitespace-nowrap text-parchment no-underline hover:bg-gold/18 hover:text-gold-light aria-[current=page]:text-gold-light max-[780px]:rounded max-[780px]:px-3 max-[780px]:font-normal"
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="ml-auto flex items-center gap-2 max-[780px]:ml-0 max-[780px]:mt-2">
            {account}
          </div>
        </nav>
      </Wrap>
    </header>
  );
}
