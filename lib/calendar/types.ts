// Shared calendar types and constants. Safe to import from client components.

export const CAL_TZ = "America/Chicago";

export const CAL_PERMISSIONS = [
  "create_personal",
  "create_for_student",
  "request_team_event",
  "create_team_event",
  "mark_public",
  "approve_requests",
  "edit_any_event",
  "delete_any_event",
  "manage_categories",
  "manage_groups",
  "moderate_comments",
  "manage_permissions",
] as const;
export type CalendarPermission = (typeof CAL_PERMISSIONS)[number];

export type EventStatus = "approved" | "pending" | "rejected";
export type RsvpResponse = "yes" | "no" | "maybe";
export type GroupKind = "members" | "all_members" | "public";

export interface CalendarGroup {
  id: string;
  slug: string;
  name: string;
  kind: GroupKind;
  auto_rule: string | null;
  is_preset: boolean;
  sort: number;
}

export interface CalendarCategory {
  id: string;
  name: string;
  color: string;
  is_preset: boolean;
  archived: boolean;
  sort: number;
}

export interface CalendarEventRow {
  id: string;
  title: string;
  description: string | null;
  notes: string | null;
  custom_label: string | null;
  location: string | null;
  link_url: string | null;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  rrule: string | null;
  rrule_until: string | null;
  category_id: string | null;
  tags: string[];
  is_private: boolean;
  created_by: string | null;
  updated_by: string | null;
  on_behalf_of: string | null;
  status: EventStatus;
  reviewed_by: string | null;
  review_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExceptionRow {
  event_id: string;
  original_start: string;
  kind: "cancelled" | "modified";
  starts_at: string | null;
  ends_at: string | null;
  title: string | null;
  location: string | null;
  description: string | null;
  notes: string | null;
}

/** One concrete occurrence of an event, after recurrence + exceptions. */
export interface Occurrence {
  eventId: string;
  /** '' for one-off events, else the occurrence's original start (ISO, UTC). */
  occurrence: string;
  title: string;
  start: string; // ISO UTC
  end: string; // ISO UTC
  allDay: boolean;
  location: string | null;
  description: string | null;
  notes: string | null;
  modified: boolean;
}

/** What the portal grid needs per occurrence. */
export interface GridEvent extends Occurrence {
  recurring: boolean;
  status: EventStatus;
  isPrivate: boolean;
  categoryId: string | null;
  customLabel: string | null;
  color: string;
  groupIds: string[];
  tags: string[];
  createdBy: string | null;
  onBehalfOf: string | null;
  myRsvp: RsvpResponse | null;
}

export interface Recurrence {
  freq: "none" | "daily" | "weekly" | "monthly";
  interval: number;
  byDay: string[]; // MO TU WE TH FR SA SU (weekly)
  monthlyMode: "date" | "nth";
  endType: "never" | "until" | "count";
  until: string; // yyyy-MM-dd (Central)
  count: number;
}

export const EMPTY_RECURRENCE: Recurrence = {
  freq: "none",
  interval: 1,
  byDay: [],
  monthlyMode: "date",
  endType: "never",
  until: "",
  count: 10,
};

export type EditScope = "this" | "following" | "all";

/** Everything the event form submits. Dates/times are Central wall time. */
export interface EventInput {
  id?: string;
  scope?: EditScope;
  occurrence?: string;
  title: string;
  description: string;
  notes: string;
  customLabel: string;
  location: string;
  linkUrl: string;
  allDay: boolean;
  startDate: string; // yyyy-MM-dd
  startTime: string; // HH:mm
  endDate: string;
  endTime: string;
  categoryId: string | null;
  tags: string[];
  mode: "personal" | "team";
  forStudent: string | null;
  groupIds: string[];
  makePublic: boolean;
  recurrence: Recurrence;
}

export interface MiniMember {
  id: string;
  full_name: string;
  username: string;
}

/** Context the portal calendar page hands to its client components. */
export interface CalendarContext {
  me: MiniMember & { role: string };
  perms: CalendarPermission[];
  students: MiniMember[]; // students I'm a parent of
  groups: CalendarGroup[];
  myGroupIds: string[]; // groups I (or my students) are in
  categories: CalendarCategory[];
  hiddenGroups: string[];
  showLocalTz: boolean;
  /** What this member sees: their own choice, else the team default. */
  eventStyle: "tint" | "solid";
  /** Their own choice (null = follow the team default). */
  myEventStyle: "tint" | "solid" | null;
  teamEventStyle: "tint" | "solid";
  calSize: CalSize;
}

export const DEFAULT_COLOR = "#6b1e2a";
export const PRIVATE_COLOR = "#64748b";
export const LABEL_COLOR = "#475569";

export const RSVP_LABEL: Record<RsvpResponse, string> = { yes: "Going", maybe: "Maybe", no: "Can't go" };

/**
 * The "my groups" filter. An event stays visible if it has no groups (personal),
 * it's mine (or my student's), or at least one of its groups is a group I'm in
 * that I haven't switched off.
 */
export function passesGroupFilter(
  eventGroupIds: string[],
  myGroupIds: Set<string>,
  hidden: Set<string>,
  isMine: boolean,
): boolean {
  if (isMine || eventGroupIds.length === 0) return true;
  return eventGroupIds.some((g) => myGroupIds.has(g) && !hidden.has(g));
}

// Event box looks (see components/CalendarEventBox.tsx and app/globals.css).
export type EventStyle = "tint" | "solid";
export const EVENT_STYLES: { value: EventStyle; label: string; hint: string }[] = [
  { value: "tint", label: "Tint", hint: "light wash of the category color, colored left edge, dark text" },
  { value: "solid", label: "Solid", hint: "filled bar in the category color, white text" },
];
export const DEFAULT_EVENT_STYLE: EventStyle = "tint";
export const asEventStyle = (v: unknown): EventStyle | null => (v === "tint" || v === "solid" ? v : null);


// Calendar size on the portal page (styled by .cal-size-* in app/globals.css).
export type CalSize = "compact" | "default" | "large";
export const CAL_SIZES: { value: CalSize; label: string }[] = [
  { value: "compact", label: "Compact" },
  { value: "default", label: "Default" },
  { value: "large", label: "Large" },
];
export const asCalSize = (v: unknown): CalSize => (v === "compact" || v === "large" ? v : "default");
