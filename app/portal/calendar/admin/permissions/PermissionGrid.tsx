"use client";
import { useMemo, useState, useTransition } from "react";
import { resetToDefaults, setPermission } from "../actions";
import { inputBase, muted } from "../../styles";

export interface GridMember {
  id: string;
  name: string;
  role: string;
  roleSort: number;
  pending: boolean;
  perms: string[];
}

export default function PermissionGrid({
  members, catalog, myId,
}: { members: GridMember[]; catalog: { key: string; label: string; description: string }[]; myId: string }) {
  const [rows, setRows] = useState(() => new Map(members.map((m) => [m.id, new Set(m.perms)])));
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<{ id: string; text: string; bad?: boolean } | null>(null);
  const [, startTransition] = useTransition();

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? members.filter((m) => m.name.toLowerCase().includes(t) || m.role.toLowerCase().includes(t)) : members;
  }, [members, q]);

  const toggle = (userId: string, key: string) => {
    const cur = new Set(rows.get(userId));
    const on = !cur.has(key);
    if (on) cur.add(key);
    else cur.delete(key);
    setRows(new Map(rows).set(userId, cur));
    startTransition(async () => {
      const res = await setPermission(userId, key, on);
      if (res.error) {
        const back = new Set(cur);
        if (on) back.delete(key);
        else back.add(key);
        setRows((r) => new Map(r).set(userId, back));
        setStatus({ id: userId, text: res.error, bad: true });
      } else {
        setStatus({ id: userId, text: "Saved" });
      }
    });
  };

  const reset = (userId: string) => {
    startTransition(async () => {
      const res = await resetToDefaults(userId);
      setStatus(res.error ? { id: userId, text: res.error, bad: true } : { id: userId, text: "Reset to role defaults. Reloading…" });
      if (!res.error) window.location.reload();
    });
  };

  return (
    <div className="mt-6">
      <input className={`${inputBase} max-w-sm`} placeholder="Search by name or role" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search members" />
      <div className="portal-surface mt-4 overflow-x-auto rounded-xl border border-[color:var(--p-border)] bg-[color:var(--p-surface)]">
        <table className="w-full border-collapse text-left text-sm text-[color:var(--p-text)]">
          <thead className="sticky top-0 bg-[color:var(--p-surface)]">
            <tr className="border-b border-[color:var(--p-border-strong)]">
              <th className="sticky left-0 z-10 min-w-[200px] bg-[color:var(--p-surface)] px-3 py-2 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[color:var(--p-accent)]">Member</th>
              {catalog.map((c) => (
                <th key={c.key} className="px-1 py-2 align-bottom" title={c.description}>
                  <span className="block w-[78px] text-center font-mono text-[0.6rem] uppercase leading-tight tracking-[0.08em] text-[color:var(--p-accent)]">{c.label}</span>
                </th>
              ))}
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--p-border)]">
            {shown.map((m) => {
              const set = rows.get(m.id) ?? new Set<string>();
              return (
                <tr key={m.id}>
                  <td className="sticky left-0 z-10 bg-[color:var(--p-surface)] px-3 py-2">
                    <div className="font-semibold">{m.name}{m.id === myId && <span className={`text-xs ${muted}`}> (you)</span>}</div>
                    <div className={`font-mono text-[0.65rem] uppercase tracking-[0.12em] ${muted}`}>{m.role}{m.pending ? " · pending approval" : ""}</div>
                    {status?.id === m.id && (
                      <div className={`text-xs ${status.bad ? "text-[color:var(--p-error-text)]" : muted}`} role="status">{status.text}</div>
                    )}
                  </td>
                  {catalog.map((c) => (
                    <td key={c.key} className="px-1 py-2 text-center">
                      <input
                        type="checkbox"
                        className="size-4 accent-[color:var(--p-cta-bg)]"
                        checked={set.has(c.key)}
                        onChange={() => toggle(m.id, c.key)}
                        aria-label={`${c.label} for ${m.name}`}
                        title={c.description}
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right">
                    <button type="button" className={`whitespace-nowrap text-xs ${muted} underline hover:text-[color:var(--p-accent)]`} onClick={() => reset(m.id)}>
                      Reset to role defaults
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className={`mt-3 text-xs ${muted}`}>Hover a column for what it allows. At least one person always keeps the Permissions box.</p>
    </div>
  );
}
