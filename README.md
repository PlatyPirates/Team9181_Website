# Platy Pirates — FRC 9181 Website

A [Next.js](https://nextjs.org) site (App Router, TypeScript, Tailwind CSS v4)
for Team 9181.

```
app/
├── layout.tsx            Shared <head>, header, footer for every page
├── globals.css           Tailwind setup + color/font tokens (@theme)
├── page.tsx              Home            → /
├── team/page.tsx         Meet the Crew   → /team/
├── robots/page.tsx       Robots + log    → /robots/
├── sponsors/page.tsx     Sponsors        → /sponsors/
├── resources/page.tsx    Resources       → /resources/
├── social/page.tsx       Social links    → /social/
└── join/page.tsx         Join / contact  → /join/
components/
├── ui.tsx                Shared pieces: Section, Card, InfoCard, ButtonLink, PageHero...
├── SiteHeader.tsx        Nav bar + mobile menu (edit nav links once, here)
├── SiteFooter.tsx        Footer (edit once, here)
└── JoinForm.tsx          Join form
lib/asset.ts              asset("/x.jpg") adds a base path if one is set
public/                   Mascot SVG, favicon, photos, PDFs
```

## Run it locally

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev        # http://localhost:3000, reloads as you edit
npm run build      # production build
npm run lint       # ESLint
```

## Customize the content

Most pages keep their content in a list at the top of the file, so updating
the site usually means editing a list, not markup:

- **Roster**: `LEADS`, `SUBTEAMS`, `MENTORS` in `app/team/page.tsx`.
- **Robots & log**: `ROBOTS` and `LOG` in `app/robots/page.tsx`.
- **Sponsors**: `TIERS` in `app/sponsors/page.tsx`.
- **Resources**: the `*_DOCS` lists in `app/resources/page.tsx`.
- **Social**: `PLATFORMS` in `app/social/page.tsx`.
- **Nav / footer**: `components/SiteHeader.tsx` and `components/SiteFooter.tsx`.
- **Page titles**: each page exports `metadata` at the top of its file.

### Styling

Styles are Tailwind utility classes written on each element
(`className="mt-4 text-burgundy"`). The team colors and fonts are defined
once in the `@theme` block of `app/globals.css`, so `bg-burgundy`,
`text-gold-light`, `font-display` and so on all come from there. A few
decorative patterns (rope divider, card edge, photo-placeholder stripes, wax
seal) are custom utilities defined in the same file. Repeated building blocks
live in `components/ui.tsx`, so change a card or button style there once.

### Adding photos and files

1. Drop the file into `public/` (e.g. `public/jane.jpg`, or
   `public/docs/handbook.pdf`).
2. Point the matching list entry at it, e.g. `photo: "/jane.jpg"` in
   `app/team/page.tsx`, or `file: "/docs/handbook.pdf"` in
   `app/resources/page.tsx`. Paths are passed through `asset()` so they keep working
   if the site is ever served from a sub-path.

## Connect the Join form (so submissions reach you)

The form currently just shows a thank-you message. The easiest free fix is
**Formspree**:

1. Sign up at [formspree.io](https://formspree.io) and create a form to get
   an endpoint like `https://formspree.io/f/abcdwxyz`.
2. In `components/JoinForm.tsx`, change `<form onSubmit={handleSubmit}>`
   to `<form action="https://formspree.io/f/abcdwxyz" method="POST">`.

## Update social links

Add an `href` to a platform in `PLATFORMS` (`app/social/page.tsx`) to turn its
grayed-out placeholder into a real link, or delete the ones you don't use.
