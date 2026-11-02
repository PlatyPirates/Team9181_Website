import type { Metadata } from "next";
import Link from "next/link";
import { PortalAuthShell, PortalAuthCard } from "@/components/PortalAuth";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; signedout?: string }>;
}) {
  const { next, signedout } = await searchParams;
  return (
    <PortalAuthShell>
      <PortalAuthCard eyebrow="FRC 9181 · Member Portal" title="Sign in" subtitle="Use your username or email.">
        {signedout ? (
          <p className="mb-4 rounded border border-[color:var(--p-hint-border)] bg-[color:var(--p-hint-bg)] px-3 py-2 text-sm text-[color:var(--p-text)]">
            You&apos;re signed out.
          </p>
        ) : null}
        <LoginForm next={next ?? "/portal"} />
        <div className="mt-5 flex justify-between text-sm text-[color:var(--p-text-muted)]">
          <Link href="/portal/forgot-password" className="hover:text-[color:var(--p-accent)]">Forgot password?</Link>
          <Link
            href={`/portal/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="hover:text-[color:var(--p-accent)]"
          >
            Create account
          </Link>
        </div>
      </PortalAuthCard>
    </PortalAuthShell>
  );
}
