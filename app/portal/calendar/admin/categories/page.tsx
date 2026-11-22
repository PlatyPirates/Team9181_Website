import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { getCalendarContext } from "@/lib/calendar/server";
import CalendarNav from "../../CalendarNav";
import { createCategoryForm, updateCategoryForm } from "../actions";
import { btnCta, btnSmall, card, eyebrow, h1, inputCls, muted } from "../../styles";

export const metadata: Metadata = { title: "Calendar categories" };

export default async function CategoriesPage() {
  const member = await requireMember("/portal/calendar/admin/categories");
  const ctx = await getCalendarContext(member);
  if (!ctx.perms.includes("manage_categories")) redirect("/portal/calendar");
  return (
    <main className="mx-auto max-w-[1200px] px-6 py-10">
      <span className={eyebrow}>CALENDAR ADMIN</span>
      <h1 className={h1}>Categories</h1>
      <p className={`mt-3 max-w-2xl ${muted}`}>
        Rename categories or change their colors any time; events update everywhere. Archiving hides a category from the picker but keeps it on past events.
        Members can still type a one-off custom label on any event.
      </p>
      <CalendarNav active="categories" perms={ctx.perms} />

      <ul className="mt-6 grid gap-2">
        {ctx.categories.map((c) => (
          <li key={c.id} className={`${card} p-3`}>
            <form action={updateCategoryForm} className="flex flex-wrap items-center gap-3">
              <input type="hidden" name="id" value={c.id} />
              <input type="color" name="color" defaultValue={c.color} aria-label={`${c.name} color`} className="h-9 w-12 rounded border border-[color:var(--p-border)]" />
              <input name="name" defaultValue={c.name} maxLength={60} className={`${inputCls} max-w-xs`} aria-label="Name" />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="archived" defaultChecked={c.archived} /> Archived</label>
              {c.is_preset && <span className={`text-xs ${muted}`}>starter category</span>}
              <button className={btnSmall}>Save</button>
            </form>
          </li>
        ))}
      </ul>

      <form action={createCategoryForm} className={`${card} mt-6 flex flex-wrap items-center gap-3 p-4`}>
        <input type="color" name="color" defaultValue="#0f766e" aria-label="New category color" className="h-9 w-12 rounded border border-[color:var(--p-border)]" />
        <input name="name" placeholder="New category name" maxLength={60} required className={`${inputCls} max-w-xs`} />
        <button className={btnCta}>Add category</button>
      </form>
    </main>
  );
}
