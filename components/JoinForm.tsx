"use client";

import { useState, type FormEvent } from "react";
import { buttonClass } from "@/components/ui";

// No backend yet, so the form just confirms locally.
// See README.md "Connect the Join form" for wiring it to Formspree.

const field = "mb-[18px] flex flex-col gap-1.5";
const label = "text-[0.92rem] font-bold";
const input = "rounded border-[1.5px] border-fog bg-cream px-3 py-2.5 font-body text-base leading-normal text-charcoal";

export default function JoinForm() {
  const [sent, setSent] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSent(true);
    e.currentTarget.reset();
  }

  return (
    <>
      {sent && (
        <p className="mb-4 rounded bg-parchment-dark p-3 text-[0.9rem]" role="status">
          Thanks! This form isn&apos;t connected to email yet — see the README to hook it up. For now, please
          also reach out on Instagram @frc_platypirates.
        </p>
      )}
      <form onSubmit={handleSubmit}>
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
        <div className={field}>
          <label className={label} htmlFor="message">Message</label>
          <textarea className={`${input} min-h-[120px] resize-y`} id="message" name="message" />
        </div>
        <button type="submit" className={buttonClass("primary")}>Send Message</button>
      </form>
    </>
  );
}
