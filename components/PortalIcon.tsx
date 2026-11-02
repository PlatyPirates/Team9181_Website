import type React from "react";
import type { SVGProps } from "react";

export type IconName = "calendar" | "sponsors" | "inventory" | "attendance" | "outreach" | "roster" | "admin";

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Calendar(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <rect x="3" y="4.5" width="18" height="16.5" rx="2" />
      <path d="M3 9h18" />
      <path d="M8 3v3" />
      <path d="M16 3v3" />
      <circle cx="8" cy="14" r="1" />
      <circle cx="12" cy="14" r="1" />
      <circle cx="16" cy="14" r="1" />
    </svg>
  );
}

function Sponsors(p: SVGProps<SVGSVGElement>) {
  // Trophy / award
  return (
    <svg {...base} {...p}>
      <path d="M7 4h10v3a5 5 0 0 1-10 0V4z" />
      <path d="M7 6H4a2 2 0 0 0 0 4h3" />
      <path d="M17 6h3a2 2 0 0 1 0 4h-3" />
      <path d="M9 15h6l-.5 3h-5L9 15z" />
      <path d="M8 20h8" />
    </svg>
  );
}

function Inventory(p: SVGProps<SVGSVGElement>) {
  // Box / crate
  return (
    <svg {...base} {...p}>
      <path d="M3 7.5 12 3l9 4.5v9L12 21 3 16.5v-9z" />
      <path d="M3 7.5 12 12l9-4.5" />
      <path d="M12 12v9" />
      <path d="M7.5 5.25 16.5 9.75" />
    </svg>
  );
}

function Attendance(p: SVGProps<SVGSVGElement>) {
  // Clipboard with checkmark
  return (
    <svg {...base} {...p}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 3h6v3H9z" />
      <path d="m9 13 2.2 2.2L15.5 11" />
    </svg>
  );
}

function Outreach(p: SVGProps<SVGSVGElement>) {
  // Hand-heart
  return (
    <svg {...base} {...p}>
      <path d="M12 20s-6-3.5-6-9a3.5 3.5 0 0 1 6-2.45A3.5 3.5 0 0 1 18 11c0 5.5-6 9-6 9z" />
      <path d="m8 14-3 3 1.5 1.5" opacity=".7" />
    </svg>
  );
}

function Roster(p: SVGProps<SVGSVGElement>) {
  // Three users
  return (
    <svg {...base} {...p}>
      <circle cx="9" cy="9" r="3" />
      <circle cx="17" cy="10" r="2.2" />
      <path d="M3 20c0-3 3-5 6-5s6 2 6 5" />
      <path d="M15 20c0-2 1.5-3.5 4-3.5s4 1.5 4 3.5" opacity=".9" />
    </svg>
  );
}

function Admin(p: SVGProps<SVGSVGElement>) {
  // Shield / lock
  return (
    <svg {...base} {...p}>
      <path d="M12 3 4 6v6c0 4.5 3 7.5 8 9 5-1.5 8-4.5 8-9V6l-8-3z" />
      <path d="M10.5 12.5 12 14l2.5-2.5" />
    </svg>
  );
}

const MAP: Record<IconName, (p: SVGProps<SVGSVGElement>) => React.ReactElement> = {
  calendar: Calendar,
  sponsors: Sponsors,
  inventory: Inventory,
  attendance: Attendance,
  outreach: Outreach,
  roster: Roster,
  admin: Admin,
};

export default function PortalIcon({ name, className }: { name: IconName; className?: string }) {
  const Cmp = MAP[name];
  return <Cmp className={className} aria-hidden focusable="false" />;
}
