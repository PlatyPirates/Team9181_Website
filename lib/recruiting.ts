// Shared types and labels for the Join Us → Recruiting pipeline.
// Safe to import from both server and client code (no secrets here).

export const KINDS = ["student", "mentor", "sponsor"] as const;
export type Kind = (typeof KINDS)[number];
export type InquiryKind = Kind | "other";

export const STATUSES = ["new", "contacted", "accepted", "declined", "archived"] as const;
export type InquiryStatus = (typeof STATUSES)[number];

export type SourceMode = "native" | "google";

export interface RecruitingSource {
  kind: Kind;
  mode: SourceMode;
  google_form_url: string | null;
  google_sheet_url: string | null;
}

export interface Inquiry {
  id: string;
  kind: InquiryKind;
  source: SourceMode;
  name: string;
  email: string;
  phone: string | null;
  organization: string | null;
  message: string | null;
  details: Record<string, string>;
  status: InquiryStatus;
  notes: string | null;
  submitted_at: string;
}

export const KIND_LABEL: Record<InquiryKind, string> = {
  student: "Students",
  mentor: "Mentors",
  sponsor: "Sponsors",
  other: "Other",
};

export const KIND_SINGULAR: Record<InquiryKind, string> = {
  student: "student",
  mentor: "mentor",
  sponsor: "sponsor",
  other: "contact",
};

export const STATUS_LABEL: Record<InquiryStatus, string> = {
  new: "New",
  contacted: "Contacted",
  accepted: "Accepted",
  declined: "Declined",
  archived: "Archived",
};

export function isKind(v: unknown): v is Kind {
  return typeof v === "string" && (KINDS as readonly string[]).includes(v);
}

/** Native form page for each audience. */
export function nativeFormHref(kind: Kind) {
  return `/join/${kind}`;
}

/** Only accept http(s) Google Forms / Docs links so a typo can't link somewhere odd. */
export function cleanGoogleUrl(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  try {
    const u = new URL(v);
    if (u.protocol !== "https:") return null;
    const ok = u.hostname === "forms.gle" || u.hostname === "docs.google.com" || u.hostname.endsWith(".google.com");
    return ok ? u.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Pull the standard fields out of a free-form set of question → answer pairs
 * (a Google Form row). Question titles vary, so match loosely, and skip
 * parent/guardian questions so a student's row shows the student's own
 * name and email (parent answers stay under "All answers").
 */
export function extractStandardFields(answers: Record<string, string>, kind?: InquiryKind) {
  const entries = Object.entries(answers).map(([q, a]) => [q.toLowerCase(), String(a ?? "").trim()] as const);
  const PARENT = /parent|guardian/;
  const find = (patterns: RegExp[], { allowParent = false, exclude }: { allowParent?: boolean; exclude?: RegExp } = {}) => {
    for (const p of patterns) {
      const hit = entries.find(([q, a]) => a && p.test(q) && (allowParent || !PARENT.test(q)) && !(exclude && exclude.test(q)));
      if (hit) return hit[1];
    }
    return "";
  };
  const first = find([/^first name/, /\bfirst name\b(?! and)/]);
  const last = find([/^last name/], {});
  const name =
    find([/first and last name/, /full name/, /^name$/, /your name/, /contact name/, /student.*name/, /participant.*name/, /^name\b/]) ||
    [first, last].filter(Boolean).join(" ");
  const orgPatterns =
    kind === "student"
      ? [/school/]
      : [/company/, /organi[sz]ation/, /employer/, /business/, /school/];
  return {
    name,
    email:
      find([/participant.*e-?mail/, /student.*e-?mail/, /your e-?mail/, /e-?mail/]) ||
      entries.find(([q, a]) => !PARENT.test(q) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a))?.[1] ||
      "",
    phone: find([/phone/, /cell/, /mobile/], { allowParent: true }) || null,
    organization: find(orgPatterns, { exclude: /equipment|manufactur|hear about/ }) || null,
    message: find([/message/, /anything else/, /comments?/, /questions?/, /tell us/, /why/], { exclude: /hear about/ }) || null,
  };
}

/** For a single Google Form shared by all audiences: guess which audience. */
export function inferKind(answers: Record<string, string>): InquiryKind {
  const text = Object.values(answers).join(" ").toLowerCase();
  if (/sponsor|donat|partner/.test(text)) return "sponsor";
  if (/mentor|coach|volunteer/.test(text)) return "mentor";
  if (/student|join the team|grade|member/.test(text)) return "student";
  return "other";
}
