"use client";
import { useTransition } from "react";
import { setPortalTheme } from "@/lib/portal-theme-actions";
import type { PortalTheme } from "@/lib/portal-theme";

const OPTIONS: { value: PortalTheme; label: string; swatch: string }[] = [
  { value: "parchment", label: "Parchment", swatch: "bg-[#f1e6cf] border-[#3f0f1a]" },
  { value: "heritage", label: "Heritage", swatch: "bg-[#3f0f1a] border-[#c9a24b]" },
  { value: "dark", label: "Dark", swatch: "bg-[#121010] border-[#c9a24b]" },
];

export default function PortalThemeToggle({ current }: { current: PortalTheme }) {
  const [pending, start] = useTransition();
  return (
    <div
      role="radiogroup"
      aria-label="Portal theme"
      className="portal-surface hidden items-center gap-1 rounded border border-[color:var(--p-border)] bg-[color:var(--p-surface)] p-1 sm:flex"
    >
      {OPTIONS.map((o) => {
        const active = o.value === current;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={pending}
            title={o.label}
            onClick={() => start(async () => { await setPortalTheme(o.value); })}
            className={`flex items-center gap-1.5 rounded px-2 py-1 text-[0.65rem] font-mono uppercase tracking-[0.14em] ${
              active
                ? "bg-[color:var(--p-accent)] text-[color:var(--p-cta-text)]"
                : "text-[color:var(--p-text-muted)] hover:text-[color:var(--p-text)]"
            }`}
          >
            <span className={`inline-block size-3 rounded-full border ${o.swatch}`} aria-hidden />
            <span>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
