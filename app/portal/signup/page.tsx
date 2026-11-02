import type { Metadata } from "next";
import Link from "next/link";
import { PortalAuthShell, PortalAuthCard } from "@/components/PortalAuth";
import SignupForm from "./SignupForm";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <PortalAuthShell>
      <PortalAuthCard
        eyebrow="FRC 9181 · Member Portal"
        title="Create your account"
        subtitle="New accounts wait for a Lead to approve them before anything unlocks."
      >
        <SignupForm />
        <p className="mt-5 text-sm text-[color:var(--p-text-muted)]">
          Already have an account? <Link href="/portal/login" className="text-[color:var(--p-accent)] hover:underline">Sign in</Link>.
        </p>
      </PortalAuthCard>
    </PortalAuthShell>
  );
}
