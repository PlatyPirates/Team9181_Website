// Role tree used by the admin role editor (and role labels elsewhere).
// Pick a top-level role, then one sub-role from that role's list.
// To add a sub-role, add a { value, label } line to the right list below.
// `value` is what's stored in the database; `label` is what people see.
// An empty value ("") means the default for that role and is stored as null.

export type RoleKey = "student" | "mentor" | "lead" | "parent";

export interface SubRoleOption {
  value: string;
  label: string;
}

export interface RoleTreeEntry {
  value: RoleKey;
  label: string;
  /** Label for the second dropdown. */
  subLabel: string;
  /** Which form field / column the second dropdown writes to. */
  field: "student_title" | "mentor_title" | "lead_title" | "has_student";
  options: SubRoleOption[];
}

export const STUDENT_TITLES: SubRoleOption[] = [
  { value: "", label: "Member" },
  { value: "subteam_lead", label: "Sub-Team Lead" },
  { value: "team_captain", label: "Team Captain" },
];

export const MENTOR_TITLES: SubRoleOption[] = [
  { value: "", label: "Mentor" },
  { value: "programming", label: "Programming" },
  { value: "mechanical", label: "Mechanical" },
  { value: "build", label: "Build" },
  { value: "business", label: "Business" },
  { value: "media", label: "Media" },
  { value: "drive_team", label: "Drive Team" },
];

export const LEAD_TITLES: SubRoleOption[] = [
  { value: "", label: "Lead" },
  { value: "lead_coach_1", label: "Lead Coach 1" },
  { value: "lead_coach_2", label: "Lead Coach 2" },
  { value: "finance", label: "Finance" },
];

/** Lead titles from before the role tree. Shown only on accounts that still have one.
 *  (The old "team_admin" title is now the separate Team Admin checkbox, is_team_admin.) */
export const LEGACY_LEAD_TITLES: SubRoleOption[] = [
  { value: "coach", label: "Coach (old title)" },
];

/** Extra checkbox per role, held on top of the sub-role. */
export const ROLE_FLAGS: Partial<Record<RoleKey, { field: "is_team_admin" | "is_alumni"; label: string; hint: string }>> = {
  lead: { field: "is_team_admin", label: "Team Admin", hint: "Superuser: full access to everything" },
  mentor: { field: "is_alumni", label: "Alumni", hint: "Team alum, shown as a tag" },
};

export const PARENT_OPTIONS: SubRoleOption[] = [
  { value: "yes", label: "Yes, has a student" },
  { value: "no", label: "No student" },
];

export const ROLE_TREE: RoleTreeEntry[] = [
  { value: "student", label: "Student", subLabel: "Level", field: "student_title", options: STUDENT_TITLES },
  { value: "mentor", label: "Mentor", subLabel: "Area", field: "mentor_title", options: MENTOR_TITLES },
  { value: "lead", label: "Lead", subLabel: "Title", field: "lead_title", options: LEAD_TITLES },
  { value: "parent", label: "Parent only / Volunteer", subLabel: "Has a student?", field: "has_student", options: PARENT_OPTIONS },
];

export function isValidSubRole(list: SubRoleOption[], value: string): boolean {
  return list.some((o) => o.value === value);
}

function labelFrom(list: SubRoleOption[], value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  return list.find((o) => o.value === value)?.label;
}

/** Display label for a member, e.g. "Lead Coach 1", "Programming Mentor", "Team Captain". */
export function roleTreeLabel(m: {
  role: string;
  lead_title?: string | null;
  student_title?: string | null;
  mentor_title?: string | null;
  is_team_admin?: boolean | null;
  is_alumni?: boolean | null;
}): string {
  if (m.role === "lead") {
    const t = labelFrom(LEAD_TITLES, m.lead_title) ?? labelFrom(LEGACY_LEAD_TITLES, m.lead_title)?.replace(" (old title)", "");
    if (m.is_team_admin) return t ? `${t} · Team Admin` : "Team Admin";
    return t ?? "Lead";
  }
  if (m.role === "mentor") {
    const t = labelFrom(MENTOR_TITLES, m.mentor_title);
    const base = t ? `${t} Mentor` : "Mentor";
    return m.is_alumni ? `${base} · Alumni` : base;
  }
  if (m.role === "parent") return "Parent";
  return labelFrom(STUDENT_TITLES, m.student_title) ?? "Student";
}
