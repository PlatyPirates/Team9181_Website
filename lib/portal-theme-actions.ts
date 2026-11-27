"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isPortalTheme } from "./portal-theme";

export async function setPortalTheme(theme: string): Promise<void> {
  if (!isPortalTheme(theme)) return;
  (await cookies()).set("portal-theme", theme, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  // The public site's light/dark choice (site-theme cookie) is separate and
  // left alone here, and the site toggle never writes this cookie either.
  revalidatePath("/portal", "layout");
}
