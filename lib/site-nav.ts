// The public site's page list. Used by the public header (SiteHeaderShell) and by the
// portal header's "Public site" dropdown, so both stay in step.

export type NavLink = { href: string; label: string; children?: { href: string; label: string }[] };

// Add `children` to give a link a dropdown: it opens on hover (or keyboard focus) on
// desktop, and the sub-links are listed under it in the phone menu.
export const NAV_LINKS: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/team", label: "Crew" },
  // { href: "/robots", label: "Robots & Log" },
  {
    href: "/sponsors",
    label: "Sponsors",
    children: [
      { href: "/sponsors", label: "Our Sponsors" },
      { href: "/sponsors/levels", label: "Sponsor Levels" },
    ],
  },
  // { href: "/resources", label: "Resources" },
  { href: "/calendar", label: "Calendar" },
  { href: "/social", label: "Connect" },
  { href: "/join", label: "Join Us" },
];
