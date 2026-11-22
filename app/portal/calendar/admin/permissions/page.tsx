import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireMember, roleLabel, type Member } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import { getCalendarContext } from "@/lib/calendar/server";
import CalendarNav from "../../CalendarNav";
import PermissionGrid, { type GridMember } from "./PermissionGrid";
import { eyebrow, h1, muted } from "../../styles";

export const metadata: Metadata = { title: "Calendar permissions" };

export default async function PermissionsPage() {
  const member = await requireMember("/portal/calendar/admin/permissions");
  const ctx = await getCalendarContext(member);
  if (!ctx.perms.includes("manage_permissions")) redirect("/portal/calendar");
  const sb = await createClient();
  const [{ data: people }, { data: grants }, { data: catalog }, { data: links }] = await Promise.all([
    sb.from("profiles").select("id, full_name, username, email, role, lead_title, student_title, status, subteam").neq("status", "disabled").order("full_name"),
    sb.from("calendar_user_permissions").select("user_id, permission"),
    sb.from("calendar_permissions").select("key, label, description, sort").order("sort"),
    sb.from("guardian_links").select("parent_id"),
  ]);
  const parents = new Set((links ?? []).map((l) => l.parent_id as string));
  const byUser = new Map<string, string[]>();
  for (const g of grants ?? []) byUser.set(g.user_id as string, [...(byUser.get(g.user_id as string) ?? []), g.permission as string]);
  const ORDER: Record<string, number> = { lead: 0, mentor: 1, parent: 2, student: 3 };
  const members: GridMember[] = ((people ?? []) as Member[])
    .map((p) => ({
      id: p.id,
      name: p.full_name || p.username,
      role: roleLabel(p) + (parents.has(p.id) && p.role !== "parent" ? " · Parent" : ""),
      roleSort: ORDER[p.role] ?? 9,
      pending: p.status === "pending",
      perms: byUser.get(p.id) ?? [],
    }))
    .sort((a, b) => a.roleSort - b.roleSort || a.name.localeCompare(b.name));

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-10">
      <span className={eyebrow}>CALENDAR ADMIN</span>
      <h1 className={h1}>Calendar permissions</h1>
      <p className={`mt-3 max-w-3xl ${muted}`}>
        Each box is one person&apos;s access, separate from their role. New members start with their role&apos;s defaults when a Lead approves them
        (plus the parent boxes once they&apos;re linked to a student); after that, change anyone here. Boxes save as you click.
      </p>
      <CalendarNav active="permissions" perms={ctx.perms} />
      <PermissionGrid
        members={members}
        catalog={(catalog ?? []).map((c) => ({ key: c.key as string, label: c.label as string, description: c.description as string }))}
        myId={member.id}
      />
    </main>
  );
}
