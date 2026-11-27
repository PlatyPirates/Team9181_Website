// Profile app: field definitions shared by the server loader, the server
// actions and the client forms. No server-only imports here.
import type { LeadTitle, Role, StudentTitle } from "@/lib/auth";

export const SUBTEAMS = ["Mechanical", "Electrical", "Programming", "Business", "Competition"] as const;

export const INTERESTS = [
  "Business",
  "Impact",
  "Programming",
  "Mechanical",
  "Design",
  "Not sure yet",
] as const;

export const SHIRT_SIZES = ["YS", "YM", "YL", "S", "M", "L", "XL", "2XL", "3XL"] as const;

export const TRANSPORTATION: Record<string, string> = {
  drives_self: "Drives themselves",
  parent_drives: "A parent drives",
  needs_ride: "Needs a ride",
  other: "Other",
};

export const YPP_STATUS: Record<string, string> = {
  none: "Not started",
  pending: "Pending",
  cleared: "Cleared",
  expired: "Expired",
};

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ---------------------------------------------------------------- grants
export type GrantScope = "student_contact" | "parent_contact" | "address" | "emergency" | "logistics";

export const GRANT_SCOPES: { key: GrantScope; label: string; unlocks: string }[] = [
  { key: "student_contact", label: "Student contact", unlocks: "Student phone and email" },
  { key: "parent_contact", label: "Parent contact", unlocks: "Guardian names, emails and phones" },
  { key: "emergency", label: "Emergency", unlocks: "Emergency contact, allergies, medical notes" },
  { key: "logistics", label: "Logistics", unlocks: "T-shirt size, transportation, other commitments" },
  { key: "address", label: "Address", unlocks: "Mailing address and guardian employers" },
];

export const scopeLabel = (s: string) => GRANT_SCOPES.find((g) => g.key === s)?.label ?? s;

export interface Grant {
  id: string;
  grantee: string;
  scope: GrantScope;
  subteams: string[] | null;
  expires_on: string | null;
}

// ---------------------------------------------------------------- people
export interface ProfileRow {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: Role;
  lead_title: LeadTitle;
  student_title: StudentTitle;
  mentor_title?: string | null;
  status: string;
  preferred_name: string | null;
  pronunciation: string | null;
  bio: string | null;
  avatar_mode: "avatar" | "photo";
  avatar_config: AvatarConfig | null;
  photo_path: string | null;
  photo_status: "none" | "pending" | "approved" | "rejected";
  photo_auto_approve: boolean;
  subteams: string[];
  grad_year: number | null;
  school: string | null;
  interests: string[];
  first_season: number | null;
  employer: string | null;
  job_title: string | null;
}

export const PROFILE_COLS =
  "id, username, full_name, email, role, lead_title, student_title, mentor_title, status, preferred_name, pronunciation, bio, " +
  "avatar_mode, avatar_config, photo_path, photo_status, photo_auto_approve, subteams, grad_year, school, interests, " +
  "first_season, employer, job_title";

export const CARD_COLS =
  "id, username, full_name, role, lead_title, student_title, mentor_title, status, preferred_name, avatar_mode, avatar_config, " +
  "photo_path, photo_status, subteams, grad_year";

export type CardRow = Pick<
  ProfileRow,
  | "id" | "username" | "full_name" | "role" | "lead_title" | "student_title" | "mentor_title" | "status" | "preferred_name"
  | "avatar_mode" | "avatar_config" | "photo_path" | "photo_status" | "subteams" | "grad_year"
>;

// ---------------------------------------------------------------- avatar
export interface AvatarConfig {
  bg?: string;
  skin?: string;
  hair?: string;
  hairColor?: string;
  eyes?: string;
  mouth?: string;
  hat?: string;
  extra?: string;
  shirt?: string;
}

export const AVATAR_OPTIONS = {
  bg: ["#6b1e2a", "#c9a24b", "#0f766e", "#4338ca", "#c2410c", "#e11d48", "#1e3a5f", "#3f6212"],
  skin: ["#f9d7c0", "#eebb99", "#d39b73", "#a86d4a", "#7a4a2e", "#4f2f1d"],
  hair: ["short", "long", "curly", "bun", "spiky", "none"],
  hairColor: ["#1f1a17", "#5a3a22", "#a0522d", "#d9a441", "#b23a2a", "#9ca3af", "#7c3aed"],
  eyes: ["round", "happy", "wink", "sleepy"],
  mouth: ["smile", "grin", "neutral", "open"],
  hat: ["none", "bandana", "tricorn", "cap", "beanie"],
  extra: ["none", "eyepatch", "glasses", "goggles", "earring"],
  shirt: ["#6b1e2a", "#c9a24b", "#1e3a5f", "#0f766e", "#111827", "#f5f5f4"],
} as const;

