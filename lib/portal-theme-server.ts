import { cookies } from "next/headers";
import { DEFAULT_PORTAL_THEME, isPortalTheme, type PortalTheme } from "./portal-theme";

const COOKIE = "portal-theme";

export async function getPortalTheme(): Promise<PortalTheme> {
  const v = (await cookies()).get(COOKIE)?.value;
  return v && isPortalTheme(v) ? v : DEFAULT_PORTAL_THEME;
}
