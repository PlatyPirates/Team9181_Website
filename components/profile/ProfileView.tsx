import Link from "next/link";
import { roleLabel, type Member } from "@/lib/auth";
import {
  canEditField,
  canSeeField,
  displayName,
  fieldLabels,
  formatDate,
  gradeFor,
  scopeLabel,
  sectionOfChange,
  sectionsFor,
  type Change,
  type SectionKey,
} from "@/lib/profile";
import { missingRequired, requiredCount, shownPhotoPath, signPhotos, type LoadedProfile } from "@/lib/profile-server";
import AvatarPanel from "./AvatarPanel";
import GuardiansCard, { type ParentItem } from "./GuardiansCard";
import SectionCard, { type CardField } from "./SectionCard";
import StudentsCard from "./StudentsCard";
import { card, chip, muted } from "./styles";

interface Props {
  me: Member;
  p: LoadedProfile;
  tab: "profile" | "history";
  basePath: string;
  pendingRequests?: { id: string; student_name: string; created_at: string }[];
}

function sectionNote(key: SectionKey, self: boolean, isParentAccount: boolean): string | null {
  const who = self ? "you, your parents" : "this member, their parents";
  switch (key) {
    case "contact":
      return isParentAccount
        ? `Only ${self ? "you, your family" : "this member, their family"}, Leads and people with Parent contact access can see this.`
        : `Phone and email: ${who}, Leads and Student contact access. Address: Address access.`;
    case "emergency":
      return `Only ${who}, Leads and people with Emergency access can see this.`;
    case "logistics":
      return `Only ${who}, Leads and people with Logistics access can see this.`;
    case "consents":
      return `Only ${who} and Leads can see this.`;
    case "admin":
      return "Only Leads can see this.";
    case "guardians":
      return "Names are visible to the team. Contact details need Parent contact access.";
    default:
      return null;
  }
}

function editTags(changes: Change[], subjectId: string, names: Record<string, string>): Partial<Record<string, string>> {
  const tags: Partial<Record<string, string>> = {};
  const seen = new Set<string>();
  for (const c of changes) {
    const key = sectionOfChange(c.section, c.fields);
    if (seen.has(key)) continue;
    seen.add(key);
    if (c.editor && c.editor !== subjectId && (c.editor_kind === "lead" || c.editor_kind === "parent")) {
      const who = `${c.editor_kind === "parent" ? "parent" : "Lead"} ${names[c.editor] ?? ""}`.trim();
      tags[key] = `${c.action === "added" ? "Added" : "Edited"} by ${who}, ${formatDate(c.changed_at)}`;
    }
  }
  return tags;
}

