import Link from "next/link";
import type { CalendarPermission } from "@/lib/calendar/types";

const tab = (active: boolean) =>
  `rounded px-3 py-1.5 font-mono text-xs uppercase tracking-[0.14em] no-underline ${
    active
      ? "bg-[color:var(--p-cta-bg)] text-[color:var(--p-cta-text)]"
      : "text-[color:var(--p-accent)] hover:bg-[color:var(--p-surface)]"
  }`;

export type CalendarTab = "calendar" | "requests" | "settings" | "permissions" | "categories" | "groups";

/** Tabs across the top of every calendar page; admin tabs only for people with the boxes. */
export default function CalendarNav({
  active, perms, pendingCount = 0,
}: { active: CalendarTab; perms: CalendarPermission[]; pendingCount?: number }) {
  const has = (p: CalendarPermission) => perms.includes(p);
  return (
    <nav className="mt-6 flex flex-wrap gap-2 border-b border-[color:var(--p-border)] pb-3" aria-label="Calendar sections">
      <Link href="/portal/calendar" className={tab(active === "calendar")} aria-current={active === "calendar" ? "page" : undefined}>Calendar</Link>
      {has("approve_requests") && (
        <Link href="/portal/calendar/requests" className={tab(active === "requests")} aria-current={active === "requests" ? "page" : undefined}>
          Requests{pendingCount > 0 && <span className="ml-1.5 rounded-full bg-[color:var(--p-chip-bg)] px-1.5 text-[color:var(--p-chip-text)]">{pendingCount}</span>}
        </Link>
      )}
      <Link href="/portal/calendar/settings" className={tab(active === "settings")} aria-current={active === "settings" ? "page" : undefined}>Subscribe &amp; settings</Link>
      {has("manage_permissions") && (
        <Link href="/portal/calendar/admin/permissions" className={tab(active === "permissions")} aria-current={active === "permissions" ? "page" : undefined}>Permissions</Link>
      )}
      {has("manage_categories") && (
        <Link href="/portal/calendar/admin/categories" className={tab(active === "categories")} aria-current={active === "categories" ? "page" : undefined}>Categories</Link>
      )}
      {has("manage_groups") && (
        <Link href="/portal/calendar/admin/groups" className={tab(active === "groups")} aria-current={active === "groups" ? "page" : undefined}>Groups</Link>
      )}
    </nav>
  );
}
