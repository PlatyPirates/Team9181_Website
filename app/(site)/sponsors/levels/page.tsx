import type { Metadata } from "next";
import { asset } from "@/lib/asset";
import { SPONSOR_SEASON, SPONSOR_TIERS } from "@/lib/sponsor-tiers";
import { ButtonLink, buttonClass, Card, Eyebrow, Grid, PageHero, Role, Section, SectionHead } from "@/components/ui";

export const metadata: Metadata = {
  title: "Sponsor Levels",
  description:
    "Sponsorship levels for Platy Pirates, FRC Team 9181: Admiral, Flagship, Captain, First Mate and Crew, and what each one includes.",
};

// The one-pager lives in public/sponsors/. Regenerate it whenever lib/sponsor-tiers.ts changes.
const ONE_PAGER = "/sponsors/platy-pirates-sponsorship.pdf";

const USES = [
  { title: "Registration", body: "FIRST event fees to get our robot on the field each season." },
  { title: "Parts & materials", body: "Motors, electronics, aluminum and the spares that keep us running between matches." },
  { title: "Tools & safety", body: "Shop tools, machining and safety gear so students can build with confidence." },
  { title: "Travel", body: "Getting the crew and robot to regional and championship events." },
];

export default function SponsorLevelsPage() {
  return (
    <>
      <PageHero eyebrow="Join the Fleet" title="Sponsorship Levels">
        Every sponsor, from Crew to Admiral, puts students in the shop building real robots. Here&apos;s what each level
        includes for the {SPONSOR_SEASON} season.
      </PageHero>

      <Section>
        <SectionHead eyebrow="Where it goes" title="What your sponsorship funds">
          <p>All sponsorships directly support our team.</p>
        </SectionHead>
        <Grid cols={4}>
          {USES.map((u) => (
            <Card key={u.title}>
              <h3>{u.title}</h3>
              <p className="text-[0.95rem]">{u.body}</p>
            </Card>
          ))}
        </Grid>
      </Section>

      <Section alt>
        <SectionHead eyebrow={`${SPONSOR_SEASON} Season`} title="The five levels">
          <p>Listed from the top of the fleet down.</p>
        </SectionHead>
        <div className="flex flex-col gap-6">
          {SPONSOR_TIERS.map((tier, i) => (
            <Card key={tier.id}>
              <div
                id={tier.id}
                className="grid scroll-mt-28 grid-cols-[240px_1fr] items-start gap-6 max-[700px]:grid-cols-1 max-[700px]:gap-3"
              >
                <div>
                  <Role>Level {i + 1} of {SPONSOR_TIERS.length}</Role>
                  <h3 className="!mb-1 text-[1.6rem]">{tier.name}</h3>
                  <p className="font-mono text-[1.05rem] font-semibold text-burgundy">{tier.range}</p>
                  <p className="mt-1 text-[0.92rem] italic text-charcoal">{tier.tagline}</p>
                </div>
                <ul className="list-disc space-y-1.5 pl-5 text-[0.98rem] marker:text-gold">
                  {tier.perks.map((perk) => (
                    <li key={perk}>{perk}</li>
                  ))}
                </ul>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <Section>
        <Grid cols={2} className="items-start">
          <div>
            <Eyebrow>Come Aboard</Eyebrow>
            <h2>Ready to sponsor?</h2>
            <p>
              Tell us a little about your organization and a coach will follow up. Parts, machining, services and shop
              space are just as welcome as funding, so ask us how in-kind support fits a level.
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/join/sponsor">Get in touch</ButtonLink>
              <a href={asset(ONE_PAGER)} className={buttonClass("ghost")} download>
                Download one-pager (PDF)
              </a>
            </div>
          </div>
          <Card>
            <Role>Nonprofit</Role>
            <h3>About our nonprofit</h3>
            <p>
              Platy Pirates is run by HouTex Robotics, Inc., a Texas 501(c)(3) nonprofit formed to operate and
              financially manage FIRST Robotics Competition Team 9181.
            </p>
            <ButtonLink href="/sponsors" variant="ghost">Meet our current sponsors →</ButtonLink>
          </Card>
        </Grid>
      </Section>
    </>
  );
}
