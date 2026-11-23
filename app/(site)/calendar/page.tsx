import type { Metadata } from "next";
import { Eyebrow, Wrap, buttonClass } from "@/components/ui";
import PublicCalendar from "./PublicCalendar";

export const metadata: Metadata = {
  title: "Calendar",
  description: "Public events for Platy Pirates, FRC Team 9181: competitions, outreach and open houses.",
};

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.team9181.org").replace(/\/$/, "");
const ICS = `${SITE}/api/calendar/public.ics`;
const WEBCAL = ICS.replace(/^https?:/, "webcal:");

export default function CalendarPage() {
  return (
    <>
      {/* Compact header so the whole month fits on screen without scrolling. */}
      <section className="pt-4 pb-3">
        <Wrap className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <Eyebrow>Ship&apos;s Log</Eyebrow>
            <h1 className="mt-1 mb-1 text-[clamp(2rem,3.5vw,2.8rem)]">Team Calendar</h1>
            <p className="m-0 text-charcoal">
              Check out the Platy Pirates&apos; upcoming events and subscribe to our public calendar to stay up to date.
            </p>
          </div>
          <a className={buttonClass("ghost", "!py-2")} href="#subscribe">Subscribe</a>
        </Wrap>
      </section>

      <section className="pb-16">
        <Wrap>
          <PublicCalendar />
          <div id="subscribe" className="mt-8 scroll-mt-24 rounded border border-maroon-deep/12 bg-cream p-6 shadow-card">
            <h3>Add it to your calendar</h3>
            <p className="max-w-[60ch] text-charcoal">
              Subscribe once and new public events show up in your own calendar app automatically. All times are Central (CT).
            </p>
            <div className="flex flex-wrap gap-3">
              <a className={buttonClass("primary")} href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(WEBCAL)}`} target="_blank" rel="noreferrer">
                Google Calendar
              </a>
              <a className={buttonClass("ghost")} href={WEBCAL}>Apple / Outlook</a>
              <a className={buttonClass("ghost")} href={ICS}>Download .ics</a>
            </div>
            <p className="mt-4 mb-0 break-all font-mono text-xs text-fog">{ICS}</p>
          </div>
        </Wrap>
      </section>
    </>
  );
}
