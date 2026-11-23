import type { TierId } from "@/lib/sponsor-tiers";

// The team's sponsors. Read by the Sponsors page (grouped by tier, with blurbs)
// and the home page's logo grid, so adding or removing one here updates both.
// To add a sponsor: drop the logo in public/sponsors/ and add an entry to SPONSORS
// with the tier they sponsored at: { name: "Acme", tier: "captain", logo: "/sponsors/acme.svg" }.
// Tier names, dollar ranges and perks live in lib/sponsor-tiers.ts. A tier with no
// sponsors still shows on the page with an "open" slot that links to /sponsors/levels.
// Optional per sponsor:
//   background: "white" (default) | "cream" | "none"  — the box behind the logo
//   border:     true (default) | false               — soft border around that box
//   url:        "https://…"                          — their website; logos on the home page and
//                                                     Sponsors page link there (opens in a new tab)
//   blurb:      "One or two sentences about them."   — shown under the logo
//   size:       "sm" | "md" (default) | "lg" | "xl"   — logo box height: 60 / 90 / 130 / 180px
//   fade:       true | "sm" | "md" | "lg"             — feather the edges so a logo with a solid,
//               high-contrast background blends into the page instead of ending in a hard edge.
//               true = "md". With background "none" the logo image itself is feathered; otherwise
//               the box (background + border) is. Off by default.
export type Sponsor = {
  name: string;
  tier: TierId;
  logo?: string;
  url?: string;
  background?: "white" | "cream" | "none";
  border?: boolean;
  blurb?: string;
  size?: "sm" | "md" | "lg" | "xl";
  fade?: Fade;
};
export type Fade = boolean | "sm" | "md" | "lg";
export const SPONSORS: Sponsor[] = [
  // ── Flagship ──
  {
    name: "NASA",
    tier: "flagship",
    url: "https://robotics.nasa.gov/",
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
    url: "https://www.ghaasfoundation.org/",
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
    url: "https://www.caterpillar.com/",
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
    url: "https://www.wwtinternational.com/",
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
    url: "https://rmfg.com/",
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
    url: "https://www.solarturbines.com/",
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