export const AVATAR_LABELS: Record<keyof typeof AVATAR_OPTIONS, string> = {
  bg: "Background",
  skin: "Skin tone",
  hair: "Hair",
  hairColor: "Hair colour",
  eyes: "Eyes",
  mouth: "Mouth",
  hat: "Headwear",
  extra: "Gear",
  shirt: "Shirt",
};

// A stable starting avatar per person, so nobody shows up blank.
export function defaultAvatar(seed: string): Required<AvatarConfig> {
  // FNV-1a per attribute, so each choice is independent of the others.
  const hash = (salt: number) => {
    let h = 2166136261 ^ salt;
    for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
    h ^= h >>> 15;
    return Math.imul(h, 2246822507) >>> 0;
  };
  const pick = <T,>(a: readonly T[], salt: number) => a[hash(salt) % a.length];
  return {
    bg: pick(AVATAR_OPTIONS.bg, 0),
    skin: pick(AVATAR_OPTIONS.skin, 3),
    hair: pick(AVATAR_OPTIONS.hair.slice(0, 5), 6),
    hairColor: pick(AVATAR_OPTIONS.hairColor.slice(0, 6), 9),
    eyes: pick(AVATAR_OPTIONS.eyes, 12),
    mouth: pick(AVATAR_OPTIONS.mouth.slice(0, 2), 15),
    hat: pick(["none", "bandana", "tricorn"] as const, 18),
    extra: "none",
    shirt: pick(AVATAR_OPTIONS.shirt, 21),
  };
}

export function resolveAvatar(cfg: AvatarConfig | null | undefined, seed: string): Required<AvatarConfig> {
  const base = defaultAvatar(seed);
  const out = { ...base };
  if (cfg) {
    for (const k of Object.keys(AVATAR_OPTIONS) as (keyof AvatarConfig)[]) {
      const v = cfg[k];
      if (typeof v === "string" && (AVATAR_OPTIONS[k] as readonly string[]).includes(v)) out[k] = v;
    }
  }
  return out;
}

// ---------------------------------------------------------------- fields
export type Visibility =
  | "public"      // every active member
  | "contact"     // Student contact grant (or Parent contact for a parent's own row)
  | "address"
  | "emergency"
  | "logistics"
  | "private"     // self, their parents, Leads
  | "lead";       // Leads only

export type FieldType =
  | "text" | "textarea" | "email" | "tel" | "number" | "date"
  | "select" | "multi" | "checkbox" | "consent" | "yesno" | "birthday";

export type Table =
  | "profiles" | "profile_birthday" | "profile_contact" | "profile_household" | "profile_health"
  | "profile_logistics" | "profile_skills" | "profile_consents" | "profile_admin";

export interface Field {
  key: string;            // column name (birthday: "birthday", consent: base name)
  table: Table;
  label: string;
  type: FieldType;
  see: Visibility;
  hint?: string;
  options?: { value: string; label: string }[];
  leadOnly?: boolean;
  roles?: Role[];                       // who has this field (default: everyone)
  required?: Role[];                    // required for these roles
  max?: number;
  short?: string;                       // name used in the "still needed" list
}

export type SectionKey =
  | "basics" | "school" | "team" | "contact" | "guardians" | "emergency" | "logistics" | "consents" | "admin";

export interface Section {
  key: SectionKey;
  title: string;
  parentTitle?: string;   // title on a parent-only account
  note?: string;          // who can see it
  roles?: Role[];
  fields: Field[];
}

const NOT_PARENT: Role[] = ["student", "mentor", "lead"];
const ADULT: Role[] = ["mentor", "lead", "parent"];
const opts = (xs: readonly string[]) => xs.map((x) => ({ value: x, label: x }));
const optsFrom = (r: Record<string, string>) => Object.entries(r).map(([value, label]) => ({ value, label }));

