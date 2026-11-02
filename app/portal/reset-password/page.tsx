import type { Metadata } from "next";
import { PortalAuthShell, PortalAuthCard } from "@/components/PortalAuth";
import ResetForm from "./ResetForm";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPage() {
  return (
    <PortalAuthShell>
      <PortalAuthCard eyebrow="FRC 9181" title="Choose a new password">
        <ResetForm />
      </PortalAuthCard>
    </PortalAuthShell>
  );
}
