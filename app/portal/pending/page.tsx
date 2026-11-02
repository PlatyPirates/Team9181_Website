import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PortalAuthShell, PortalAuthCard } from "@/components/PortalAuth";
import { getMember } from "@/lib/auth";
import SignOutButton from "@/components/SignOutButton";

export const metadata: Metadata = { title: "Pending approval" };

export default async function PendingPage() {
  const m = await getMember();
  if (!m) redirect("/portal/login");
  if (m.status === "active") redirect("/portal");
  return (
    <PortalAuthShell>
      <PortalAuthCard
        eyebrow="FRC 9181"
        title={`Hi, ${m.full_name || m.username}!`}
        subtitle="Your account is waiting for a Lead to approve it. You'll have access as soon as that happens — no need to sign up again."
      >
        <SignOutButton />
      </PortalAuthCard>
    </PortalAuthShell>
  );
}
