import Link from "next/link";
import { Wrap, externalLink } from "@/components/ui";

const SITE_LINKS = [
  { href: "/team", label: "Meet the Crew" },
  { href: "/robots", label: "Robots & Season Log" },
  { href: "/sponsors", label: "Sponsors" },
  { href: "/resources", label: "Resources" },
];

const heading = "mb-2.5 text-[0.95rem] text-gold-light";
const link = "text-gold-light hover:text-gold-light";

export default function SiteFooter() {
  return (
    <footer className="mt-10 bg-maroon-deep pt-10 pb-7 text-parchment">
      <Wrap>
        <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-7 max-[700px]:grid-cols-1">
          <div>
            <h4 className={heading}>Platy Pirates — FRC 9181</h4>
            <p>An all-girls FIRST Robotics Community team.</p>
          </div>
          <div>
            <h4 className={heading}>Site</h4>
            <ul>
              {SITE_LINKS.map(({ href, label }) => (
                <li key={href} className="mb-1.5 text-[0.92rem]">
                  <Link href={href} className={link}>{label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className={heading}>Connect</h4>
            <ul>
              <li className="mb-1.5 text-[0.92rem]">
                <a href="https://www.instagram.com/frc_platypirates" className={link} {...externalLink}>
                  Instagram @frc_platypirates
                </a>
              </li>
              <li className="mb-1.5 text-[0.92rem]">
                <Link href="/join" className={link}>Contact / Join</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-7 flex flex-wrap justify-between gap-2 border-t border-parchment/20 pt-[18px] font-mono text-[0.75rem] text-fog">
          <span>&copy; 2026 Platy Pirates, FRC Team 9181.</span>
          <span>Built with Next.js &amp; GitHub Pages.</span>
        </div>
      </Wrap>
    </footer>
  );
}
