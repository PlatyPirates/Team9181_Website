import type { Metadata } from "next";
import { PageHero, Section, buttonClass } from "@/components/ui";
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
      <PageHero eyebrow="Ship's Log" title="Team Calendar">
        Checkout the Platy Pirates' upccoming events and subscribe to our public calendar to stay up to date.
      </PageHero>
      <Section>
        <PublicCalendar />
        <div className="mt-8 rounded border border-maroon-deep/12 bg-cream p-6 shadow-card">
          <h3>Add it to your calendar</h3>
          <p className="max-w-[60ch] text-charcoal">
            Subscribe once and new public events show up in your own calendar app automatically.
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
      </Section>
    </>
  );
}
