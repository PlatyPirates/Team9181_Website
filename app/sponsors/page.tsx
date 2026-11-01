import type { Metadata } from "next";
import { asset } from "@/lib/asset";
import { ButtonLink, Card, Eyebrow, Grid, PageHero, Role, Section } from "@/components/ui";

export const metadata: Metadata = {
  title: "Sponsors",
  description: "Meet the sponsors that back Platy Pirates, FRC Team 9181, and learn how to sponsor the team.",
};

// Replace a null with a logo, e.g. { name: "Acme", logo: "/sponsors/acme.png" }.
type Sponsor = { name: string; logo?: string } | null;
const TIERS: { name: string; cols: 3 | 4; sponsors: Sponsor[] }[] = [
  { name: "Flagship Sponsors", cols: 3, sponsors: [null, null, null] },
  { name: "Crew Sponsors", cols: 4, sponsors: [null, null, null, null] },
  { name: "In-Kind & Community Support", cols: 4, sponsors: [null, null] },
];

function LogoSlot({ sponsor }: { sponsor: Sponsor }) {
  return (
    <div className="flex h-[90px] items-center justify-center rounded border border-dashed border-fog bg-cream p-2 text-center font-mono text-[0.78rem] text-fog">
      {sponsor?.logo ? <img src={asset(sponsor.logo)} alt={sponsor.name} className="max-h-full max-w-full" /> : sponsor?.name ?? "Logo"}
    </div>
  );
}

export default function SponsorsPage() {
  return (
    <>
      <PageHero eyebrow="Backing the Voyage" title="Our Sponsors">
        FRC robots aren&apos;t cheap — registration, parts, travel, and tools add up fast. These sponsors keep Platy
        Pirates afloat. Replace the dashed boxes with real sponsor logos as they come in.
      </PageHero>

      <Section>
        {TIERS.map((tier) => (
          <div key={tier.name} className="mb-10">
            <h3 className="inline-block rounded bg-maroon-deep px-3.5 py-1.5 font-mono text-[0.9rem] uppercase tracking-[0.12em] text-gold">
              {tier.name}
            </h3>
            <Grid cols={tier.cols} className="mt-4">
              {tier.sponsors.map((s, i) => (
                <LogoSlot key={i} sponsor={s} />
              ))}
            </Grid>
          </div>
        ))}
      </Section>

      <Section alt>
        <Grid cols={2} className="items-center">
          <div>
            <Eyebrow>Become a Sponsor</Eyebrow>
            <h2>Help fund the fleet</h2>
            <p>
              Sponsorship covers registration fees, materials, safety gear, and travel to competitions. In return,
              sponsors get logo placement on our robot, jerseys, and this site, plus a mention at events.
            </p>
            <ButtonLink href="/join">Get in touch</ButtonLink>
          </div>
          <Card>
            <Role>Sponsor Packet</Role>
            <h3>Download our sponsorship packet</h3>
            <p>
              Add a link to your sponsorship PDF once it&apos;s ready — see the Resources page for where uploaded
              documents live.
            </p>
            <ButtonLink href="/resources" variant="ghost">Go to Resources →</ButtonLink>
          </Card>
        </Grid>
      </Section>
    </>
  );
}