export const SECTIONS: Section[] = [
  {
    key: "basics",
    title: "Basics",
    fields: [
      { key: "full_name", table: "profiles", label: "Full name", type: "text", see: "public", required: ["student", "mentor", "lead", "parent"], max: 120 },
      { key: "preferred_name", table: "profiles", label: "Preferred name or nickname", type: "text", see: "public", max: 60 },
      { key: "pronunciation", table: "profiles", label: "Name pronunciation", type: "text", see: "public", hint: "For example: VECK-sur-ee", max: 80 },
      { key: "bio", table: "profiles", label: "Short bio", type: "textarea", see: "public", max: 600 },
      { key: "birthday", table: "profile_birthday", label: "Birthday", type: "birthday", see: "private", hint: "Month and day only, so the team can celebrate." },
    ],
  },
  {
    key: "school",
    title: "School",
    roles: ["student"],
    fields: [
      { key: "grad_year", table: "profiles", label: "Graduation year", type: "select", see: "public", required: ["student"], options: [] },
      { key: "school", table: "profiles", label: "School", type: "text", see: "public", required: ["student"], hint: "Write “Homeschooled” if that applies.", max: 120 },
    ],
  },
  {
    key: "team",
    title: "Team",
    parentTitle: "Work",
    fields: [
      { key: "subteams", table: "profiles", label: "Subteams", type: "multi", see: "public", leadOnly: true, roles: NOT_PARENT, options: opts(SUBTEAMS) },
      { key: "interests", table: "profiles", label: "Interests", type: "multi", see: "public", roles: ["student"], options: opts(INTERESTS) },
      { key: "first_season", table: "profiles", label: "First season with the team", type: "number", see: "public", leadOnly: true, roles: NOT_PARENT },
      { key: "skills", table: "profile_skills", label: "Skills and tools", type: "textarea", see: "private", roles: NOT_PARENT, hint: "CAD software, programming languages, machines you can run…", max: 600 },
      { key: "employer", table: "profiles", label: "Employer", type: "text", see: "public", roles: ADULT, max: 120 },
      { key: "job_title", table: "profiles", label: "Job title", type: "text", see: "public", roles: ADULT, max: 120 },
    ],
  },
  {
    key: "contact",
    title: "Contact",
    fields: [
      { key: "phone", table: "profile_contact", label: "Mobile phone", type: "tel", see: "contact", required: ["student", "mentor", "lead", "parent"], max: 30 },
      { key: "personal_email", table: "profile_contact", label: "Personal email", type: "email", see: "contact", hint: "Only if different from your login email.", max: 160 },
      { key: "address_line1", table: "profile_household", label: "Street address", type: "text", see: "address", roles: NOT_PARENT, required: ["student"], max: 160 },
      { key: "address_line2", table: "profile_household", label: "Apartment, suite (optional)", type: "text", see: "address", roles: NOT_PARENT, max: 160 },
      { key: "city", table: "profile_household", label: "City", type: "text", see: "address", roles: NOT_PARENT, required: ["student"], max: 80 },
      { key: "state", table: "profile_household", label: "State", type: "text", see: "address", roles: NOT_PARENT, required: ["student"], max: 40 },
      { key: "zip", table: "profile_household", label: "ZIP code", type: "text", see: "address", roles: NOT_PARENT, required: ["student"], max: 12 },
    ],
  },
  {
    key: "guardians",
    title: "Parents and guardians",
    roles: ["student"],
    fields: [],
  },
  {
    key: "emergency",
    title: "Emergency and health",
    roles: NOT_PARENT,
    fields: [
      { key: "emergency_name", table: "profile_health", label: "Emergency contact name", type: "text", see: "emergency", required: NOT_PARENT, max: 120 },
      { key: "emergency_relationship", table: "profile_health", label: "Relationship", type: "text", see: "emergency", max: 60 },
      { key: "emergency_phone", table: "profile_health", label: "Emergency contact phone", type: "tel", see: "emergency", required: NOT_PARENT, max: 30 },
      { key: "allergies", table: "profile_health", label: "Allergies and dietary needs", type: "textarea", see: "emergency", max: 600 },
      { key: "medical_notes", table: "profile_health", label: "Medical notes for events", type: "textarea", see: "emergency", hint: "Anything a chaperone should know at a competition.", max: 1000 },
    ],
  },
  {
    key: "logistics",
    title: "Logistics",
    roles: NOT_PARENT,
    fields: [
      { key: "shirt_size", table: "profile_logistics", label: "T-shirt size", type: "select", see: "logistics", required: NOT_PARENT, options: opts(SHIRT_SIZES) },
      { key: "transportation", table: "profile_logistics", label: "Transportation", type: "select", see: "logistics", roles: ["student"], options: optsFrom(TRANSPORTATION) },
      { key: "other_commitments", table: "profile_logistics", label: "Other commitments", type: "textarea", see: "logistics", roles: ["student"], hint: "Sports, clubs or jobs that affect when you can come.", max: 600 },
    ],
  },
  {
    key: "consents",
    title: "Consents",
    note: "Only you, your parents and team Leads can see this.",
    roles: NOT_PARENT,
    fields: [
      { key: "parental_permission", table: "profile_consents", label: "A parent or guardian gives permission to join the team", short: "Parental permission", type: "consent", see: "private", roles: ["student"], required: ["student"] },
      { key: "media_consent", table: "profile_consents", label: "Photos and video of this member may be used in team media", short: "Media release", type: "yesno", see: "private", required: NOT_PARENT },
      { key: "contact_ack", table: "profile_consents", label: "The team may use this contact information to reach us about team activities", short: "Contact acknowledgement", type: "consent", see: "private", required: NOT_PARENT },
    ],
  },
  {
    key: "admin",
    title: "Admin records",
    note: "Only Leads can see this.",
    fields: [
      { key: "first_registered", table: "profile_admin", label: "Registered in FIRST Dashboard", type: "checkbox", see: "lead", leadOnly: true, roles: NOT_PARENT },
      { key: "first_consent_done", table: "profile_admin", label: "FIRST consent and release done", type: "checkbox", see: "lead", leadOnly: true, roles: NOT_PARENT },
      { key: "ypp_status", table: "profile_admin", label: "Youth Protection screening", type: "select", see: "lead", leadOnly: true, roles: ADULT, options: optsFrom(YPP_STATUS) },
      { key: "ypp_expires", table: "profile_admin", label: "Screening expires", type: "date", see: "lead", leadOnly: true, roles: ADULT },
      { key: "dues_paid_season", table: "profile_admin", label: "Dues paid for season", type: "number", see: "lead", leadOnly: true, roles: NOT_PARENT, hint: "For example: 2026" },
      { key: "notes", table: "profile_admin", label: "Private notes", type: "textarea", see: "lead", leadOnly: true, max: 2000 },
    ],
  },
];

