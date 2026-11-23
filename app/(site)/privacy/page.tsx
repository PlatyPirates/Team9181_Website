import type { Metadata } from "next";
import { PageHero, Section } from "@/components/ui";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Platy Pirates, FRC Team 9181, handles information on team9181.org and in the member portal.",
};

const UPDATED = "November 22, 2026";
const CONTACT = "team@platypirates.org";

const h2 = "mt-10 mb-3 text-2xl";
const p = "mb-4 max-w-3xl leading-relaxed";
const ul = "mb-4 ml-6 max-w-3xl list-disc space-y-2 leading-relaxed";

export default function PrivacyPage() {
  return (
    <>
      <PageHero eyebrow="The Ship's Log" title="Privacy Policy">
        What we collect on team9181.org and in the member portal, why, and how to have it removed.
      </PageHero>

      <Section>
        <p className={`${p} font-mono text-[0.8rem] text-fog`}>Last updated {UPDATED}</p>
        <p className={p}>
          Platy Pirates (FIRST Robotics Competition Team 9181) runs this website and a members-only portal for our students,
          mentors, parents and sponsors. We collect only what we need to run the team, we never sell it, and we never use it
          for advertising.
        </p>

        <h2 className={h2}>What we collect</h2>
        <ul className={ul}>
          <li>
            <strong>Join Us and sponsor forms:</strong> the name, email and other answers you type in, so the team can get back to you.
          </li>
          <li>
            <strong>Portal accounts:</strong> your name, username, email address, team role and title, and the parent and student
            links our team admins set up.
          </li>
          <li>
            <strong>Things you add in the portal:</strong> calendar events, RSVPs, comments, alert settings and similar team records.
          </li>
          <li>
            <strong>Basic technical data:</strong> a sign-in cookie that keeps you logged in, and standard server logs from our hosting provider.
            We don&apos;t use advertising or cross-site tracking cookies.
          </li>
        </ul>

        <h2 className={h2}>Google Calendar sync (optional)</h2>
        <p className={p}>
          Members can choose to connect a Google account so team events appear in their Google Calendar. If you do:
        </p>
        <ul className={ul}>
          <li>
            We ask Google for your <strong>email address</strong> (to show which account is connected) and for permission to
            <strong> create and manage one secondary calendar named &ldquo;Platy Pirates&rdquo;</strong> and the events in it
            (the <code>calendar.app.created</code> permission).
          </li>
          <li>
            We use that access only to add, update and remove team events in that one calendar. We can&apos;t see or change your
            other calendars, contacts, email or files.
          </li>
          <li>
            We store an encrypted Google sign-in token so updates can happen without you logging in again. It is never shown to
            anyone, including team admins.
          </li>
          <li>
            Google data is not sold, not used for advertising, and not shared with anyone except as needed to provide this
            feature. Our use of information received from Google APIs follows the{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Google API Services User Data Policy
            </a>
            , including its Limited Use requirements.
          </li>
          <li>
            You can disconnect at any time under Team Calendar &rarr; Settings. That deletes the token we stored and can also delete
            the Platy Pirates calendar from your account. You can also remove access from your Google Account&apos;s security settings.
          </li>
        </ul>

        <h2 className={h2}>How we use information</h2>
        <ul className={ul}>
          <li>To run the team: rosters, schedules, the team calendar, recruiting, and communication with members and families.</li>
          <li>To send the emails and phone notifications you turn on (for example calendar reminders or request alerts).</li>
          <li>To keep the portal secure, and to see who made a change (for example, when a parent edits their student&apos;s event).</li>
        </ul>

        <h2 className={h2}>Who processes it for us</h2>
        <p className={p}>
          We use a few service providers to run the site: Vercel (hosting), Supabase (database and sign-in), Resend (email),
          ntfy (optional phone notifications) and Google (optional calendar sync and Google Forms). They handle data only to provide
          their service to us.
        </p>

        <h2 className={h2}>Students and minors</h2>
        <p className={p}>
          Many of our members are students under 18. Student accounts are created as part of team participation and are linked to a
          parent or guardian where families ask for it. Parents can contact us at any time to review or remove their student&apos;s information.
        </p>

        <h2 className={h2}>Keeping and deleting data</h2>
        <p className={p}>
          We keep information while you are part of the team or while it is useful for team records. You can ask us to see, correct or
          delete your information by emailing <a href={`mailto:${CONTACT}`} className="underline">{CONTACT}</a>. Disconnecting Google
          sync removes your Google token right away.
        </p>

        <h2 className={h2}>Changes and contact</h2>
        <p className={p}>
          If we change this policy we&apos;ll update the date above. Questions? Email{" "}
          <a href={`mailto:${CONTACT}`} className="underline">{CONTACT}</a>.
        </p>
      </Section>
    </>
  );
}
