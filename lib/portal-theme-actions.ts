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
  // Keep the public site's light/dark toggle in step (see lib/site-theme.ts).
  (await cookies()).set("site-theme", theme === "dark" ? "dark" : "light", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/portal", "layout");
}
