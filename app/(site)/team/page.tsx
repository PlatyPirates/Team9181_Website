import type { Metadata } from "next";
import { asset } from "@/lib/asset";
import { Grid, InfoCard, PageHero, PhotoPlaceholder, Section, SectionHead } from "@/components/ui";

export const metadata: Metadata = {
  title: "Meet the Crew",
  description: "Meet the students, mentors, and roles that make up Platy Pirates, FRC Team 9181.",
};

// Edit these lists to update the roster. Add `photo: "/jane.jpg"` to show a photo.
const LEADS: { role: string; name: string; blurb: string; photo?: string }[] = [
  { role: "Team Captain", name: "Student Name", blurb: "One line about her role, focus area, or a fun fact." },
  { role: "Build Lead", name: "Student Name", blurb: "One line about her role, focus area, or a fun fact." },
  { role: "Programming Lead", name: "Student Name", blurb: "One line about her role, focus area, or a fun fact." },
  { role: "Outreach Lead", name: "Student Name", blurb: "One line about her role, focus area, or a fun fact." },
];

const SUBTEAMS = [
  { role: "Mechanical", name: "Build & CAD", blurb: "Chassis, drivetrain, mechanisms, CAD modeling." },
  { role: "Electrical", name: "Wiring & Controls", blurb: "Wiring harnesses, sensors, control panel." },
  { role: "Programming", name: "Software", blurb: "Autonomous routines, driver controls, vision." },
  { role: "Business", name: "Outreach & Ops", blurb: "Sponsorship, social media, awards, budgeting." },
];

const MENTORS = [
  { role: "Head Coach", name: "Mentor Name", blurb: "Background and how long they've mentored the team." },
  { role: "Technical Mentor", name: "Mentor Name", blurb: "Background and how long they've mentored the team." },
  { role: "Business Mentor", name: "Mentor Name", blurb: "Background and how long they've mentored the team." },
];

export default function TeamPage() {
  return (
    <>
      <PageHero eyebrow="The Crew Manifest" title="Meet the Crew">
        Every member of Platy Pirates wears more than one hat — literally and figuratively. Replace the placeholder
        cards below with your real roster (photos optional; the dashed boxes work fine without them).
      </PageHero>

      <Section>
        <SectionHead eyebrow="Leadership" title="Captains & leads" />
        <Grid cols={4}>
          {LEADS.map((p, i) => (
            <InfoCard
              key={i}
              role={p.role}
              title={p.name}
              photo={p.photo ? <img src={asset(p.photo)} alt={`${p.name}, ${p.role}`} className="mb-3.5 w-full rounded" /> : <PhotoPlaceholder />}
            >
              {p.blurb}
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
          <p>Add your mentors and coaches here — teachers, parents, and industry volunteers who guide the crew.</p>
        </SectionHead>
        <Grid cols={3}>
          {MENTORS.map((m) => (
            <InfoCard key={m.role} role={m.role} title={m.name}>{m.blurb}</InfoCard>
          ))}
        </Grid>
      </Section>
    </>
  );
}
