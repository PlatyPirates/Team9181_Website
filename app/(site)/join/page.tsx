import type { Metadata } from "next";
import Link from "next/link";
import JoinForm from "@/components/JoinForm";
import { ButtonLink, Card, Eyebrow, Grid, InfoCard, PageHero, Role, Section, externalLink } from "@/components/ui";
import { formHref, getRecruitingSources } from "@/lib/recruiting-sources";
import type { RecruitingSource } from "@/lib/recruiting";

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

export const metadata: Metadata = {
  title: "Join Us",
  description: "Join Platy Pirates, FRC Team 9181, or get in touch with the team.",
};

export default async function JoinPage() {
  const sources = await getRecruitingSources();
  return (
    <>
      <PageHero eyebrow="All Hands Wanted" title="Join the Crew">
        No experience needed — bring curiosity, we&apos;ll teach the rest. Whether you&apos;re a prospective member, a
        mentor, or a sponsor, here&apos;s how to reach us.
      </PageHero>

      <Section>
        <Grid cols={2}>
          <div>
            <Eyebrow>Who Can Join</Eyebrow>
            <h2>Open berths</h2>
            <div className="mt-5 grid gap-4">
              <InfoCard role="Students" title="New members" footer={<TileButton src={sources.student} label="Sign up" />}>
                Open to all skill levels. Meetings run after school — add your real schedule and location here.
              </InfoCard>
              <InfoCard role="Adults" title="Mentors & coaches" footer={<TileButton src={sources.mentor} label="Offer to mentor" />}>
                Engineers, programmers, and professionals of any background are welcome to mentor.
              </InfoCard>
              <InfoCard role="Businesses" title="Sponsors & partners" footer={<TileButton src={sources.sponsor} label="Become a sponsor" />}>
                See our <Link href="/sponsors">Sponsors page</Link> for tiers and benefits.
              </InfoCard>
            </div>
          </div>

          <Card>
            <Role>Get In Touch</Role>
            <h3>Send us a message</h3>
            <JoinForm />
          </Card>
        </Grid>
      </Section>

      <Section alt className="text-center">
        <Eyebrow>Meanwhile</Eyebrow>
        <h2>Find us on Instagram</h2>
        <p className="mx-auto mb-5 max-w-[50ch]">
          The fastest way to reach us right now is Instagram — DM us or comment on a post.
        </p>
        <ButtonLink href="https://www.instagram.com/frc_platypirates" {...externalLink}>
          @frc_platypirates →
        </ButtonLink>
      </Section>
    </>
  );
}