export function gradYearOptions(now = new Date()) {
  // Season rolls over in August.
  const base = now.getMonth() >= 7 ? now.getFullYear() + 1 : now.getFullYear();
  return Array.from({ length: 7 }, (_, i) => String(base + i - 1)).map((y) => ({ value: y, label: y }));
}

export function gradeFor(gradYear: number | null, now = new Date()): string | null {
  if (!gradYear) return null;
  const seasonEnd = now.getMonth() >= 7 ? now.getFullYear() + 1 : now.getFullYear();
  const grade = 12 - (gradYear - seasonEnd);
  if (grade < 1) return null;
  if (grade > 12) return "Graduated";
  return `${grade}th grade`;
}

export const appliesTo = (roles: Role[] | undefined, role: Role) => !roles || roles.includes(role);

// The role whose fields a profile shows. A parent-only account is "parent".
export function sectionsFor(role: Role): Section[] {
  return SECTIONS.filter((s) => appliesTo(s.roles, role)).map((s) => ({
    ...s,
    title: role === "parent" && s.parentTitle ? s.parentTitle : s.title,
    fields: s.fields.filter((f) => appliesTo(f.roles, role)),
  }));
}

// ---------------------------------------------------------------- access
export interface Viewer {
  id: string;
  isLead: boolean;
  isSelf: boolean;
  isParentOf: boolean;   // the viewer is a linked parent of the subject
  isFamily: boolean;     // the subject is the viewer's parent / child / co-parent
  grants: Grant[];
}

export function grantCovers(grants: Grant[], scope: GrantScope, subjectSubteams: string[]) {
  const today = new Date().toISOString().slice(0, 10);
  return grants.some(
    (g) =>
      g.scope === scope &&
      (!g.expires_on || g.expires_on >= today) &&
      (!g.subteams || g.subteams.length === 0 || g.subteams.some((t) => subjectSubteams.includes(t))),
  );
}

/** Mirrors the SQL read rules so the page knows which sections to show. */
export function canSeeField(
  f: Pick<Field, "see">,
  v: Viewer,
  subject: { isParentAccount: boolean; subteams: string[] },
): boolean {
  if (f.see === "public") return true;
  if (v.isSelf || v.isLead || v.isParentOf) return true;
  if (f.see === "private" || f.see === "lead") return false;
  const scope: GrantScope =
    f.see === "contact" ? (subject.isParentAccount ? "parent_contact" : "student_contact") : f.see;
  if (f.see === "contact" && v.isFamily) return true;
  return grantCovers(v.grants, scope, subject.subteams);
}

export const canEditField = (f: Pick<Field, "leadOnly">, v: Viewer) =>
  v.isLead || (!f.leadOnly && (v.isSelf || v.isParentOf));

