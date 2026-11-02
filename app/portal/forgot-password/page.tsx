import type { Metadata } from "next";
import { PortalAuthShell, PortalAuthCard } from "@/components/PortalAuth";
import ForgotForm from "./ForgotForm";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPage() {
  return (
    <PortalAuthShell>
      <PortalAuthCard eyebrow="FRC 9181" title="Reset password" subtitle="We'll email you a link to pick a new one.">
        <ForgotForm />
      </PortalAuthCard>
    </PortalAuthShell>
  );
}
