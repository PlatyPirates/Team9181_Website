// Sponsorship levels, highest first. Used by the Sponsors page (to group logos)
// and the Sponsor Levels page (to list perks). Change a name, range or perk here
// and both pages update.

export const SPONSOR_SEASON = "2027";

export type TierId = "admiral" | "flagship" | "captain" | "first-mate" | "crew";

export type SponsorTier = {
  id: TierId;
  name: string;
  /** Shown next to the name, e.g. "$5,000–$9,999". */
  range: string;
  /** One line under the name on the levels page. */
  tagline: string;
  perks: string[];
  /** Logo columns on the Sponsors page (bigger tiers get fewer, larger slots). */
  cols: 3 | 4;
};

export const SPONSOR_TIERS: SponsorTier[] = [
  {
    id: "admiral",
    name: "Admiral",
    range: "$10,000+",
    tagline: "Commands the whole fleet.",
    cols: 3,
    perks: [
      "Most prominent logo on our website, team T-shirts and robot",
      "Acknowledgement gift plaque",
      "Logo and sponsorship level in our print media",
      "Monthly social media shout-outs through pre-season and build season (October–April)",
      "Pennant with your logo and level flown in our build space and competition pit",
      "Team T-shirt on request",
    ],
  },
  {
    id: "flagship",
    name: "Flagship",
    range: "$5,000–$9,999",
    tagline: "Leads the fleet into every competition.",
    cols: 3,
    perks: [
      "Second most prominent logo on our website, team T-shirts and robot",
      "Acknowledgement gift plaque",
      "Logo and sponsorship level in our print media",
      "Monthly social media shout-outs during build season (January–April)",
      "Team T-shirt on request",
    ],
  },
  {
    id: "captain",
    name: "Captain",
    range: "$2,000–$4,999",
    tagline: "Keeps the ship on course all season.",
    cols: 4,
    perks: [
      "Logo on our website, team T-shirts and robot",
      "Logo and sponsorship level in our print media",
      "Team T-shirt",
    ],
  },
  {
    id: "first-mate",
    name: "First Mate",
    range: "$1,000–$1,999",
    tagline: "Right hand of the captain.",
    cols: 4,
    perks: [
      "Logo on our website and team T-shirts",
      "Logo and sponsorship level in our print media",
      "Team T-shirt",
    ],
  },
  {
    id: "crew",
    name: "Crew",
    range: "$100–$999",
    tagline: "Every ship needs a crew.",
    cols: 4,
    perks: [
      "Logo or name on our website Sponsors page",
      "Thank-you shout-out on our social media",
      "Team T-shirt with gifts of $500 or more",
    ],
  },
];
