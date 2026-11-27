import type { Metadata } from "next";
import { Suspense } from "react";
import { requireMember, type Member } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import { loadProfile } from "@/lib/profile-server";
import ProfileView from "@/components/profile/ProfileView";
import AlertsForm, { type Prefs } from "./AlertsForm";

export const metadata: Metadata = { title: "Profile" };

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const me = await requireMember("/portal/profile");
  const tab = (await searchParams).tab === "history" ? "history" : "profile";
  return (
    <main className="mx-auto max-w-[1200px] px-6 py-10">
      <Suspense fallback={<p className="text-[color:var(--p-text-muted)]">Loading your profile…</p>}>
        <MyProfile me={me} tab={tab} />
      </Suspense>

      {me.role === "lead" && tab === "profile" && (
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

async function MyProfile({ me, tab }: { me: Member; tab: "profile" | "history" }) {
  const sb = await createClient();
  const [loaded, { data: requests }] = await Promise.all([
    loadProfile(me, me.id),
    sb
      .from("guardian_link_requests")
      .select("id, student_name, created_at")
      .eq("parent_id", me.id)
      .eq("status", "pending")
      .order("created_at"),
  ]);
  if (!loaded) return <p className="text-[color:var(--p-text-muted)]">We couldn&apos;t load your profile.</p>;
  return <ProfileView me={me} p={loaded} tab={tab} basePath="/portal/profile" pendingRequests={requests ?? []} />;
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
