import type { Metadata } from "next";
import { Suspense } from "react";
import { requireMember, type Member } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import AlertsForm, { type Prefs } from "./AlertsForm";

export const metadata: Metadata = { title: "Profile" };

export default async function Page() {
  const me = await requireMember("/portal/profile");
  return (
    <main className="mx-auto max-w-[1200px] px-6 py-10">
      <span className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-[color:var(--p-accent)]">COMING SOON</span>
      <h1 className="mt-1 font-display text-4xl font-extrabold text-[color:var(--p-text)]">Profile</h1>
      <p className="mt-3 max-w-xl text-[color:var(--p-text-muted)]">Your name, contact info, subteam, and account settings will live here.</p>

      {me.role === "lead" && (
        <section id="alerts" className="mt-10 scroll-mt-24">
          <h2 className="mb-2 font-display text-2xl font-extrabold text-[color:var(--p-text)]">Join Us alerts</h2>
          <p className="mb-4 max-w-2xl text-[color:var(--p-text-muted)]">
            Get notified when someone fills out a Join Us form. Every submission also shows up in the Recruiting app,
            whether or not you turn alerts on.
          </p>
          <Suspense fallback={<p className="text-[color:var(--p-text-muted)]">Loading…</p>}>
            <Alerts me={me} />
          </Suspense>
        </section>
      )}

      <a href="/portal" className="mt-10 inline-block font-mono text-xs uppercase tracking-[0.14em] text-[color:var(--p-accent)] hover:text-[color:var(--p-accent-strong)]">
        ← Back to portal
      </a>
    </main>
  );
}

async function Alerts({ me }: { me: Member }) {
  const sb = await createClient();
  const { data } = await sb
    .from("notification_prefs")
    .select("email_alerts, ntfy_enabled, ntfy_topic, kinds")
    .eq("user_id", me.id)
    .maybeSingle();
  const prefs: Prefs = (data as Prefs | null) ?? {
    email_alerts: true,
    ntfy_enabled: false,
    ntfy_topic: null,
    kinds: ["student", "mentor", "sponsor"],
  };
  const suggestedTopic = `platypirates-${me.username.replace(/[^a-z0-9_-]/gi, "")}-${crypto.randomUUID().slice(0, 8)}`;
  return <AlertsForm prefs={prefs} suggestedTopic={suggestedTopic} />;
}
