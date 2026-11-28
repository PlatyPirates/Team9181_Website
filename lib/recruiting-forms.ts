import type { Kind } from "@/lib/recruiting";

// Questions on the native Join Us forms. Edit labels/options here; the
// `std` key maps a question onto the standard columns in the Recruiting app.
// Every answer is also kept as-is under its label.

export interface FormField {
  name: string;
  label: string;
  /**
   * radio = pick one, checkboxes = pick any, consent = one box that must be ticked.
   * select is a dropdown (pick one).
   */
  type: "text" | "email" | "tel" | "textarea" | "select" | "radio" | "checkboxes" | "consent";
  required?: boolean;
  options?: string[];
  /** radio / checkboxes: add an "Other:" choice with its own text box. */
  other?: boolean;
  /** Small text under the label. */
  help?: string;
  /** consent: the sentence next to the checkbox. */
  consentText?: string;
  placeholder?: string;
  /** Only ask this question when another question's answer is one of these. */
  showIf?: { field: string; in: string[] };
  /** firstName + lastName are joined into the standard name column. */
  std?: "name" | "firstName" | "lastName" | "email" | "phone" | "organization" | "message";
}

export interface FormSpec {
  eyebrow: string;
  title: string;
  /** One or two sentences: page header and link previews. */
  intro: string;
  /** Longer text shown above the questions, in blocks with optional headings. */
  about?: { heading?: string; text: string }[];
  submitLabel: string;
  thanks: string;
  fields: FormField[];
}

/** Whether a showIf question applies, given how its controlling question was answered. */
export function isShown(f: FormField, answer: (name: string) => string | null): boolean {
  return !f.showIf || f.showIf.in.includes(answer(f.showIf.field) ?? "");
}

/** Value posted for an "Other:" choice; its text comes from `<name>__other`. */
export const OTHER = "__other";

