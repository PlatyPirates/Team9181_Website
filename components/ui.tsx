// Shared building blocks for every page. Styling lives here as Tailwind
// classes, so pages only describe content.
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type WithChildren = { children: ReactNode; className?: string };

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

export function Wrap({ children, className }: WithChildren) {
  return <div className={cx("mx-auto max-w-[1120px] px-6", className)}>{children}</div>;
}

export function Section({ children, alt, className }: WithChildren & { alt?: boolean }) {
  return (
    <section className={cx("py-16", alt && "bg-maroon-deep/5", className)}>
      <Wrap>{children}</Wrap>
    </section>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-burgundy">
      {children}
    </span>
  );
}

export function SectionHead({ eyebrow, title, children }: { eyebrow: ReactNode; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-9 max-w-[62ch]">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2>{title}</h2>
      {children}
    </div>
  );
}

export function RopeDivider() {
  return <div className="bg-rope h-[18px] opacity-70" role="presentation" />;
}

export const heroTagline = "max-w-[46ch] text-[1.15rem] text-charcoal";

/** Title block at the top of every page except Home. */
export function PageHero({ eyebrow, title, children }: { eyebrow: ReactNode; title: ReactNode; children: ReactNode }) {
  return (
    <>
      <section className="relative overflow-hidden pt-[72px] pb-6">
        <Wrap className="max-[860px]:text-center">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1>{title}</h1>
          <p className={heroTagline}>{children}</p>
        </Wrap>
      </section>
      <RopeDivider />
    </>
  );
}

const gridCols = {
  1: "",
  2: "grid-cols-2 max-[600px]:grid-cols-1",
  3: "grid-cols-3 max-[900px]:grid-cols-2 max-[600px]:grid-cols-1",
  4: "grid-cols-4 max-[900px]:grid-cols-2 max-[600px]:grid-cols-1",
};

export function Grid({ cols = 1, children, className }: WithChildren & { cols?: 1 | 2 | 3 | 4 }) {
  return <div className={cx("grid gap-6", gridCols[cols], className)}>{children}</div>;
}

export function Card({ children, className }: WithChildren) {
  return (
    <div className={cx("card-edge relative rounded border border-maroon-deep/12 bg-cream p-6 shadow-card [&_h3]:mb-2", className)}>
      {children}
    </div>
  );
}

export function Role({ children }: { children: ReactNode }) {
  return (
    <span className="mb-2.5 block font-mono text-[0.78rem] uppercase tracking-[0.08em] text-burgundy">
      {children}
    </span>
  );
}

/** A card with the usual role label, heading and blurb. */
export function InfoCard({ role, title, children, photo, footer }: { role: ReactNode; title: ReactNode; children?: ReactNode; photo?: ReactNode; footer?: ReactNode }) {
  return (
    <Card>
      {photo}
      <Role>{role}</Role>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {footer && <div className="mt-4">{footer}</div>}
    </Card>
  );
}

export function PhotoPlaceholder({ label = "Photo", wide }: { label?: string; wide?: boolean }) {
  return (
    <div className={cx(wide ? "aspect-[4/3]" : "aspect-square", "bg-stripes mb-3.5 flex w-full items-center justify-center rounded border border-dashed border-fog text-center font-mono text-[0.72rem] text-fog")}>
      {label}
    </div>
  );
}

const buttonBase = "inline-block cursor-pointer rounded border-2 px-[22px] py-3 font-body text-[0.95rem] font-bold no-underline";
const buttonVariants = {
  primary: "border-maroon-deep bg-burgundy text-cream hover:bg-maroon-deep hover:text-cream",
  ghost: "border-maroon-deep bg-transparent text-maroon-deep hover:bg-maroon-deep hover:text-cream",
};
export type ButtonVariant = keyof typeof buttonVariants;
export const buttonClass = (variant: ButtonVariant = "primary", className?: string) =>
  cx(buttonBase, buttonVariants[variant], className);

/** Button-styled link. Internal paths ("/join") use next/link; anything else is a plain <a>. */
export function ButtonLink({ href, variant = "primary", className, ...rest }: ComponentProps<"a"> & { href: string; variant?: ButtonVariant }) {
  const cls = buttonClass(variant, className);
  if (href.startsWith("/")) return <Link href={href} className={cls} {...rest} />;
  return <a href={href} className={cls} {...rest} />;
}

export function WaxSeal({ num, label }: { num: ReactNode; label: ReactNode }) {
  return (
    <div className="bg-wax-seal mx-auto flex size-32 shrink-0 flex-col items-center justify-center rounded-full text-center font-display font-extrabold text-gold-light shadow-[0_6px_18px_rgba(63,15,26,0.18),inset_0_0_0_3px_rgba(201,162,75,0.55)]">
      <span className="text-[1.9rem] leading-none">{num}</span>
      <span className="mt-1 font-mono text-[0.55rem] uppercase tracking-[0.14em]">{label}</span>
    </div>
  );
}

export const externalLink = { target: "_blank", rel: "noopener" } as const;
