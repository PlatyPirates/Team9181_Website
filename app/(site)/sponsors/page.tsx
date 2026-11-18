import type { Metadata } from "next";
import { asset } from "@/lib/asset";
import { ButtonLink, Card, Eyebrow, Grid, PageHero, Role, Section } from "@/components/ui";

export const metadata: Metadata = {
  title: "Sponsors",
  description: "Meet the sponsors that back Platy Pirates, FRC Team 9181, and learn how to sponsor the team.",
};

// To add a sponsor: drop the logo in public/sponsors/ and replace a null with
// { name: "Acme", logo: "/sponsors/acme.svg" }. Each null is an empty "Logo" slot.
// Optional per sponsor:
//   background: "white" (default) | "cream" | "none"  — the box behind the logo
//   border:     true (default) | false               — soft border around that box
//   blurb:      "One or two sentences about them."   — shown under the logo
//   size:       "sm" | "md" (default) | "lg" | "xl"   — logo box height: 60 / 90 / 130 / 180px
type Sponsor = {
  name: string;
  logo?: string;
  background?: "white" | "cream" | "none";
  border?: boolean;
  blurb?: string;
  size?: "sm" | "md" | "lg" | "xl";
} | null;
const TIERS: { name: string; cols: 3 | 4; sponsors: Sponsor[] }[] = [
  {
    name: "Flagship Sponsors (2027 Season) - $5,000+",
    cols: 3,
    sponsors: [
      {
        name: "NASA",
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
        logo: "/sponsors/Zenith_Logo.PNG",
        background: "none",
        border: false,
        size: "xl",
        blurb: 
        "Supporting local businesses with flexible commercial office space, Zenith has graciously donated a " +
          "dedicated facility for our team's buildspace—giving our students a home to design, assemble, and " + 
          "test our 2027 robot.",
        },
      {
        name: " Gene Haas Foundation",
        logo: "/sponsors/GHF_Logo_LightBackground.png",
        background: "none",
        border: false,
        size: "xl",
        blurb: 
        "As a proud Strategic Partner of FIRST, the Gene Haas Foundation champions hands-on manufacturing " + 
          "education and technical career pathways. Their generous grant directly supports our team's 2027 season, " +
          "empowering our students to turn CAD designs into precision-machined robot components.",
        },
    ],
  },
  { name: "First Mate Sponsors (2027 Season) - $1,000-$4,999", cols: 4, 
    sponsors: [
      {
        name: "Caterpillar",
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
        logo: "/sponsors/High_Tech_Rising.PNG",
        background: "none",
        border: false,
        size: "md",
        blurb: 
        "Dedicated to inspiring, engaging, and educating girls and young women in STEM, High Tech Rising has generously " +
        "supported our team with grant funding—empowering our students to design, build, and compete with our 2027 robot.",
      },

    ],
  },
  { name: "Crew Sponsors (2027 Season) - $100-$999", cols: 4, 
    sponsors: [
      {
          name: "RMFG",
          logo: "/sponsors/RMFG-V2-Wordmark-Green-Transparent.svg",
          background: "none",
          border: false,
          size: "md",
          blurb: 
          "Rapid US sheet metal fabrication, fiber laser cutting, and CNC bending—turning student CAD designs " + 
            "into custom aluminum and steel mounts, brackets, and structural components for our 2027 robot.",
        },

    ], 
  },
  // { name: "In-Kind & Community Support (2027 Season)", cols: 4, 
  //   sponsors: [
  //     null, null

  //   ] 
  // },
];

const BACKGROUNDS = { white: "bg-white", cream: "bg-cream", none: "bg-transparent" };
const SIZES = { sm: "h-[60px]", md: "h-[90px]", lg: "h-[130px]", xl: "h-[180px]" };

function LogoSlot({ sponsor }: { sponsor: Sponsor }) {
  if (!sponsor?.logo) {
    return (
      <div className="flex h-[90px] items-center justify-center rounded border border-dashed border-fog bg-cream p-2 text-center font-mono text-[0.78rem] text-fog">
        {sponsor?.name ?? "Logo"}
      </div>
    );
  }
  const { background = "white", border = true, size = "md" } = sponsor;
  return (
    <div>
      <div
        className={`flex ${SIZES[size]} items-center justify-center rounded-lg p-2 ${BACKGROUNDS[background]} ${
          border ? "border border-maroon-deep/15 shadow-sm" : ""
        }`}
      >
        <img src={asset(sponsor.logo)} alt={sponsor.name} className="max-h-full max-w-full" />
      </div>
      {sponsor.blurb && <p className="mt-2 text-[0.9rem] leading-snug">{sponsor.blurb}</p>}
    </div>
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
        {TIERS.map((tier) => (
          <div key={tier.name} className="mb-10">
            <h3 className="inline-block rounded bg-maroon-deep px-3.5 py-1.5 font-mono text-[0.9rem] uppercase tracking-[0.12em] text-gold">
              {tier.name}
            </h3>
            <Grid cols={tier.cols} className="mt-4">
              {tier.sponsors.map((s, i) => (
                <LogoSlot key={i} sponsor={s} />
              ))}
            </Grid>
          </div>
        ))}
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
            <ButtonLink href="/join">Get in touch</ButtonLink>
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
