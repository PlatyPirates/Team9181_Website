"use client";

import { useState, type MouseEvent } from "react";
import Link from "next/link";
import { NAV_LINKS } from "@/lib/site-nav";

// Portal header's "Public site" link. Clicking it goes to the public home page;
// hovering (or keyboard focus) opens a list of the public pages to jump straight to.
// Hover is tracked in JS, like the public header's dropdowns, because Tailwind's
// hover: is skipped on some touchscreen laptops.

// Flatten the public nav: each top-level page, then its sub-pages indented under it
// (skipping a child that just repeats its parent's link, e.g. "Our Sponsors").
const ITEMS = NAV_LINKS.flatMap((link) => [
  { href: link.href, label: link.label, sub: false },
  ...(link.children ?? []).filter((c) => c.href !== link.href).map((c) => ({ ...c, sub: true })),
]);

export default function PortalPublicSiteMenu() {
  const [open, setOpen] = useState(false);

  const close = (e: MouseEvent<HTMLAnchorElement>) => {
    setOpen(false);
    e.currentTarget.blur(); // otherwise focus keeps the menu open after navigating
  };

  return (
    <div
      data-open={open}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      className="group relative"
    >
      <Link
        href="/"
        aria-haspopup="true"
        onClick={close}
        className="inline-flex items-center gap-1.5 rounded border border-[color:var(--p-accent-strong)] bg-transparent px-4 py-2 font-mono text-xs uppercase tracking-[0.14em] text-[color:var(--p-accent)] no-underline hover:bg-[color:var(--p-cta-bg)] hover:text-[color:var(--p-cta-text)]! group-data-[open=true]:bg-[color:var(--p-cta-bg)] group-data-[open=true]:text-[color:var(--p-cta-text)]"
      >
        Public site
        <svg
          aria-hidden="true"
          viewBox="0 0 10 6"
          className="size-2.5 transition-transform duration-300 group-data-[open=true]:rotate-180 group-focus-within:rotate-180"
        >
          <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </Link>
      {/* pt-2 bridges the gap so the menu stays open while the pointer moves down to it */}
      <div className="invisible absolute top-full left-0 z-50 pt-2 opacity-0 -translate-y-2 transition-[opacity,translate,visibility] duration-300 ease-out group-data-[open=true]:visible group-focus-within:visible group-data-[open=true]:opacity-100 group-focus-within:opacity-100 group-data-[open=true]:translate-y-0 group-focus-within:translate-y-0 motion-reduce:transition-none">
        <ul className="min-w-[200px] overflow-hidden rounded-md border border-[color:var(--p-border-strong)] border-t-[3px] border-t-[color:var(--p-accent)] bg-[color:var(--p-surface-strong)] py-1.5 shadow-[0_10px_24px_rgba(0,0,0,0.25)] backdrop-blur">
          {ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={close}
                className={`block py-2 pr-4 text-sm whitespace-nowrap text-[color:var(--p-text)] no-underline hover:bg-[color:var(--p-border)] hover:text-[color:var(--p-accent)] ${item.sub ? "pl-8 font-normal text-[color:var(--p-text-muted)]" : "pl-4 font-semibold"}`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
