"use client";
import { useState, useTransition } from "react";
import { setPortalTheme } from "@/lib/portal-theme-actions";
import type { PortalTheme } from "@/lib/portal-theme";

// Icon switch for the three portal themes, same style as the public site's
// sun/moon toggle: Parchment = sun, Heritage = crown, Dark = moon.
const OPTIONS: { value: PortalTheme; label: string; icon: React.ReactNode }[] = [
  {
    value: "parchment",
    label: "Parchment",
    icon: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </>
    ),
  },
  {
    value: "heritage",
    label: "Heritage",
    icon: (
      <>
        <path d="M3 8l4 4 5-7 5 7 4-4-2 11H5L3 8Z" />
        <path d="M5 19h14" />
      </>
    ),
  },
  {
    value: "dark",
    label: "Dark",
    icon: <path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />,
  },
];

const STEP = 32; // px between icon centers (28px slot + 4px gap)

export default function PortalThemeToggle({ current }: { current: PortalTheme }) {
  const [pending, start] = useTransition();
  // Move the highlight right away; the server action re-renders the portal in the new theme.
  const [picked, setPicked] = useState<PortalTheme>(current);
  const [lastCurrent, setLastCurrent] = useState(current);
  if (current !== lastCurrent) {
    setLastCurrent(current);
    setPicked(current);
  }
  const index = Math.max(0, OPTIONS.findIndex((o) => o.value === picked));

  return (
    <div
      role="radiogroup"
      aria-label="Portal theme"
      className="relative inline-flex h-[38px] shrink-0 items-center gap-1 rounded-full border border-[color:var(--p-border-strong)] px-[5px]"
    >
      {/* Highlight that slides under the chosen icon */}
      <span
        aria-hidden
        className="absolute top-1/2 left-[4px] size-[28px] rounded-full bg-[color:var(--p-hint-bg)] shadow-[inset_0_0_0_1px_var(--p-border-strong)] transition-[translate] duration-300 ease-out motion-reduce:transition-none"
        style={{ translate: `${index * STEP}px -50%` }}
      />
      {OPTIONS.map((o) => {
        const active = o.value === picked;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${o.label} theme`}
            title={`${o.label} theme`}
            disabled={pending}
            onClick={() => {
              if (active) return;
              setPicked(o.value);
              start(async () => {
                await setPortalTheme(o.value);
              });
            }}
            className={`relative z-10 flex size-[28px] cursor-pointer items-center justify-center rounded-full transition-colors duration-300 disabled:cursor-wait ${
              active ? "text-[color:var(--p-accent)]" : "text-[color:var(--p-text-muted)] hover:text-[color:var(--p-text)]"
            }`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {o.icon}
            </svg>
          </button>
        );
      })}
    </div>
  );
}
