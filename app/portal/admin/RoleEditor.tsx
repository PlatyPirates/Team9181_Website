"use client";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LEGACY_LEAD_TITLES, ROLE_FLAGS, ROLE_TREE, type RoleKey } from "@/lib/roles";
import { setRole, type RoleState } from "./actions";

const selectCls =
  "rounded border border-[color:var(--p-border)] bg-[color:var(--p-input-bg)] px-2 py-1 text-[color:var(--p-text)]";
const btnSmall =
  "rounded border border-[color:var(--p-border-strong)] px-2 py-1 text-xs text-[color:var(--p-accent)] hover:bg-[color:var(--p-cta-bg)] hover:text-[color:var(--p-cta-text)] disabled:opacity-60";

interface Props {
  id: string;
  role: RoleKey;
  lead_title: string | null;
  student_title: string | null;
  mentor_title: string | null;
  has_student: boolean | null;
  is_team_admin: boolean | null;
  is_alumni: boolean | null;
}

/** The checkbox currently stored for this member (Team Admin for Leads, Alumni for Mentors). */
function currentFlag(p: Props): boolean {
  if (p.role === "lead") return !!p.is_team_admin;
  if (p.role === "mentor") return !!p.is_alumni;
  return false;
}

/** The sub-role currently stored for this member, as the second dropdown's value. */
function currentSub(p: Props): string {
  switch (p.role) {
    case "lead": return p.lead_title ?? "";
    case "student": return p.student_title ?? "";
    case "mentor": return p.mentor_title ?? "";
    case "parent": return p.has_student === false ? "no" : "yes";
  }
}

/** Default sub-role when switching to a role: the first option ("Member", "Mentor", "Lead", "Yes"). */
function defaultSub(role: RoleKey): string {
  return ROLE_TREE.find((r) => r.value === role)?.options[0]?.value ?? "";
}

export default function RoleEditor(props: Props) {
  const router = useRouter();
  const savedRole = props.role;
  const savedSub = currentSub(props);
  const [role, setRoleValue] = useState<RoleKey>(savedRole);
  const [sub, setSub] = useState<string>(savedSub);
  const savedFlag = currentFlag(props);
  const [flag, setFlag] = useState<boolean>(savedFlag);
  const [state, action, pending] = useActionState<RoleState, FormData>(setRole, {});

  // Re-sync with the server's values after a save (or anyone else's change).
  const savedKey = `${savedRole}|${savedSub}|${savedFlag}`;
  const [syncedKey, setSyncedKey] = useState(savedKey);
  if (syncedKey !== savedKey) {
    setSyncedKey(savedKey);
    setRoleValue(savedRole);
    setSub(savedSub);
    setFlag(savedFlag);
  }

  // After a successful save, re-fetch the table so every column shows the stored value.
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, state.at, router]);

  const entry = ROLE_TREE.find((r) => r.value === role) ?? ROLE_TREE[0];
  // Keep an old lead title visible (and selected) until it's changed.
  const legacy =
    role === "lead" && savedRole === "lead"
      ? LEGACY_LEAD_TITLES.filter((o) => o.value === props.lead_title)
      : [];
  const options = [...entry.options, ...legacy];
  const flagDef = ROLE_FLAGS[role];
  const dirty = role !== savedRole || sub !== savedSub || (!!flagDef && flag !== savedFlag);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={props.id} />
      <select
        name="role"
        value={role}
        aria-label="Role"
        onChange={(e) => {
          const next = e.target.value as RoleKey;
          setRoleValue(next);
          setSub(next === savedRole ? savedSub : defaultSub(next));
          setFlag(next === savedRole ? savedFlag : false);
        }}
        className={selectCls}
      >
        {ROLE_TREE.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>
      <select
        name="sub"
        value={sub}
        aria-label={entry.subLabel}
        title={entry.subLabel}
        onChange={(e) => setSub(e.target.value)}
        className={selectCls}
      >
        {options.map((o) => (
          <option key={o.value || "default"} value={o.value}>{o.label}</option>
        ))}
      </select>
      {flagDef ? (
        <label className="flex items-center gap-1 text-xs text-[color:var(--p-text)]" title={flagDef.hint}>
          <input type="checkbox" name="flag" checked={flag} onChange={(e) => setFlag(e.target.checked)} />
          {flagDef.label}
        </label>
      ) : null}
      <button className={btnSmall} disabled={pending || !dirty}>
        {pending ? "Saving…" : "Save"}
      </button>
      {state.error ? (
        <span className="text-xs text-[color:var(--p-error-text)]">{state.error}</span>
      ) : state.ok && !dirty && !pending ? (
        <span className="text-xs text-[color:var(--p-text-muted)]">Saved ✓</span>
      ) : null}
    </form>
  );
}
