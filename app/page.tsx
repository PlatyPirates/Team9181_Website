import type { Metadata } from "next";
import Link from "next/link";
import { asset } from "@/lib/asset";
import { ButtonLink, Card, Eyebrow, Grid, InfoCard, Role, RopeDivider, Section, SectionHead, WaxSeal, Wrap, heroTagline } from "@/components/ui";

export const metadata: Metadata = {
  title: { absolute: "Platy Pirates | FRC Team 9181" },
  description: "Platy Pirates — FRC Team 9181, an all-girls FIRST Robotics Competition team. Meet the crew, see the robots, and join the ship.",
};

// Placeholder stats — swap in the team's real numbers.
const STATS = [
  { label: "Founded", value: "2024" },
  { label: "Members", value: "18" },
  { label: "Seasons", value: "2" },
  { label: "Events", value: "3" },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden pt-[72px] pb-14">
        <Wrap className="grid grid-cols-[1.2fr_0.8fr] items-center gap-10 max-[860px]:grid-cols-1 max-[860px]:text-center">
          <div>
            <Eyebrow>All-Girls FIRST&reg; Robotics Competition Team</Eyebrow>
            <h1>Platy Pirates</h1>
            <p className={heroTagline}>
              Team 9181 sails a scrappy little crew of builders, coders, and strategists who&apos;d rather design the
              ship than wait for one. We build competition robots each season — and we build each other into engineers.
            </p>
            <div className="mt-6 flex flex-wrap gap-3.5 max-[860px]:justify-center">
              <ButtonLink href="/join">Join the Crew</ButtonLink>
              <ButtonLink href="/robots" variant="ghost">See Our Robots</ButtonLink>
            </div>
          </div>
          <div className="max-[860px]:order-first max-[860px]:mx-auto max-[860px]:max-w-[260px]">
            <img
              src={asset("/mascot.svg")}
              alt="Illustration of the Platy Pirates mascot: a platypus wearing a captain's hat and an eyepatch"
              className="w-full max-w-[340px] drop-shadow-card"
            />
          </div>
        </Wrap>
      </section>

      <RopeDivider />

      <Section>
        <SectionHead eyebrow="Team's Mission" title="Who we are" />
        <Grid cols={3}>
          <InfoCard role="Mission" title="Build confidence, not just robots">
            We&apos;re an all-girls FRC team because representation in STEM shouldn&apos;t be an afterthought. Every
            member gets real hands-on time on mechanical, electrical, programming, and strategy — no roles reserved by
            default.
          </InfoCard>
          <InfoCard role="Program" title="FIRST Robotics Competition">
            Each January we get a new game and six weeks to design, build, wire, and program a robot from scratch, then
            compete at regional events alongside hundreds of teams worldwide.
          </InfoCard>
          <InfoCard role="9181" title="The number on our hull">
            Team number 9181 marks every robot, every jersey, and — soon — every trophy case shelf.{" "}
            <Link href="/team">Meet the crew behind it →</Link>
          </InfoCard>
        </Grid>
      </Section>

      <Section alt>
        <SectionHead eyebrow="By the Numbers" title="Where we've sailed so far">
          <p>Placeholder stats below — swap in your team&apos;s real numbers once you have them.</p>
        </SectionHead>
        <Grid cols={4}>
          {STATS.map((s) => (
            <Card key={s.label}>
              <Role>{s.label}</Role>
              <h3>{s.value}</h3>
            </Card>
          ))}
        </Grid>
      </Section>

      <Section>
        <Grid cols={2} className="items-center">
          <div>
            <Eyebrow>Come Aboard</Eyebrow>
            <h2>No experience required — just curiosity</h2>
            <p>
              Whether you want to code autonomous routines, weld a chassis, design a pit banner, or manage the budget,
              there&apos;s a berth for you on this ship. We teach everything from scratch.
            </p>
            <ButtonLink href="/join">See how to join</ButtonLink>
          </div>
          <WaxSeal num="9181" label="Est. Crew" />
        </Grid>
      </Section>
    </>
  );
}
