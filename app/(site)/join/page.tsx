import type { Metadata } from "next";
import Link from "next/link";
import JoinForm from "@/components/JoinForm";
import { ButtonLink, Card, Eyebrow, InfoCard, PageHero, Role, Section, externalLink } from "@/components/ui";
import { formHref, getRecruitingSources } from "@/lib/recruiting-sources";
import type { RecruitingSource } from "@/lib/recruiting";
import { SOCIALS } from "@/lib/socials";

// Each tile's button goes to our own /join/<kind> form or to a Google Form,
// depending on Portal → Recruiting → Settings.
function TileButton({ src, label }: { src: RecruitingSource; label: string }) {
  const { href, external } = formHref(src);
  return (
    <ButtonLink href={href} variant="ghost" {...(external ? externalLink : {})}>
      {label} →
    </ButtonLink>
  );
}

// Vertical rule with "OR" between the columns on desktop; horizontal on phones.
function OrDivider() {
  return (
    <div className="flex items-center gap-3 self-stretch md:flex-col" aria-hidden>
      <span className="h-px flex-1 bg-maroon-deep/25 md:h-auto md:w-px" />
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-gold bg-cream font-display text-base font-extrabold text-maroon-deep">
        OR
      </span>
      <span className="h-px flex-1 bg-maroon-deep/25 md:h-auto md:w-px" />
    </div>
  );
}

export const metadata: Metadata = {
  title: "Join Us",
  description: "Join Platy Pirates, FRC Team 9181, or get in touch with the team.",
};

export default async function JoinPage() {
  const sources = await getRecruitingSources();
  return (
    <>
      <PageHero eyebrow="All Hands Wanted" title="Join the Crew">
        No experience needed. Bring curiosity and a passion for learning, and we&apos;ll teach the rest. Whether you&apos;re a
        prospective member, a mentor, or a sponsor, here&apos;s how to reach us.
      </PageHero>

      <Section>
        <Eyebrow>Who Can Join</Eyebrow>
        <h2>Open berths</h2>
        {/* Tiles | OR | Get in Touch. The card spans the full height of the three tiles. */}
        <div className="mt-5 grid gap-6 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <div className="grid gap-4">
            <InfoCard role="Students" title="New members" footer={<TileButton src={sources.student} label="Sign up" />}>
              Open to girls of all skill levels, no robotics experience needed. We usually meet weeknights from about <span className="whitespace-nowrap">7–9 PM</span> and weekends from <span className="whitespace-nowrap">2–5 PM</span>. Sign up and a team Lead will send you the details.
            </InfoCard>
            <InfoCard role="Adults" title="Mentors & coaches" footer={<TileButton src={sources.mentor} label="Offer to mentor" />}>
              Engineers, programmers, and professionals of any background are welcome to mentor.
            </InfoCard>
            <InfoCard role="Businesses" title="Sponsors & partners" footer={<TileButton src={sources.sponsor} label="Become a sponsor" />}>
              See our <Link href="/sponsors">Sponsors page</Link> for tiers and benefits.
            </InfoCard>
          </div>

          <OrDivider />

          <Card className="flex flex-col">
            <Role>Get In Touch</Role>
            <h3>Send us a message</h3>
            <JoinForm />
          </Card>
        </div>
      </Section>

      <Section alt className="text-center">
        <Eyebrow>Meanwhile</Eyebrow>
        <h2>Follow the crew</h2>
        <p className="mx-auto mb-5 max-w-[50ch]">
          Build updates, competition days, and behind-the-scenes crew life.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {SOCIALS.map((so) => (
            <ButtonLink key={so.key} href={so.href} {...externalLink}>
              {so.name} {so.handle} →
            </ButtonLink>
          ))}
        </div>
      </Section>
    </>
  );
}
