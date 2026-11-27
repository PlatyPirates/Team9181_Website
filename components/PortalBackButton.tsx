"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Pages with nothing to go back to.
const NO_BACK = new Set(["/portal", "/portal/pending"]);
// Folders that have no page of their own; skip past them when going up.
const NO_PAGE = new Set(["/portal/calendar/admin"]);

/** One level up the portal: /portal/calendar/settings → /portal/calendar → /portal. */
function parentOf(path: string): string {
  let p = path.replace(/\/+$/, "");
  do {
    p = p.slice(0, p.lastIndexOf("/")) || "/portal";
  } while (NO_PAGE.has(p));
  return p.startsWith("/portal") ? p : "/portal";
}

/** "← Back" in the top-left corner of every portal page (styled like the calendar's New event button, but bigger). */
export default function PortalBackButton() {
  const pathname = usePathname().replace(/\/+$/, "") || "/";
  if (NO_BACK.has(pathname) || !pathname.startsWith("/portal/")) return null;
  const href = parentOf(pathname);
  return (
    <div className="mx-auto max-w-[1700px] px-4 pt-6 sm:px-6">
      <Link
        href={href}
        aria-label={href === "/portal" ? "Back to the portal home" : "Back"}
        className="inline-flex items-center gap-2 rounded-lg border-2 border-[color:var(--p-cta-bg)] bg-[color:var(--p-cta-bg)] px-5 py-2.5 text-base font-bold text-[color:var(--p-cta-text)] no-underline shadow-[0_4px_14px_rgba(0,0,0,0.18)] transition hover:-translate-x-0.5 hover:bg-[color:var(--p-cta-hover-bg)] hover:text-[color:var(--p-cta-text)]"
      >
        <span aria-hidden className="text-lg leading-none">←</span>
        Back
      </Link>
    </div>
  );
}