export const FORM_SPECS: Record<Kind, FormSpec> = {
  // Mirrors the "Join the PlatyPirates!" Google Form.
  student: {
    eyebrow: "Students",
    title: "Join the PlatyPirates!",
    intro: "Thanks for your interest in FRC Team 9181, the PlatyPirates! Fill out this form and within a week you'll get an email with team info and how to come to your first build session.",
    about: [{ text: "Questions? Email us at team@platypirates.org." }],
    submitLabel: "Submit",
    thanks: "Thanks for signing on! Watch your email: within a week you'll get team info and how to come to your first build session.",
    fields: [
      { name: "name", label: "First and Last Name", type: "text", required: true, std: "name" },
      { name: "email", label: "Participant Email Address", type: "email", required: true, std: "email" },
      {
        name: "grade",
        label: "Your current grade level (if homeschooled, add age equivalent grade level)",
        type: "radio",
        required: true,
        options: ["8th", "9th", "10th", "11th", "12th"],
        other: true,
      },
      { name: "school", label: "What school do you go to? (If homeschooled, please indicate as such)", type: "text", required: true, std: "organization" },
      { name: "parent_name", label: "Parent/Guardian Name", type: "text", required: true },
      { name: "parent_email", label: "Parent/Guardian Email", type: "email", required: true },
      { name: "address", label: "Mailing Address", type: "text", required: true },
      { name: "parent_phone", label: "Parent/Guardian Phone number", type: "tel", required: true, std: "phone" },
      { name: "parent_employers", label: "Please list the organization(s) or companies that your parent(s) work for.", type: "text", required: true },
      { name: "zip", label: "Zip Code", type: "text", required: true },
      {
        name: "first_experience",
        label: "Have you participated in a FIRST program before? (If yes, select all that apply)",
        type: "checkboxes",
        required: true,
        options: [
          "Yes, FRC",
          "Yes, FTC",
          "Yes, FLL",
          "No, but I have participated in a robotics program other than FIRST",
          "No, I have never been a part of a robotics program",
        ],
      },
      { name: "team_numbers", label: "If you answered yes to the question above, please provide the team number(s).", type: "text" },
      {
        name: "interests",
        label: "What are you interested in working on with the PlatyPirates? Select all that apply.",
        type: "checkboxes",
        required: true,
        options: [
          "Business - Recruiting, website, sponsorships, fundraising, media, team imagery",
          "Impact - Outreach programs, award nominations/presentations, collaboration with other teams",
          "Programming - Robot coding (Java), GitHub management, game development",
          "Mechanical - Robot building, wiring, electronics",
          "Design - Documentation, robot design, CAD",
          "I don't know yet",
        ],
        other: true,
      },
      { name: "heard_from", label: "How did you hear about the PlatyPirates?", type: "text", required: true },
      {
        name: "parental_permission",
        label: "Parental Permission",
        type: "consent",
        required: true,
        consentText: "I certify that I have permission from my parent/guardian to complete this form and join this team.",
      },
      {
        name: "personal_info",
        label: "Personal Information",
        type: "consent",
        required: true,
        consentText:
          "I acknowledge that the email addresses provided for me and my parent/guardian will be used to contact me about taking the next steps to join the team. This information will not be kept or used for any other purpose.",
      },
      { name: "message", label: "Comments? Questions?", type: "textarea", std: "message" },
    ],
  },
  // Mirrors the "Mentor and Volunteer Interest Form" Google Form.
  mentor: {
    eyebrow: "Mentors & volunteers",
    title: "Mentor and Volunteer Interest Form",
    intro: "Interested in passing on your skills and experience to support the next generation? Fill out the form below to become a mentor for Houston's only community all-girls FRC team!",
    about: [
      {
        text: "Mentoring is at the heart of FIRST, and every adult on a team is a mentor, leading through guidance. Students need guidance, structure and encouragement, and a fun experience along the way. Mentors get a lot out of it too.",
      },
      {
        heading: "Who can mentor?",
        text: "Anyone 18 or older who isn't in high school, with technical or non-technical know-how: parents, friends, coworkers. We especially encourage women to mentor.",
      },
      {
        heading: "Commitment hours",
        text: "Any amount of time helps. We suggest starting at about 2 hours a week.",
      },
    ],
    submitLabel: "Submit",
    thanks: "Thank you for offering to mentor! A coach will be in touch soon.",
    fields: [
      { name: "first_name", label: "First name", type: "text", required: true, std: "firstName" },
      { name: "last_name", label: "Last name", type: "text", required: true, std: "lastName" },
      { name: "email", label: "Email", type: "email", required: true, std: "email" },
      { name: "phone", label: "Phone Number (Optional)", type: "tel", std: "phone" },
      { name: "organization", label: "Employer or Organization?", type: "text", required: true, std: "organization" },
      { name: "job_title", label: "Job Title or Area of Work (Optional)", type: "text" },
      {
        name: "first_connection",
        label: "Do you have a connection to FIRST? (Optional)",
        type: "radio",
        options: [
          "FRC Alumni",
          "FTC Alumni",
          "FLL Alumni",
          "No Background in FIRST",
          "Parent/guardian of a FIRST participant or Alumni",
          "Current or former FIRST volunteer",
          "Other FIRST connection",
          "No previous FIRST connection",
        ],
      },
      {
        name: "areas",
        label: "What area(s) would you be interested in mentoring with?",
        type: "checkboxes",
        required: true,
        options: [
          "Business & Communications",
          "Media & Marketing",
          "Imagery",
          "Programming and Electronics",
          "Mechanical Design (CAD, Engineering notebook)",
          "Manufacturing & Fabrication",
          "Build",
          "Safety",
          "Project Management",
        ],
        other: true,
      },
      {
        name: "message",
        label: "Is there anything else you'd like us to know about your interests, experience, or how you would like to get involved?",
        type: "textarea",
        std: "message",
      },
      {
        name: "commitment",
        label: "What kind of mentoring commitment works best for you?",
        type: "checkboxes",
        required: true,
        options: [
          "Ongoing support for the team",
          "Occasional help when a team member has a specific need",
          "One-time projects or consultations (ie. Order food for team at an event, Build practice field elements, Teach a lesson on a topic such as Grant Writing, Safety, etc)",
          "Mentoring virtually",
          "In-person mentoring",
          "I'm flexible/not sure yet",
        ],
        other: true,
      },
      {
        name: "availability",
        label: "When are you generally available to mentor?",
        type: "checkboxes",
        required: true,
        options: ["Weekday evenings", "Weekends", "My availability varies", "Not sure yet"],
      },
      {
        name: "heard_from",
        label: "How did you hear about the PlatyPirates? (Optional)",
        type: "radio",
        options: ["Employer or Organization", "Friend or Colleague", "FIRST Team or Volunteer", "FIRST Website"],
        other: true,
      },
      {
        name: "equipment",
        label: "Do you or your employer have access to manufacturing equipment that could potentially be used to help teams fabricate student-designed parts? (Optional)",
        type: "radio",
        options: ["Yes", "No", "Maybe"],
      },
      // Page 2 of the Google Form; here it appears right below once Yes or Maybe is picked.
      {
        name: "capabilities",
        label: "If yes, what manufacturing capabilities might you or your employer be able to make available to teams?",
        type: "checkboxes",
        showIf: { field: "equipment", in: ["Yes", "Maybe"] },
        options: [
          "CNC Machining",
          "Manual Machining",
          "Laser Cutting",
          "Waterjet Cutting",
          "Sheet Metal Fabrication",
          "Welding",
          "3D Printer",
        ],
        other: true,
      },
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
