import type { Kind } from "@/lib/recruiting";

// Questions on the native Join Us forms. Edit labels/options here; the
// `std` key maps a question onto the standard columns in the Recruiting app.
// Every answer is also kept as-is under its label.

export interface FormField {
  name: string;
  label: string;
  type: "text" | "email" | "tel" | "textarea" | "select";
  required?: boolean;
  options?: string[];
  placeholder?: string;
  std?: "name" | "email" | "phone" | "organization" | "message";
}

export interface FormSpec {
  eyebrow: string;
  title: string;
  intro: string;
  submitLabel: string;
  thanks: string;
  fields: FormField[];
}

export const FORM_SPECS: Record<Kind, FormSpec> = {
  student: {
    eyebrow: "Students",
    title: "Join the crew",
    intro: "Platy Pirates is an all-girls team, and no experience is needed. Tell us a bit about yourself and a Lead will reach out with meeting times and next steps.",
    submitLabel: "Send my application",
    thanks: "Thanks for signing on! A team Lead will reach out soon with meeting times and next steps.",
    fields: [
      { name: "name", label: "Full name", type: "text", required: true, std: "name" },
      { name: "email", label: "Email", type: "email", required: true, std: "email" },
      { name: "phone", label: "Phone (optional)", type: "tel", std: "phone" },
      { name: "school", label: "School", type: "text", required: true, std: "organization" },
      { name: "grade", label: "Grade", type: "select", required: true, options: ["8th", "9th", "10th", "11th", "12th", "Other"] },
      { name: "parent_email", label: "Parent or guardian email", type: "email" },
      {
        name: "interests",
        label: "What sounds most fun?",
        type: "select",
        options: ["Build / mechanical", "Electrical", "Programming", "CAD / design", "Business / outreach", "Media / photo / video", "Not sure yet"],
      },
      { name: "message", label: "Anything else we should know?", type: "textarea", std: "message" },
    ],
  },
  mentor: {
    eyebrow: "Mentors & coaches",
    title: "Mentor the crew",
    intro: "Engineers, programmers, and professionals of any background are welcome. Tell us how you'd like to help.",
    submitLabel: "Send",
    thanks: "Thank you for offering to mentor! A coach will be in touch soon.",
    fields: [
      { name: "name", label: "Full name", type: "text", required: true, std: "name" },
      { name: "email", label: "Email", type: "email", required: true, std: "email" },
      { name: "phone", label: "Phone (optional)", type: "tel", std: "phone" },
      { name: "organization", label: "Employer or organization", type: "text", std: "organization" },
      { name: "expertise", label: "Area of expertise", type: "text", placeholder: "e.g. mechanical engineering, software, marketing" },
      {
        name: "availability",
        label: "Availability",
        type: "select",
        options: ["Weekly", "A few times a month", "Build season only", "Competitions / events", "Not sure yet"],
      },
      { name: "message", label: "How would you like to help?", type: "textarea", std: "message" },
    ],
  },
  sponsor: {
    eyebrow: "Sponsors & partners",
    title: "Sponsor the crew",
    intro: "Thank you for considering a sponsorship. Share a few details and a coach will follow up with tiers and benefits.",
    submitLabel: "Send",
    thanks: "Thank you for your interest in sponsoring Platy Pirates! A coach will follow up shortly.",
    fields: [
      { name: "name", label: "Contact name", type: "text", required: true, std: "name" },
      { name: "email", label: "Email", type: "email", required: true, std: "email" },
      { name: "phone", label: "Phone (optional)", type: "tel", std: "phone" },
      { name: "company", label: "Company or organization", type: "text", required: true, std: "organization" },
      {
        name: "interest",
        label: "Interested in",
        type: "select",
        options: ["Financial sponsorship", "In-kind (parts, tools, services)", "Shop space / facilities", "Mentoring from our staff", "Not sure yet"],
      },
      { name: "message", label: "Message", type: "textarea", std: "message" },
    ],
  },
};
