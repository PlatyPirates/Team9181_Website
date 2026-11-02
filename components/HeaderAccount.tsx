import Link from "next/link";
import { getMember } from "@/lib/auth";

export function HeaderAccountFallback() {
  // Signed-out look. Prerendered; replaced on hydration if the user is in fact signed in.
  return (
    <Link
      href="/portal/login"
      className="rounded border border-gold bg-transparent px-3 py-2 text-[0.9rem] font-semibold text-gold-light no-underline hover:bg-gold hover:text-maroon-deep"
    >
      Sign In
    </Link>
  );
}

export default async function HeaderAccount() {
  const member = await getMember();
  if (!member) return <HeaderAccountFallback />;
  const name = member.full_name?.split(" ")[0] || member.username;
  const href = member.status === "active" ? "/portal" : "/portal/pending";
  return (
    <Link
      href={href}
      aria-label={`Signed in as ${name} — open portal`}
      className="flex items-center gap-2 rounded border border-gold/60 bg-gold/15 px-3 py-1.5 text-[0.9rem] font-semibold text-cream no-underline hover:border-gold hover:bg-gold/25 hover:text-cream"
    >
      <span
        aria-hidden
        className="flex size-7 items-center justify-center rounded-full bg-gold font-mono text-xs font-bold text-maroon-deep"
      >
        {name.slice(0, 1).toUpperCase()}
      </span>
      <span className="flex flex-col leading-tight">
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-gold-light">Signed in</span>
        <span className="text-sm">{name}</span>
      </span>
    </Link>
  );
}
