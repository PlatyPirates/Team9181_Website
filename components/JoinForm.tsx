"use client";

import { useActionState } from "react";
import { buttonClass } from "@/components/ui";
import { submitContactForm, type JoinFormState } from "@/app/(site)/join/actions";

// General "Send us a message" form. Submissions land in Portal → Recruiting
// (sorted by the "interested in" answer) and notify Leads who opted in.

const field = "mb-[18px] flex flex-col gap-1.5";
const label = "text-[0.92rem] font-bold";
const input = "rounded border-[1.5px] border-fog bg-cream px-3 py-2.5 font-body text-base leading-normal text-charcoal";

export default function JoinForm() {
  const [state, action, pending] = useActionState<JoinFormState, FormData>(submitContactForm, {});

  if (state.ok) {
    return (
      <p className="mb-4 rounded bg-parchment-dark p-3 text-[0.9rem]" role="status">
        Thanks! Your message is on its way to the team. We&apos;ll get back to you soon.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-1 flex-col">
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className={field}>
        <label className={label} htmlFor="name">Name</label>
        <input className={input} type="text" id="name" name="name" required />
      </div>
      <div className={field}>
        <label className={label} htmlFor="email">Email</label>
        <input className={input} type="email" id="email" name="email" required />
      </div>
      <div className={field}>
        <label className={label} htmlFor="interest">I&apos;m interested in</label>
        <select className={input} id="interest" name="interest">
          <option>Joining as a student</option>
          <option>Mentoring</option>
          <option>Sponsoring</option>
          <option>Something else</option>
        </select>
      </div>
      {/* Message box grows to fill the card's extra height. */}
      <div className={`${field} flex-1`}>
        <label className={label} htmlFor="message">Message</label>
        <textarea className={`${input} min-h-[120px] flex-1 resize-y`} id="message" name="message" />
      </div>
      {state.error && (
        <p className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-[0.9rem] text-red-900" role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" className={buttonClass("primary", "self-start")} disabled={pending}>
        {pending ? "Sending…" : "Send Message"}
      </button>
    </form>
  );
}
