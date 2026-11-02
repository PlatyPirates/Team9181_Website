import type { ReactNode } from "react";
import PortalHeader from "@/components/PortalHeader";
import { getMember } from "@/lib/auth";
import { getPortalTheme } from "@/lib/portal-theme-server";

const SHELL =
  "portal-root min-h-[100vh] bg-[color:var(--p-bg)] bg-[radial-gradient(var(--p-grid-color)_1px,transparent_1px)] bg-[length:3px_3px] text-[color:var(--p-text)]";

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const member = await getMember();
  const theme = await getPortalTheme();
  if (!member) {
    // Signed-out visitors see the auth shells directly; those apply their own
    // .portal-root wrapper so the chosen theme still takes effect.
    return <>{children}</>;
  }
  return (
    <div data-portal-theme={theme} className={SHELL}>
      <PortalHeader member={member} theme={theme} />
      <div>{children}</div>
    </div>
  );
}
