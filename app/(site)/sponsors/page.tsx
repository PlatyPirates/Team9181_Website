import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { asset } from "@/lib/asset";
import { SPONSOR_SEASON, SPONSOR_TIERS, type SponsorTier, type TierId } from "@/lib/sponsor-tiers";
import { ButtonLink, Card, Eyebrow, Grid, PageHero, Role, Section } from "@/components/ui";

export const metadata: Metadata = {
  title: "Sponsors",
  description: "Meet the sponsors that back Platy Pirates, FRC Team 9181, and learn how to sponsor the team.",
};

// To add a sponsor: drop the logo in public/sponsors/ and add an entry to SPONSORS
// with the tier they sponsored at: { name: "Acme", tier: "captain", logo: "/sponsors/acme.svg" }.
// Tier names, dollar ranges and perks live in lib/sponsor-tiers.ts. A tier with no
// sponsors still shows on the page with an "open" slot that links to /sponsors/levels.
// Optional per sponsor:
//   background: "white" (default) | "cream" | "none"  — the box behind the logo
//   border:     true (default) | false               — soft border around that box
//   blurb:      "One or two sentences about them."   — shown under the logo
//   size:       "sm" | "md" (default) | "lg" | "xl"   — logo box height: 60 / 90 / 130 / 180px
//   fade:       true | "sm" | "md" | "lg"             — feather the edges so a logo with a solid,
//               high-contrast background blends into the page instead of ending in a hard edge.
//               true = "md". With background "none" the logo image itself is feathered; otherwise
//               the box (background + border) is. Off by default.
type Sponsor = {
  name: string;
  tier: TierId;
  logo?: string;
  background?: "white" | "cream" | "none";
  border?: boolean;
  blurb?: string;
  size?: "sm" | "md" | "lg" | "xl";
  fade?: Fade;
};
type Fade = boolean | "sm" | "md" | "lg";
const SPONSORS: Sponsor[] = [
  // ── Flagship ──
  {
    name: "NASA",
    tier: "flagship",
    logo: "/sponsors/nasa.svg",
    background: "none",
    border: false,
    size: "xl",
    blurb: 
    "NASA's Robotics Alliance Project champions hands-on STEM education and workforce development across the country. " +
      "By funding our team's 2027 competition registration fees, NASA directly enables our students to gain " + 
      "real-world engineering experience and represent our community on the competition field.",
    // ALternate
    // "As the nation's leader in space exploration and aerospace innovation, NASA invests in the next generation of engineers through the Robotics Alliance Project. " +
    //  "Their generous grant covers our 2027 FIRST Robotics Competition registration fees, removing financial barriers so our students can focus on designing, building, and competing."

  },
  {
    name: "Zenith",
    tier: "flagship",
    logo: "/sponsors/Zenith_Logo.PNG",
    background: "none",
    border: false,
    size: "xl",
    fade: false,
    blurb: 
    "Supporting local businesses with flexible commercial office space, Zenith has graciously donated a " +
      "dedicated facility for our team's buildspace—giving our students a home to design, assemble, and " + 
      "test our 2027 robot.",
  },
  {
    name: " Gene Haas Foundation",
    tier: "flagship",
    logo: "/sponsors/GHF_Logo_LightBackground.png",
    background: "none",
    border: false,
    size: "xl",
    blurb: 
    "As a proud Strategic Partner of FIRST, the Gene Haas Foundation champions hands-on manufacturing " + 
      "education and technical career pathways. Their generous grant directly supports our team's 2027 season, " +
      "empowering our students to turn CAD designs into precision-machined robot components.",
  },

  // ── First Mate ──
  {
    name: "Caterpillar",
    tier: "first-mate",
    logo: "/sponsors/Caterpiller_Logo.png",
    background: "none",
    border: false,
    size: "md",
    blurb: 
    "As a global leader in heavy machinery, engineering, and industrial innovation, Caterpillar invests " + 
    "in the next generation of problem-solvers. Their generous grant directly supports our 2027 robotics season, " +
    "helping our students turn ambitious CAD designs into competition-ready hardware.",
  },
  {
    name: "High Tech Rising",
    tier: "first-mate",
    logo: "/sponsors/High_Tech_Rising.PNG",
    background: "none",
    border: false,
    size: "md",
    blurb: 
    "Dedicated to inspiring, engaging, and educating girls and young women in STEM, High Tech Rising has generously " +
    "supported our team with grant funding—empowering our students to design, build, and compete with our 2027 robot.",
  },
  {
    name: "WWT International",
    tier: "first-mate",
    logo: "/sponsors/WWT_Icon -_High_Resolution_Print.png",
    background: "none",
    border: false,
    size: "md",
    blurb: 
    "As a leader in engineering new technologies and services to extend reach and reduce " + 
      "wear in both Coiled Tubing and Drilling markets, WWT International helped us expand " + 
      "our fabrication capabilites in the shop for the upcoming season.",
  },

  // ── Crew ──
  {
    name: "RMFG",
    tier: "crew",
    logo: "/sponsors/RMFG-V2-Wordmark-Green-Transparent.svg",
    background: "none",
    border: false,
    size: "md",
    blurb: 
    "Rapid US sheet metal fabrication, fiber laser cutting, and CNC bending—turning student CAD designs " + 
    "into custom aluminum and steel mounts, brackets, and structural components for our 2027 robot.",
  },
  {
    name: "Caterpillar - Solar Turbines",
    tier: "crew",
    logo: "/sponsors/Caterpillar_A_Solar_Company.png",
    background: "none",
    border: false,
    size: "md",
    // fade: "sm",
    blurb: 
    "Solar Turbines, a subsidiary of Caterpillar, helps fuel our team's success by supporting our 2027 " + 
    "season operations and STEM outreach.",
  },
];

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
  return (
    <div>
      <div
        className={`flex ${SIZES[size]} items-center justify-center rounded-lg p-2 ${BACKGROUNDS[background]} ${
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
              <h3 className="inline-block rounded bg-maroon-deep px-3.5 py-1.5 font-mono text-[0.9rem] uppercase tracking-[0.12em] text-gold">
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
