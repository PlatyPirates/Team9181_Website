import type { Metadata } from "next";
import { asset } from "@/lib/asset";
import { Grid, InfoCard, PageHero, PhotoPlaceholder, Section, SectionHead } from "@/components/ui";

export const metadata: Metadata = {
  title: "Robots & Season Log",
  description: "Platy Pirates robot gallery and season-by-season ship's log.",
};

// Newest season first. Set `photo` to a file in public/ to show a picture.
const ROBOTS: { season: string; name: string; blurb: string; photo?: string }[] = [
  { season: "2026 Season", name: '"Robot Name"', blurb: "Short blurb: drivetrain type, key mechanism, what it's good at." },
  { season: "2025 Season", name: '"Robot Name"', blurb: "Short blurb: drivetrain type, key mechanism, what it's good at." },
  {
    season: "2024 Season",
    name: '"Siren Song"',
    blurb: "This is a blurb about our Siren Song robot. It was the first in Texas, and 2nd in the US to score the triple trap.",
    photo: "/Crescendo_Robot_Iso.jpg",
  },
  { season: "2023 Season", name: '"Robot Name"', blurb: "Our very first competition robot — the one that started it all." },
];

// Add a new entry for each event — newest at the top.
const LOG = [
  { date: "MAR 2026", title: "Regional Event Name — Result", text: "A sentence or two on how the event went: alliance selection, award finalist, standout match, lessons learned." },
  { date: "FEB 2026", title: "Regional Event Name — Result", text: "A sentence or two on how the event went." },
  { date: "JAN 2026", title: "Kickoff & build season begins", text: "Note the game reveal and what the team's early strategy was." },
  { date: "2024", title: "Team 9181 founded", text: "How and why the team started — the origin story belongs here." },
];

export default function RobotsPage() {
  return (
    <>
      <PageHero eyebrow="Robot Gallery & Ship's Log" title="Our Robots">
        Every robot gets a name and a season. Swap the placeholder tiles for real photos (drop the picture into{" "}
        <code>public/</code> and set its <code>photo</code> in this page&apos;s list).
      </PageHero>

      <Section>
        <SectionHead eyebrow="Gallery" title="Meet the fleet" />
        <Grid cols={4}>
          {ROBOTS.map((r) => (
            <InfoCard
              key={r.season}
              role={r.season}
              title={r.name}
              photo={
                r.photo ? (
                  <img src={asset(r.photo)} alt={`Our ${r.season.replace(" Season", "")} robot`} className="mb-3.5 aspect-square w-full object-cover" />
                ) : (
                  <PhotoPlaceholder label="Robot photo" wide />
                )
              }
            >
              {r.blurb}
            </InfoCard>
          ))}
        </Grid>
      </Section>

      <Section alt>
        <SectionHead eyebrow="Captain's Log" title="Season history">
          <p>A running log of events, results, and awards. Add a new entry each event — newest at the top.</p>
        </SectionHead>
        {LOG.map((e, i) => (
          <div
            key={i}
            className="grid grid-cols-[140px_1fr] gap-5 border-b border-maroon-deep/15 py-5 last:border-b-0 max-[620px]:grid-cols-1 max-[620px]:gap-1.5"
          >
            <span className="font-mono text-[0.85rem] font-semibold text-burgundy">{e.date}</span>
            <div>
              <h3>{e.title}</h3>
              <p>{e.text}</p>
            </div>
          </div>
        ))}
      </Section>
    </>
  );
}
