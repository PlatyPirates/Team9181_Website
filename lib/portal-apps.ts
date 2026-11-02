import type { Role } from "@/lib/auth";
import type { IconName } from "@/components/PortalIcon";

export interface PortalApp {
  key: string;
  title: string;
  description: string;
  href: string;
  tag: string;
  icon: IconName;
  color: string;
  roles?: Role[];
}

export const PORTAL_APPS: PortalApp[] = [
  { key: "calendar", icon: "calendar", title: "Team Calendar",
    description: "Meetings, build nights, outreach events, and competition weeks.",
    href: "/portal/calendar", tag: "CAL", color: "bg-[#6b1e2a]" },
  { key: "sponsors", icon: "sponsors", title: "Grants & Sponsors",
    description: "Current sponsors, open grants, and the thank-you queue.",
    href: "/portal/sponsors", tag: "GRN", color: "bg-[#c9a24b] text-[#3f0f1a]" },
  { key: "inventory", icon: "inventory", title: "Inventory",
    description: "Parts bins, consumables, and what we're low on this week.",
    href: "/portal/inventory", tag: "INV", color: "bg-[#3f0f1a]" },
  { key: "attendance", icon: "attendance", title: "Attendance",
    description: "Sign in to meetings and track hours toward awards.",
    href: "/portal/attendance", tag: "ATT", color: "bg-[#8a2c3b]" },
  { key: "outreach", icon: "outreach", title: "Service / Outreach",
    description: "Community events, volunteer slots, and reflection notes.",
    href: "/portal/outreach", tag: "OUT", color: "bg-[#e0c377] text-[#3f0f1a]" },
  { key: "roster", icon: "roster", title: "Crew Roster",
    description: "Who's on the team, their roles, and how to reach them.",
    href: "/portal/roster", tag: "CRW", color: "bg-[#8c8478]" },
  { key: "admin", icon: "admin", title: "Admin",
    description: "Approve new members, assign roles, and reset passwords.",
    href: "/portal/admin", tag: "ADM", color: "bg-[#3f0f1a] ring-2 ring-[#c9a24b]", roles: ["lead"] },
];

export function visibleApps(role: Role): PortalApp[] {
  return PORTAL_APPS.filter((a) => !a.roles || a.roles.includes(role));
}