export function displayName(p: Pick<ProfileRow, "full_name" | "preferred_name" | "username">) {
  return p.preferred_name?.trim() || p.full_name?.trim() || p.username;
}

// ---------------------------------------------------------------- history
export const SECTION_OF_TABLE: Partial<Record<string, SectionKey>> = {
  profile_birthday: "basics",
  profile_contact: "contact",
  profile_household: "contact",
  profile_health: "emergency",
  profile_logistics: "logistics",
  profile_skills: "team",
  profile_consents: "consents",
  profile_admin: "admin",
  profile_guardians: "guardians",
  guardian_links: "guardians",
};

const PROFILE_FIELD_SECTION: Record<string, SectionKey | "avatar"> = (() => {
  const m: Record<string, SectionKey | "avatar"> = {};
  for (const s of SECTIONS) for (const f of s.fields) if (f.table === "profiles") m[f.key] = s.key;
  for (const k of ["avatar_mode", "avatar_config", "photo_path", "photo_status", "photo_auto_approve"]) m[k] = "avatar";
  return m;
})();

export function sectionOfChange(table: string, fields: string[]): SectionKey | "avatar" | "account" | "grant" {
  if (table === "grant") return "grant";
  if (table === "profiles") {
    for (const f of fields) if (PROFILE_FIELD_SECTION[f]) return PROFILE_FIELD_SECTION[f];
    return "account";
  }
  return SECTION_OF_TABLE[table] ?? "account";
}

const FIELD_LABELS: Record<string, string> = (() => {
  const m: Record<string, string> = {
    month: "birthday month", day: "birthday day", is_public: "birthday visibility",
    avatar_mode: "picture type", avatar_config: "avatar", photo_path: "photo", photo_status: "photo approval",
    photo_auto_approve: "photo auto-approve", parental_permission_at: "parental permission",
    parental_permission_by: "parental permission", media_consent: "media release", media_consent_at: "media release",
    media_consent_by: "media release", contact_ack_at: "contact acknowledgement", contact_ack_by: "contact acknowledgement",
    role: "role", status: "status", lead_title: "Lead title", student_title: "student title", username: "username",
    email: "login email", subteam: "subteam", name: "guardian name", relationship: "relationship", email_: "email",
    parent_id: "linked parent", full_name: "full name",
  };
  for (const s of SECTIONS) for (const f of s.fields) m[f.key] ??= f.label.toLowerCase();
  return m;
})();

export function fieldLabels(fields: string[]): string {
  return Array.from(new Set(fields.map((f) => FIELD_LABELS[f] ?? f.replace(/_/g, " ")))).join(", ");
}

export interface Change {
  id: number;
  subject: string;
  editor: string | null;
  editor_kind: "self" | "parent" | "lead" | "system";
  section: string;
  action: string;
  fields: string[];
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  changed_at: string;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Chicago" });
}

// ---------------------------------------------------------------- display
export function formatValue(f: Field, values: Record<string, unknown>, names: Record<string, string>): string | null {
  const v = values[f.key];
  const by = (k: string) => {
    const id = values[k];
    return typeof id === "string" && names[id] ? ` by ${names[id]}` : "";
  };
  switch (f.type) {
    case "birthday": {
      const b = v as { month: number; day: number; is_public: boolean } | null;
      if (!b) return null;
      return `${MONTHS[b.month - 1]} ${b.day}${b.is_public ? "" : " (private)"}`;
    }
    case "consent":
      return typeof v === "string" ? `Yes, ${formatDate(v)}${by(`${f.key}_by`)}` : null;
    case "yesno": {
      if (v === null || v === undefined) return null;
      const at = values[`${f.key}_at`];
      return `${v ? "Yes" : "No"}${typeof at === "string" ? `, ${formatDate(at)}` : ""}${by(`${f.key}_by`)}`;
    }
    case "checkbox":
      return v ? "Yes" : "No";
    case "multi":
      return Array.isArray(v) && v.length ? v.join(", ") : null;
    case "select": {
      if (v === null || v === undefined || v === "") return null;
      if (f.key === "grad_year") {
        const g = gradeFor(Number(v));
        return g ? `${v} (${g})` : String(v);
      }
      return f.options?.find((o) => o.value === String(v))?.label ?? String(v);
    }
    case "date":
      return typeof v === "string" && v ? formatDate(`${v}T12:00:00Z`) : null;
    default:
      return v === null || v === undefined || v === "" ? null : String(v);
  }
}
