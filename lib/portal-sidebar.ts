// Shared by the portal layout (server, reads the cookie) and PortalSidebar (client, writes it).
export const SIDEBAR_COOKIE = "portal-sidebar";
export type SidebarState = "open" | "collapsed";
