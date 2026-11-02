import { getMember } from "@/lib/auth";
import SiteHeaderClient from "./SiteHeaderClient";

export default async function SiteHeader() {
  const member = await getMember();
  const account = member
    ? { name: member.full_name?.split(" ")[0] || member.username, href: member.status === "active" ? "/portal" : "/portal/pending" }
    : null;
  return <SiteHeaderClient account={account} />;
}
