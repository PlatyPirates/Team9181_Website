"use client";

import { useEffect, useSyncExternalStore } from "react";
import { applySiteTheme, hasSavedSiteTheme, readSiteTheme, type SiteTheme } from "@/lib/site-theme";

// Sun / moon switch in the site header. Which icon is highlighted is driven by
// CSS (the `dark:` variant reads <html data-theme>), so the prerendered header
// is already right before React hydrates; the store below only feeds aria-checked.
function subscribe(onChange: () => void) {
  const obs = new MutationObserver(onChange);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => obs.disconnect();
}
const getTheme = (): SiteTheme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");
const getServerTheme = (): SiteTheme => "light";

export default function SiteThemeToggle({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, getTheme, getServerTheme);

  useEffect(() => {
    // Re-read the cookie: coming back from the portal (client-side navigation),
    // its theme switcher may have changed it since the page first loaded.
    document.documentElement.dataset.theme = readSiteTheme();

    // No choice saved yet: keep following the device setting if it changes
    // (e.g. a phone switching to dark at sunset).
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (!hasSavedSiteTheme()) document.documentElement.dataset.theme = readSiteTheme();
    };
    mq.addEventListener("change", onSystemChange);
    return () => mq.removeEventListener("change", onSystemChange);
  }, []);

  const toggle = () => applySiteTheme(getTheme() === "dark" ? "light" : "dark");

  const icon = "relative z-10 size-[18px] transition-colors duration-300";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={theme === "dark"}
      aria-label="Dark theme"
      title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      onClick={toggle}
      className={`relative inline-flex h-[38px] shrink-0 cursor-pointer items-center gap-1 rounded-full border border-gold/50 bg-transparent px-[5px] hover:border-gold ${className}`}
    >
      {/* Highlight that slides under the active icon. */}
      <span
        aria-hidden
        className="absolute top-1/2 left-[4px] size-[28px] -translate-y-1/2 rounded-full bg-gold/25 shadow-[inset_0_0_0_1px_rgba(201,162,75,0.6)] transition-transform duration-300 ease-out dark:translate-x-[32px] motion-reduce:transition-none"
      />
      {/* Sun */}
      <span className="relative flex size-[28px] items-center justify-center">
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={`${icon} text-gold-light dark:text-parchment/55`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      </span>
      {/* Moon */}
      <span className="relative flex size-[28px] items-center justify-center">
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={`${icon} text-parchment/55 dark:text-gold-light`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />
        </svg>
      </span>
    </button>
  );
}
