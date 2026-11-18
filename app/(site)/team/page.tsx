import type { Metadata } from "next";
import { asset } from "@/lib/asset";
import { Grid, InfoCard, PageHero, PhotoPlaceholder, Section, SectionHead } from "@/components/ui";

export const metadata: Metadata = {
  title: "Meet the Crew",
  description: "Meet the students, mentors, and roles that make up Platy Pirates, FRC Team 9181.",
};

// Edit these lists to update the roster. Add `photo: "/jane.jpg"` to show a photo.
const LEADS: { role: string; name: string; blurb?: string; photo?: string }[] = [
  // template
  // { role: "Team Captain", name: "Emma Verhalen", blurb: "One line about her role, focus area, or a fun fact." },
  { role: "Team Captain", name: "Emma Verhalen", },
  { role: "Mechanical Lead", name: "Lily Derrickson", },
  { role: "Mechanical Lead 2", name: "Pollyanna Tallon", },
  { role: "Programming Lead", name: "Victoria Erinfolami", },
  { role: "Business Lead", name: "Michelle Okolie", },
  { role: "Safety Lead", name: "Pollyanna Tallon", },
];

const SUBTEAMS = [
  { role: "Mechanical", name: "Build & CAD", blurb: "Chassis, drivetrain, mechanisms, CAD modeling." },
  { role: "Electrical", name: "Wiring & Controls", blurb: "Wiring harnesses, sensors, control panel." },
  { role: "Programming", name: "Software", blurb: "Autonomous routines, driver controls, vision." },
  { role: "Business", name: "Outreach & Media", blurb: "Sponsorship, social media, awards, budgeting." },
  { role: "Competition", name: "Drive Team & Scouting", blurb: "Robot operation, pit maintenance, scouting, match strategy." },
];

const MENTORS = [
  // template
  // { role: "Head Coach", name: "Daniel Vecseri", blurb: "Background and how long they've mentored the team." },
  { role: "Head Coach", name: "Daniel Vecseri", },
  { role: "Head Coach/Technical Mentor", name: "Kasia Derrickson", },
  { role: "Team Admin", name: "Raffaele Sepe", },
  { role: "Mechanical Lead Mentor", name: "Jonathan Vecseri", },
  { role: "Mechanical Mentor", name: "Mariana Licon Corrodi", },
  { role: "Mechanical Mentor", name: "Ariel Thomas", },
  { role: "Build Mentor", name: "Michael Verhalen", },
];

export default function TeamPage() {
  return (
    <>
      <PageHero eyebrow="The Crew Manifest" title="Meet the Crew">
        Every member of Platy Pirates wears more than one hat—literally and figuratively. 
        Students act as builders, programmers, and strategists, while mentors serve as teachers, coaches, and guides. 
        Together, every sub-team forms a vital part of the ship.
        {/*
        // Alternate text
        No one on Platy Pirates has just one job—we all wear multiple hats, literally and figuratively. 
        Students step up as builders, programmers, and strategists, while mentors double as teachers, coaches, and guides. 
        Every sub-team is an indispensable part of the crew.
        */}
      </PageHero>

      <Section>
        <SectionHead eyebrow="Leadership" title="Captains & leads" />
        <Grid cols={3}>
          {LEADS.map((p, i) => (
            <InfoCard
              key={i}
              role={p.role}
              title={p.name}
              // photo={p.photo ? <img src={asset(p.photo)} alt={`${p.name}, ${p.role}`} className="mb-3.5 w-full rounded" /> : <PhotoPlaceholder />}
            >
              {/* {p.blurb} */}
            </InfoCard>
          ))}
        </Grid>
      </Section>

      <Section alt>
        <SectionHead eyebrow="Below Deck" title="Sub-teams" />
        <Grid cols={4}>
          {SUBTEAMS.map((t) => (
            <InfoCard key={t.role} role={t.role} title={t.name}>{t.blurb}</InfoCard>
          ))}
        </Grid>
      </Section>

      <Section>
        <SectionHead eyebrow="Mentors" title="Our mentors">
          <p>Our crew is guided by a dedicated group of teachers, parents, and industry volunteers serving as mentors 
            and coaches.</p>
        </SectionHead>
        <Grid cols={3}>
          {MENTORS.map((m) => (
            // with blurb
            // <InfoCard key={m.role} role={m.role} title={m.name}>{m.blurb}</InfoCard>
            <InfoCard key={m.role} role={m.role} title={m.name}></InfoCard>
          ))}
        </Grid>
      </Section>
    </>
  );
}