export default async function ProfileView({ me, p, tab, basePath, pendingRequests }: Props) {
  const { subject, viewer, values, names } = p;
  const role = subject.role;
  const canEditAny = viewer.isSelf || viewer.isLead || viewer.isParentOf;
  const canSeeHistory = canEditAny;
  const subjectCtx = { isParentAccount: p.isParentAccount, subteams: subject.subteams ?? [] };
  const missing = canEditAny ? missingRequired(p) : [];
  const total = requiredCount(role);
  const pct = total ? Math.round(((total - missing.length) / total) * 100) : 100;
  const tags = editTags(p.changes, subject.id, names);
  const grade = role === "student" ? gradeFor(subject.grad_year) : null;

  // Pictures for linked parents / students.
  const related = [...p.parents.map((x) => x.card), ...p.students];
  const signed = await signPhotos(related.map((c) => shownPhotoPath(c) ?? ""));
  const parentItems: ParentItem[] = p.parents.map((x) => ({
    id: x.card.id,
    username: x.card.username,
    name: displayName(x.card),
    avatar: x.card.avatar_config,
    photoUrl: shownPhotoPath(x.card) ? signed[shownPhotoPath(x.card)!] ?? null : null,
    phone: x.phone,
    email: x.email,
    employer: x.employer,
  }));

  const sections = sectionsFor(role).filter((s) => s.key !== "admin" || viewer.isLead);
  const parentContactVisible =
    viewer.isSelf || viewer.isLead || viewer.isFamily ||
    canSeeField({ see: "contact" }, viewer, { isParentAccount: true, subteams: subject.subteams ?? [] });
  const employerVisible = viewer.isSelf || viewer.isLead || viewer.isFamily || canSeeField({ see: "address" }, viewer, subjectCtx);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`${card} flex flex-col gap-6 p-6 sm:flex-row sm:items-start`}>
        <AvatarPanel
          subjectId={subject.id}
          name={displayName(subject)}
          avatar={subject.avatar_config}
          mode={subject.avatar_mode}
          photoStatus={subject.photo_status}
          photoUrl={p.photoUrl}
          pendingPhotoUrl={p.pendingPhotoUrl}
          canEdit={canEditAny}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`${chip} bg-[color:var(--p-chip-bg)] text-[color:var(--p-chip-text)]`}>{roleLabel(subject)}</span>
            {p.isParentAccount && role !== "parent" ? (
              <span className={`${chip} bg-[color:var(--p-chip-bg)] text-[color:var(--p-chip-text)]`}>Parent</span>
            ) : null}
            {(subject.subteams ?? []).map((t) => (
              <span key={t} className={`${chip} border border-[color:var(--p-border)] text-[color:var(--p-text-muted)]`}>{t}</span>
            ))}
          </div>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-[color:var(--p-text)] sm:text-4xl">{subject.full_name || subject.username}</h1>
          <p className={`mt-1 text-sm ${muted}`}>
            @{subject.username}
            {subject.preferred_name ? ` · goes by ${subject.preferred_name}` : ""}
            {subject.pronunciation ? ` · says it “${subject.pronunciation}”` : ""}
            {grade ? ` · ${grade}` : ""}
          </p>
          {subject.bio ? <p className="mt-3 max-w-2xl whitespace-pre-line text-[color:var(--p-text)]">{subject.bio}</p> : null}

          {canEditAny && total > 0 ? (
            <div className="mt-4 max-w-md">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono uppercase tracking-[0.14em] text-[color:var(--p-accent)]">Profile {pct}% complete</span>
                {missing.length ? <span className={muted}>{missing.length} to go</span> : null}
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-[color:var(--p-hint-bg)]">
                <div className="h-full rounded-full bg-[color:var(--p-cta-bg)]" style={{ width: `${pct}%` }} />
              </div>
              {missing.length ? <p className={`mt-1.5 text-xs ${muted}`}>Still needed: {missing.join(", ")}.</p> : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* Tabs */}
      {canSeeHistory ? (
        <nav className="flex gap-1 border-b border-[color:var(--p-border)]" aria-label="Profile tabs">
          {(["profile", "history"] as const).map((t) => (
            <Link
              key={t}
              href={t === "profile" ? basePath : `${basePath}?tab=history`}
              aria-current={tab === t ? "page" : undefined}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${
                tab === t ? "border-[color:var(--p-accent)] text-[color:var(--p-text)]" : `border-transparent ${muted} hover:text-[color:var(--p-text)]`
              }`}
            >
              {t === "profile" ? "Profile" : "History"}
            </Link>
          ))}
        </nav>
      ) : null}

      {tab === "history" && canSeeHistory ? (
        <History changes={p.changes} names={names} subjectId={subject.id} showValues={viewer.isLead} />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {sections.map((s) => {
            if (s.key === "guardians") {
              return (
                <GuardiansCard
                  key="guardians"
                  subjectId={subject.id}
                  parents={parentItems}
                  guardians={p.guardians}
                  canEdit={canEditAny}
                  showContact={parentContactVisible}
                  showEmployer={employerVisible}
                  note={sectionNote("guardians", viewer.isSelf, false)!}
                  tag={tags.guardians}
                  missing={missing.includes("A parent or guardian")}
                />
              );
            }
            const fields: CardField[] = s.fields
              .filter((f) => canSeeField(f, viewer, subjectCtx))
              .filter((f) => f.type !== "birthday" || values.birthday || canEditAny)
              .map((f) => ({ ...f, editable: canEditField(f, viewer) }));
            if (fields.length === 0) return null;
            const note = s.key === "team" && fields.some((f) => f.key === "skills")
              ? "Skills are visible only to this member, their parents and Leads."
              : sectionNote(s.key, viewer.isSelf, p.isParentAccount);
            return (
              <SectionCard
                key={s.key}
                subjectId={subject.id}
                sectionKey={s.key}
                title={s.title}
                note={note}
                tag={tags[s.key]}
                fields={fields}
                values={values}
                names={names}
                missing={missing}
              />
            );
          })}

          {p.isParentAccount || role === "parent" || viewer.isSelf ? (
            <StudentsCard
              students={p.students.map((c) => ({
                id: c.id,
                username: c.username,
                name: displayName(c),
                avatar: c.avatar_config,
                photoUrl: shownPhotoPath(c) ? signed[shownPhotoPath(c)!] ?? null : null,
                detail: [roleLabel(c), gradeFor(c.grad_year), ...(c.subteams ?? [])].filter(Boolean).join(" · "),
              }))}
              requests={viewer.isSelf ? pendingRequests ?? [] : []}
              isSelf={viewer.isSelf}
              collapsed={!p.isParentAccount && role !== "parent"}
            />
          ) : null}

          {viewer.isLead && !viewer.isSelf ? <LeadGrantsNote me={me} subjectRole={role} /> : null}
        </div>
      )}
    </div>
  );
}

function LeadGrantsNote({ subjectRole }: { me: Member; subjectRole: string }) {
  if (subjectRole === "parent") return null;
  return (
    <p className={`text-xs ${muted} lg:col-span-2`}>
      Edits you make here are tagged with your name and recorded in History. Manage access grants and photo approvals on the{" "}
      <Link href="/portal/admin#access" className="underline">Admin page</Link>.
    </p>
  );
}

function short(v: unknown): string {
  if (v === null || v === undefined || v === "") return "empty";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "empty";
  if (typeof v === "object") return "updated";
  const s = String(v);
  return s.length > 60 ? `${s.slice(0, 57)}…` : s;
}

function History({ changes, names, subjectId, showValues }: { changes: Change[]; names: Record<string, string>; subjectId: string; showValues: boolean }) {
  if (changes.length === 0) {
    return <p className={`rounded border border-dashed border-[color:var(--p-border-strong)] p-6 text-center ${muted}`}>No changes recorded yet.</p>;
  }
  const kindLabel: Record<Change["editor_kind"], string> = { self: "", parent: "Parent", lead: "Lead", system: "System" };
  const verb: Record<string, string> = {
    added: "added", edited: "changed", cleared: "removed", granted: "was given", revoked: "lost",
    approved: "approved", rejected: "rejected",
  };
  return (
    <ol className={`${card} divide-y divide-[color:var(--p-border)]`}>
      {changes.map((c) => {
        const who = c.editor ? names[c.editor] ?? "Someone" : "The system";
        const tag = c.editor === subjectId ? "" : kindLabel[c.editor_kind];
        const what =
          c.section === "grant"
            ? `${verb[c.action]} ${scopeLabel(String(c.fields[0]))} access`
            : c.section === "guardian_links"
              ? c.action === "added" ? "linked a parent account" : "unlinked a parent account"
              : c.action === "approved" || c.action === "rejected"
                ? `${verb[c.action]} the photo`
                : `${verb[c.action] ?? c.action} ${fieldLabels(c.fields)}`;
        return (
          <li key={c.id} className="flex flex-col gap-1 p-4 text-sm sm:flex-row sm:items-start sm:gap-4">
            <time className={`w-28 shrink-0 font-mono text-xs ${muted}`} dateTime={c.changed_at}>{formatDate(c.changed_at)}</time>
            <div className="min-w-0">
              <div>
                <span className="font-semibold text-[color:var(--p-text)]">{who}</span>
                {tag ? <span className="ml-1.5 rounded-full bg-[color:var(--p-hint-bg)] px-1.5 py-0.5 text-[0.65rem] text-[color:var(--p-text-muted)]">{tag}</span> : null}{" "}
                <span className="text-[color:var(--p-text)]">{what}</span>
              </div>
              {showValues && c.section !== "grant" && c.section !== "guardian_links" && c.new_values ? (
                <ul className={`mt-1 space-y-0.5 text-xs ${muted}`}>
                  {c.fields
                    .filter((f) => !f.endsWith("_by") && f !== "avatar_config")
                    .map((f) => (
                      <li key={f}>
                        {fieldLabels([f])}: {short(c.old_values?.[f])} → {short(c.new_values?.[f])}
                      </li>
                    ))}
                </ul>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
