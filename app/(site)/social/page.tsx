import type { Metadata } from "next";
import { PageHero, Section, externalLink } from "@/components/ui";
import { SOCIALS } from "@/lib/socials";

export const metadata: Metadata = {
  title: "Connect",
  description: "Follow Platy Pirates, FRC Team 9181, on social media.",
};

// Live accounts come from lib/socials.ts. Add an `href` to a placeholder
// below to turn it into a real link (or move it into lib/socials.ts).
const PLATFORMS: { icon: string; name: string; handle: string; href?: string }[] = [
  ...SOCIALS,
  { icon: "🐦", name: "X / Twitter", handle: "Add your handle" },
  { icon: "💬", name: "Discord", handle: "Add your invite link" },
];

const card =
  "rounded border border-maroon-deep/12 bg-cream p-6 text-center text-charcoal no-underline shadow-card hover:text-maroon-deep";

export default function SocialPage() {
  return (
    <>
      <PageHero eyebrow="Follow the Voyage" title="Connect With Us">
        Follow along for build updates, competition day photos, and behind-the-scenes crew life. Add more platforms
        below as your team joins them.
      </PageHero>

      <Section>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-5">
          {PLATFORMS.map((p) => {
            const inner = (
              <>
                <span className="mb-2.5 block text-[2.2rem]" aria-hidden="true">{p.icon}</span>
                <strong className="block font-display text-[1.1rem] text-maroon-deep">{p.name}</strong>
                <span className="font-mono text-[0.8rem] text-fog">{p.handle}</span>
              </>
            );
            return p.href ? (
              <a key={p.name} className={card} href={p.href} {...externalLink}>{inner}</a>
            ) : (
              <div key={p.name} className={`${card} opacity-60`}>{inner}</div>
            );
          })}
        </div>
        <p className="mt-6 font-mono text-[0.85rem] text-fog">
          Grayed-out cards are placeholders — delete the ones you don&apos;t use, or add an <code>href</code> in{" "}
          <code>app/(site)/social/page.tsx</code> once you have a link.
        </p>
      </Section>
    </>
  );
}
