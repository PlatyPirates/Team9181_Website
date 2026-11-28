import type { ReactNode } from "react";
import PortalHeader from "@/components/PortalHeader";
import PortalBackButton from "@/components/PortalBackButton";
import { getMember } from "@/lib/auth";
import { getPortalTheme } from "@/lib/portal-theme-server";
import { cookies } from "next/headers";
import PortalSidebar from "@/components/PortalSidebar";
import { visibleApps } from "@/lib/portal-apps";
import { SIDEBAR_COOKIE } from "@/lib/portal-sidebar";

// Portal reads cookies + DB on every render; skip the Next 16
// cacheComponents prerender for the whole /portal subtree.
export const instant = false;

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
  // App switcher on the left of app pages; remembers if it was collapsed.
  const sidebar = (await cookies()).get(SIDEBAR_COOKIE)?.value === "collapsed" ? "collapsed" : "open";
  const apps = visibleApps(member.role).map(({ key, title, href, icon, color, soon }) => ({ key, title, href, icon, color, soon }));
  return (
    <div data-portal-theme={theme} className={SHELL}>
      <PortalHeader member={member} theme={theme} />
      <div className="flex">
        {member.status === "active" && <PortalSidebar apps={apps} initial={sidebar} />}
        <div className="min-w-0 flex-1">
          <PortalBackButton />
          {children}
        </div>
      </div>
    </div>
  );
}
