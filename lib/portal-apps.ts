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
  { key: "profile", icon: "profile", title: "Profile",
    description: "Your name, contact info, subteam, and account settings.",
    href: "/portal/profile", tag: "ME",
    color: "bg-[#e11d48] text-white" },
  { key: "calendar", icon: "calendar", title: "Team Calendar",
    description: "Meetings, build nights, outreach events, and competition weeks.",
    href: "/portal/calendar", tag: "CAL",
    color: "bg-[#6b1e2a] text-white" },
  { key: "sponsors", icon: "sponsors", title: "Grants & Sponsors",
    description: "Current sponsors, open grants, and the thank-you queue.",
    href: "/portal/sponsors", tag: "GRN",
    color: "bg-[#c9a24b] text-[#3f0f1a]" },
  { key: "inventory", icon: "inventory", title: "Inventory",
    description: "Parts bins, consumables, and what we're low on this week.",
    href: "/portal/inventory", tag: "INV",
    color: "bg-[#0f766e] text-white" },
  { key: "attendance", icon: "attendance", title: "Attendance",
    description: "Sign in to meetings and track hours toward awards.",
    href: "/portal/attendance", tag: "ATT",
    color: "bg-[#4338ca] text-white" },
  { key: "outreach", icon: "outreach", title: "Service / Outreach",
    description: "Community events, volunteer slots, and reflection notes.",
    href: "/portal/outreach", tag: "OUT",
    color: "bg-[#c2410c] text-white" },
  { key: "scouting", icon: "scouting", title: "Scouting",
    description: "Match data, pick lists, and alliance picks for competition.",
    href: "/portal/scouting", tag: "SCT",
    color: "bg-[#15803d] text-white" },
  { key: "documentation", icon: "documentation", title: "Documentation",
    description: "Engineering notebook entries, build logs, and how-tos.",
    href: "/portal/documentation", tag: "DOC",
    color: "bg-[#1e40af] text-white" },
  { key: "training", icon: "training", title: "Training",
    description: "Shop safety, software onboarding, and skill checkoffs.",
    href: "/portal/training", tag: "TRN",
    color: "bg-[#b45309] text-white" },
  { key: "tasks", icon: "tasks", title: "Tasks",
    description: "To-do lists, build assignments, and what's blocking progress.",
    href: "/portal/tasks", tag: "TSK",
    color: "bg-[#0891b2] text-white" },
  { key: "purchase", icon: "purchase", title: "Purchase",
    description: "Submit purchase requests and track orders through approval.",
    href: "/portal/purchase", tag: "BUY",
    color: "bg-[#7c3aed] text-white" },
  { key: "roster", icon: "roster", title: "Crew Roster",
    description: "Who's on the team, their roles, and how to reach them.",
    href: "/portal/roster", tag: "CRW",
    color: "bg-[#475569] text-white" },
  { key: "permissions", icon: "permissions", title: "Permissions",
    description: "What each role can see and do across the portal.",
    href: "/portal/permissions", tag: "PRM",
    color: "bg-[#881337] text-white" },
  { key: "admin", icon: "admin", title: "Admin",
    description: "Approve new members, assign roles, and reset passwords.",
    href: "/portal/admin", tag: "ADM",
    color: "bg-[#1f1210] text-white ring-2 ring-[#c9a24b]",
    roles: ["lead"] },
];

export function visibleApps(role: Role): PortalApp[] {
  return PORTAL_APPS.filter((a) => !a.roles || a.roles.includes(role));
}
