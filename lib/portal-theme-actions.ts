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
  revalidatePath("/portal", "layout");
}
