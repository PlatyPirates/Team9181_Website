import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { asset } from "@/lib/asset";
import { SPONSOR_SEASON, SPONSOR_TIERS, type SponsorTier } from "@/lib/sponsor-tiers";
import { SPONSORS, type Fade, type Sponsor } from "@/lib/sponsors";
import { ButtonLink, Card, Eyebrow, Grid, PageHero, Role, Section, externalLink } from "@/components/ui";

export const metadata: Metadata = {
  title: "Sponsors",
  description: "Meet the sponsors that back Platy Pirates, FRC Team 9181, and learn how to sponsor the team.",
};


const BACKGROUNDS = { white: "bg-white", cream: "bg-cream", none: "bg-transparent" };
const SIZES = { sm: "h-[60px]", md: "h-[90px]", lg: "h-[130px]", xl: "h-[180px]" };
const FADES = { sm: 8, md: 16, lg: 28 }; // width of the feathered edge, in px

// Feathers all four edges: one gradient per axis, intersected so the corners fade too.
function fadeStyle(fade: Fade | undefined): CSSProperties | undefined {
  if (!fade) return undefined;
  const px = FADES[fade === true ? "md" : fade];
  const edge = (dir: string) =>
    `linear-gradient(${dir}, transparent, #000 ${px}px, #000 calc(100% - ${px}px), transparent)`;
  const mask = `${edge("to right")}, ${edge("to bottom")}`;
  return {
    maskImage: mask,
    WebkitMaskImage: mask,
    maskComposite: "intersect",
    WebkitMaskComposite: "source-in",
  };
}

function LogoSlot({ sponsor }: { sponsor: Sponsor }) {
  if (!sponsor.logo) {
    return (
      <div className="flex h-[90px] items-center justify-center rounded border border-dashed border-fog bg-cream p-2 text-center font-mono text-[0.78rem] text-fog">
        {sponsor.name}
      </div>
    );
  }
  const { background = "white", border = true, size = "md", fade = false } = sponsor;
  // No box behind the logo → the logo's own background is what clashes, so feather the image.
  const fadeImage = fade && background === "none" && !border;
  const box = (
      <div
        className={`flex ${SIZES[size]} items-center justify-center rounded-lg p-2 ${BACKGROUNDS[background]} dark:bg-[#f7f0e1] ${
          border ? `border border-maroon-deep/15 ${fade ? "" : "shadow-sm"}` : ""
        }`}
        style={fadeImage ? undefined : fadeStyle(fade)}
      >
        <img
          src={asset(sponsor.logo)}
          alt={sponsor.name}
          className="max-h-full max-w-full"
          style={fadeImage ? fadeStyle(fade) : undefined}
        />
      </div>
  );
  return (
    <div>
      {sponsor.url ? (
        <a href={sponsor.url} {...externalLink} aria-label={`${sponsor.name.trim()} website (opens in a new tab)`} className="block rounded-lg transition-transform hover:-translate-y-0.5">
          {box}
        </a>
      ) : (
        box
      )}
      {sponsor.blurb && <p className="mt-2 text-[0.9rem] leading-snug">{sponsor.blurb}</p>}
    </div>
  );
}

// Shown in a tier nobody has sponsored yet, so visitors can see there's room aboard.
function OpenSlot({ tier }: { tier: SponsorTier }) {
  return (
    <Link
      href={`/sponsors/levels#${tier.id}`}
      className="flex h-[90px] flex-col items-center justify-center gap-1 rounded-lg border-[1.5px] border-dashed border-burgundy/40 bg-cream/60 p-3 text-center no-underline transition-colors hover:border-burgundy hover:bg-cream"
    >
      <span className="font-mono text-[0.78rem] uppercase tracking-[0.12em] text-burgundy">Open spot</span>
      <span className="text-[0.88rem] text-charcoal">Become our first {tier.name} sponsor →</span>
    </Link>
  );
}

export default function SponsorsPage() {
  return (
    <>
      <PageHero eyebrow="Backing the Voyage" title="Our Sponsors">
        FRC robots aren&apos;t cheap — registration, parts, travel, and tools add up fast. These sponsors keep Platy
        Pirates afloat.
      </PageHero>

      <Section>
        {SPONSOR_TIERS.map((tier) => {
          const sponsors = SPONSORS.filter((s) => s.tier === tier.id);
          return (
            <div key={tier.id} id={tier.id} className="mb-10 scroll-mt-24">
              <h3 className="theme-fixed inline-block rounded bg-maroon-deep px-3.5 py-1.5 font-mono text-[0.9rem] uppercase tracking-[0.12em] text-gold">
                {tier.name} Sponsors ({SPONSOR_SEASON} Season) - {tier.range}
              </h3>
              <Grid cols={tier.cols} className="mt-4">
                {sponsors.length ? (
                  sponsors.map((s) => <LogoSlot key={s.name} sponsor={s} />)
                ) : (
                  <OpenSlot tier={tier} />
                )}
              </Grid>
            </div>
          );
        })}
      </Section>

      <Section alt>
        <Grid cols={2} className="items-center">
          <div>
            <Eyebrow>Become a Sponsor</Eyebrow>
            <h2>Help fund the fleet</h2>
            <p>
              Sponsorship covers registration fees, materials, safety gear, and travel to competitions. In return,
              sponsors get logo placement on our robot, jerseys, and this site, plus a mention at events.
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/sponsors/levels">See sponsor levels</ButtonLink>
              <ButtonLink href="/join/sponsor" variant="ghost">Get in touch</ButtonLink>
            </div>
          </div>
          {/* <Card>
            <Role>Sponsor Packet</Role>
            <h3>Download our sponsorship packet</h3>
            <p>
              Add a link to your sponsorship PDF once it&apos;s ready — see the Resources page for where uploaded
              documents live.
            </p>
            <ButtonLink href="/resources" variant="ghost">Go to Resources →</ButtonLink>
          </Card> */}
        </Grid>
      </Section>
    </>
  );
}
