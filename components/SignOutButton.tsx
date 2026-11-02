"use client";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await createClient().auth.signOut();
          router.push("/portal/login?signedout=1");
          router.refresh();
        })
      }
      className={
        className ??
        "rounded border border-[color:var(--p-accent-strong)] bg-transparent px-4 py-2 font-mono text-xs uppercase tracking-[0.14em] text-[color:var(--p-accent)] hover:bg-[color:var(--p-cta-bg)] hover:text-[color:var(--p-cta-text)] disabled:opacity-60"
      }
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
