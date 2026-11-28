import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import NativeJoinForm from "@/components/NativeJoinForm";
import { Card, PageHero, Section } from "@/components/ui";
import { KINDS, isKind } from "@/lib/recruiting";
import { FORM_SPECS } from "@/lib/recruiting-forms";

export function generateStaticParams() {
  return KINDS.map((kind) => ({ kind }));
}

export async function generateMetadata({ params }: { params: Promise<{ kind: string }> }): Promise<Metadata> {
  const { kind } = await params;
  if (!isKind(kind)) return {};
  return { title: FORM_SPECS[kind].title, description: FORM_SPECS[kind].intro };
}

// The page reads the URL (which form), so under Cache Components that read sits inside
// Suspense. With generateStaticParams above, every form is still prerendered in full.
export default function JoinKindPage({ params }: { params: Promise<{ kind: string }> }) {
  return (
    <Suspense fallback={null}>
      <JoinKind params={params} />
    </Suspense>
  );
}

async function JoinKind({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!isKind(kind)) notFound();
  const spec = FORM_SPECS[kind];
  return (
    <>
      <PageHero eyebrow={spec.eyebrow} title={spec.title}>
        {spec.intro}
      </PageHero>
      <Section>
        <div className="mx-auto max-w-[640px]">
          {spec.about && (
            <div className="mb-6 space-y-4 text-[1rem] leading-relaxed">
              {spec.about.map((b, i) => (
                <div key={i}>
                  {b.heading && <h2 className="mb-1 text-[1.25rem]">{b.heading}</h2>}
                  <p className="m-0">{b.text}</p>
                </div>
              ))}
            </div>
          )}
          <Card>
            <NativeJoinForm kind={kind} spec={spec} />
          </Card>
          <p className="mt-5 text-center text-[0.9rem]">
            <Link href="/join">← Back to Join Us</Link>
          </p>
        </div>
      </Section>
    </>
  );
}
