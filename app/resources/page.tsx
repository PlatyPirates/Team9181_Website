import type { Metadata } from "next";
import { ButtonLink, Grid, InfoCard, PageHero, Section, SectionHead, externalLink } from "@/components/ui";
import { asset } from "@/lib/asset";

export const metadata: Metadata = {
  title: "Resources",
  description: "Build guides, scouting docs, and sponsor packets for Platy Pirates, FRC Team 9181.",
};

// Put files in public/docs/ and set `file: "/docs/name.pdf"`.
type Doc = { title: string; meta: string; file?: string };

const CREW_DOCS: Doc[] = [
  { title: "New Member Handbook", meta: "PDF · onboarding basics, shop rules, safety" },
  { title: "Shop Safety Guide", meta: "PDF · tools, PPE, and shop procedures" },
  { title: "CAD & Design Standards", meta: "PDF · naming conventions, file structure" },
  { title: "Programming Style Guide", meta: "PDF · code conventions and repo structure" },
];

const SCOUTING_DOCS: Doc[] = [
  { title: "Match Scouting Sheet", meta: "PDF / Google Sheet template" },
  { title: "Pit Scouting Sheet", meta: "PDF / Google Sheet template" },
  { title: "Alliance Selection Cheat Sheet", meta: "PDF · quick-reference for event day" },
];

const SPONSOR_DOCS: Doc[] = [
  { title: "Sponsorship Packet", meta: "PDF · tiers, benefits, and impact" },
  { title: "Team Media Kit", meta: "ZIP · logo files, brand colors, photos" },
];

const LINKS = [
  { role: "Governing Body", title: "FIRST Robotics Competition", href: "https://www.firstinspires.org/robotics/frc", text: "Official rules, season info, and event registration." },
  { role: "Community Docs", title: "Chief Delphi", href: "https://www.chiefdelphi.com", text: "The FRC community forum for strategy, CAD, and code help." },
  { role: "Rankings & Data", title: "The Blue Alliance", href: "https://www.thebluealliance.com", text: "Match results, rankings, and team statistics." },
];

function DocList({ docs }: { docs: Doc[] }) {
  return (
    <ul className="grid gap-3">
      {docs.map((d) => (
        <li
          key={d.title}
          className="flex items-center justify-between gap-3 rounded border border-maroon-deep/12 bg-cream px-[18px] py-4"
        >
          <div>
            <strong>{d.title}</strong>
            <div className="font-mono text-[0.75rem] text-fog">{d.meta}</div>
          </div>
          <ButtonLink href={d.file ? asset(d.file) : "#"} variant="ghost" className="shrink-0">
            Download
          </ButtonLink>
        </li>
      ))}
    </ul>
  );
}

export default function ResourcesPage() {
  return (
    <>
      <PageHero eyebrow="The Chart Room" title="Resources">
        Build guides, scouting sheets, sponsor materials, and onboarding docs — all in one place for the crew,
        mentors, and sponsors.
      </PageHero>

      <Section>
        <SectionHead eyebrow="For the Crew" title="Build & team guides">
          <p>
            Upload your PDFs into <code>public/docs/</code> and point each entry at the file. See README.md
            for exact steps.
          </p>
        </SectionHead>
        <DocList docs={CREW_DOCS} />
      </Section>

      <Section alt>
        <SectionHead eyebrow="For Competition" title="Scouting & strategy" />
        <DocList docs={SCOUTING_DOCS} />
      </Section>

      <Section>
        <SectionHead eyebrow="For Sponsors & Partners" title="Sponsorship materials" />
        <DocList docs={SPONSOR_DOCS} />
      </Section>

      <Section alt>
        <SectionHead eyebrow="External Links" title="Helpful FRC links" />
        <Grid cols={3}>
          {LINKS.map((l) => (
            <InfoCard key={l.title} role={l.role} title={<a href={l.href} {...externalLink}>{l.title}</a>}>
              {l.text}
            </InfoCard>
          ))}
        </Grid>
      </Section>
    </>
  );
}
