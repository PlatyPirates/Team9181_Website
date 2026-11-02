// Plain shared types/constants — importable from client and server.
// Server-only actions live in lib/portal-theme-actions.ts ("use server").

const VALID = ["parchment", "heritage", "dark"] as const;
export type PortalTheme = (typeof VALID)[number];
export const PORTAL_THEMES: readonly PortalTheme[] = VALID;
export const DEFAULT_PORTAL_THEME: PortalTheme = "parchment";

export function isPortalTheme(v: string): v is PortalTheme {
  return (VALID as readonly string[]).includes(v);
}
