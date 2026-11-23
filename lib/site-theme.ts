// Public-site light/dark theme. Plain constants — importable from client and server.
//
// Until a visitor picks one, the site follows their device's light/dark
// setting (prefers-color-scheme), live. Once they pick, the choice lives in a
// `site-theme` cookie (no server read needed: an inline
// script in app/layout.tsx applies it to <html data-theme> before first paint,
// so the prerendered pages never flash the wrong colors). The member portal's
// own `portal-theme` cookie is kept in step: dark here ⇄ dark in the portal.

export type SiteTheme = "light" | "dark";
export const SITE_THEME_COOKIE = "site-theme";
export const PORTAL_THEME_COOKIE = "portal-theme";

const YEAR = 60 * 60 * 24 * 365;

/** Runs in <head> before the body renders. Keep it tiny and dependency-free. */
export const SITE_THEME_SCRIPT = `(function(){try{
var m=document.cookie.match(/(?:^|; )site-theme=(light|dark)/);
var t=m?m[1]:(/(?:^|; )portal-theme=dark/.test(document.cookie)||matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");
document.documentElement.dataset.theme=t;
}catch(e){}})();`;

/** Client-only: true once the visitor has picked a theme themselves. */
export function hasSavedSiteTheme(): boolean {
  return /(?:^|; )site-theme=(light|dark)/.test(document.cookie);
}

/** Client-only: the theme to show, worked out the same way as SITE_THEME_SCRIPT. */
export function readSiteTheme(): SiteTheme {
  const m = document.cookie.match(/(?:^|; )site-theme=(light|dark)/);
  if (m) return m[1] as SiteTheme;
  if (/(?:^|; )portal-theme=dark/.test(document.cookie)) return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=${YEAR}; samesite=lax`;
}

/** Client-only: switch the site theme now and remember it (also syncs the portal theme). */
export function applySiteTheme(theme: SiteTheme) {
  const root = document.documentElement;
  // Fade colors for a moment so the switch doesn't snap.
  root.classList.add("theme-fade");
  root.dataset.theme = theme;
  window.setTimeout(() => root.classList.remove("theme-fade"), 400);

  setCookie(SITE_THEME_COOKIE, theme);
  const portal = document.cookie.match(/(?:^|; )portal-theme=(\w+)/)?.[1];
  if (theme === "dark") setCookie(PORTAL_THEME_COOKIE, "dark");
  else if (portal === "dark") setCookie(PORTAL_THEME_COOKIE, "parchment"); // leave "heritage" alone
}
