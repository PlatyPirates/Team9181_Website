// Home-page "Sponsors & Partners" logo grid. Reads the same list as the
// Sponsors page (lib/sponsors.ts), so it grows and shrinks with it. Each tile
// opens the sponsor's website; one without a `url` goes to its tier on /sponsors.
import Link from "next/link";
import { asset } from "@/lib/asset";
import { SPONSORS, type Sponsor } from "@/lib/sponsors";
import { SPONSOR_TIERS } from "@/lib/sponsor-tiers";
import { ButtonLink, Eyebrow, Section, externalLink } from "@/components/ui";

const tierRank = (s: Sponsor) => SPONSOR_TIERS.findIndex((t) => t.id === s.tier);
const tierName = (s: Sponsor) => SPONSOR_TIERS.find((t) => t.id === s.tier)?.name ?? "";

// `theme-fixed` keeps tiles on a light plate in dark mode, so logos made for
// white backgrounds stay readable.
const tile =
  "theme-fixed group relative flex h-[112px] w-[172px] flex-col items-center justify-center rounded-lg border border-maroon-deep/12 bg-cream px-4 pt-3 pb-6 no-underline shadow-card transition-[translate,border-color,box-shadow] duration-200 hover:-translate-y-1 hover:border-gold hover:shadow-[0_10px_24px_rgba(63,15,26,0.25)] focus-visible:-translate-y-1 max-[420px]:w-[calc(50%-0.5rem)]";

function Tile({ sponsor }: { sponsor: Sponsor }) {
  const name = sponsor.name.trim();
  const inner = (
    <>
      {sponsor.logo ? (
        <img src={asset(sponsor.logo)} alt="" className="max-h-full max-w-full object-contain" loading="lazy" />
      ) : (
        <span className="text-center font-display text-[1rem] font-bold text-maroon-deep">{name}</span>
      )}
      {/* Tier flag along the bottom edge */}
      <span className="absolute inset-x-0 bottom-0 rounded-b-lg border-t border-gold/35 bg-gold/12 py-[3px] text-center font-mono text-[0.6rem] uppercase tracking-[0.16em] text-burgundy">
        {tierName(sponsor)}
      </span>
      {/* Little arrow that appears on hover */}
      <span aria-hidden className="absolute top-1.5 right-2 text-[0.8rem] text-burgundy opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        {sponsor.url ? "↗" : "→"}
      </span>
    </>
  );
  return sponsor.url ? (
    <a href={sponsor.url} {...externalLink} aria-label={`${name} website (opens in a new tab)`} title={name} className={tile}>
      {inner}
    </a>
  ) : (
    <Link href={`/sponsors#${sponsor.tier}`} aria-label={`${name}, on our Sponsors page`} title={name} className={tile}>
      {inner}
    </Link>
  );
}

export default function SponsorGrid() {
  if (!SPONSORS.length) return null;
  const sponsors = [...SPONSORS].sort((a, b) => tierRank(a) - tierRank(b));
  return (
    <Section alt>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="max-w-[56ch]">
          <Eyebrow>Sponsors &amp; Partners</Eyebrow>
          <h2 className="mb-2">Fair winds from our sponsors</h2>
          <p className="m-0">These crews keep the Platy Pirates afloat. Tap a logo to visit them.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/sponsors/levels">Become a sponsor</ButtonLink>
          <ButtonLink href="/sponsors" variant="ghost">All sponsors</ButtonLink>
        </div>
      </div>

      <ul className="m-0 flex list-none flex-wrap justify-center gap-4 p-0">
        {sponsors.map((s) => (
          <li key={s.name} className="contents">
            <Tile sponsor={s} />
          </li>
        ))}
      </ul>

      <p className="mt-7 mb-0 text-center">
        <Link href="/sponsors" className="font-semibold">See all sponsors and what they support →</Link>
      </p>
    </Section>
  );
}
