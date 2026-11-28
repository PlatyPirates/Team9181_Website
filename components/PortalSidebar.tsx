"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import PortalIcon, { type IconName } from "./PortalIcon";
import { SIDEBAR_COOKIE, type SidebarState } from "@/lib/portal-sidebar";

export interface SidebarApp {
  key: string;
  title: string;
  href: string;
  icon: IconName;
  color: string;
  soon?: boolean;
}

// Pages that aren't inside an app: no side panel there.
const NO_PANEL = new Set(["/portal", "/portal/pending"]);

const inApp = (pathname: string, href: string) => pathname === href || pathname.startsWith(href + "/");

/**
 * App switcher on the left of every portal app page.
 * Wider screens: a panel that collapses to an icon rail; the choice is kept in a cookie
 * so the server renders it the same way next time (no flash).
 * Phones: hidden behind an "Apps" button and opens as a drawer, always closed to start.
 */
export default function PortalSidebar({ apps, initial }: { apps: SidebarApp[]; initial: SidebarState }) {
  const pathname = usePathname().replace(/\/+$/, "") || "/";
  const [collapsed, setCollapsed] = useState(initial === "collapsed");
  const [drawer, setDrawer] = useState(false);

  // Close the phone drawer after navigating.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setDrawer(false);
  }

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer]);

  if (NO_PANEL.has(pathname) || !pathname.startsWith("/portal/")) return null;
  const current = apps.find((a) => inApp(pathname, a.href))?.key;

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "open"}; path=/; max-age=31536000; samesite=lax`;
  };

  const list = (rail: boolean) => (
    <ul className="space-y-1">
      {apps.map((a) => {
        const on = a.key === current;
        return (
          <li key={a.key}>
            <Link
              href={a.href}
              title={rail ? a.title : undefined}
              aria-current={on ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg p-1.5 no-underline transition-colors ${
                on
                  ? "bg-[color:var(--p-hint-bg)] shadow-[inset_3px_0_0_var(--p-accent)] text-[color:var(--p-text)]!"
                  : "text-[color:var(--p-text-muted)]! hover:bg-[color:var(--p-hint-bg)] hover:text-[color:var(--p-text)]!"
              } ${rail ? "justify-center" : ""}`}
            >
              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-md ${a.color} ${a.soon && !on ? "opacity-60" : ""}`}
              >
                <PortalIcon name={a.icon} className="size-[18px]" />
              </span>
              {!rail && (
                <span className={`min-w-0 flex-1 truncate text-sm ${on ? "font-bold" : "font-medium"}`}>{a.title}</span>
              )}
              {!rail && a.soon && (
                <span className="font-mono text-[0.55rem] uppercase tracking-[0.12em] text-[color:var(--p-text-faint)]">soon</span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      {/* Wider screens: docked panel */}
      <aside
        aria-label="Apps"
        className={`sticky top-[61px] hidden max-h-[calc(100dvh-61px)] shrink-0 self-start overflow-y-auto border-r border-[color:var(--p-border)] bg-[color:var(--p-surface-strong)] px-2 py-3 transition-[width] duration-200 md:block motion-reduce:transition-none ${
          collapsed ? "w-[60px]" : "w-60"
        }`}
      >
        <div className={`mb-2 flex items-center ${collapsed ? "justify-center" : "justify-between pl-2"}`}>
          {!collapsed && (
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[color:var(--p-accent)]">Apps</span>
          )}
          <button
            type="button"
            onClick={toggle}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand apps panel" : "Collapse apps panel"}
            title={collapsed ? "Expand" : "Collapse"}
            className="flex size-8 cursor-pointer items-center justify-center rounded-md text-[color:var(--p-text-muted)] hover:bg-[color:var(--p-hint-bg)] hover:text-[color:var(--p-text)]"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className={`size-4 transition-transform ${collapsed ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
        </div>
        {list(collapsed)}
      </aside>

      {/* Phones: button + slide-out drawer */}
      <button
        type="button"
        onClick={() => setDrawer(true)}
        aria-label="Open apps list"
        aria-expanded={drawer}
        className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full border border-[color:var(--p-accent-strong)] bg-[color:var(--p-cta-bg)] px-4 py-2.5 font-mono text-xs uppercase tracking-[0.14em] text-[color:var(--p-cta-text)] shadow-[0_6px_18px_rgba(0,0,0,0.3)] md:hidden"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="currentColor">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
        Apps
      </button>
      <div className={`fixed inset-0 z-50 md:hidden ${drawer ? "" : "pointer-events-none"}`} aria-hidden={!drawer}>
        <div
          onClick={() => setDrawer(false)}
          className={`absolute inset-0 bg-black/45 transition-opacity duration-200 ${drawer ? "opacity-100" : "opacity-0"}`}
        />
        <aside
          aria-label="Apps"
          className={`absolute inset-y-0 left-0 w-64 max-w-[80vw] overflow-y-auto border-r border-[color:var(--p-border-strong)] bg-[color:var(--p-bg)] px-2 py-3 shadow-[8px_0_24px_rgba(0,0,0,0.3)] transition-transform duration-200 motion-reduce:transition-none ${
            drawer ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="mb-2 flex items-center justify-between pl-2">
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[color:var(--p-accent)]">Apps</span>
            <button
              type="button"
              onClick={() => setDrawer(false)}
              aria-label="Close apps list"
              tabIndex={drawer ? 0 : -1}
              className="flex size-8 items-center justify-center rounded-md text-lg text-[color:var(--p-text-muted)] hover:bg-[color:var(--p-hint-bg)]"
            >
              ×
            </button>
          </div>
          {list(false)}
        </aside>
      </div>
    </>
  );
}
