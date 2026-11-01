# Platy Pirates — FRC 9181 Website

A plain HTML/CSS/JS site (no build tools, no npm needed) for Team 9181, built
to host for free on **GitHub Pages**.

```
platypirates-site/
├── index.html          Home
├── team.html            Meet the Crew (roster)
├── robots.html          Robot gallery + season log
├── sponsors.html        Sponsors
├── resources.html       Build guides / scouting docs / sponsor packet
├── social.html          Social links
├── join.html            Join / contact form
├── css/style.css        All styling (colors, fonts, layout)
├── js/main.js           Mobile menu + join-form behavior
└── assets/              Mascot SVG, favicon, (add your own photos/PDFs here)
```

---

## 1. Put this on GitHub

You'll need a free [GitHub](https://github.com) account.

1. On github.com, click **+ → New repository**.
2. Name it `platypirates-site` (or anything) — **note the name**, you'll need it.
   - If you want the site at `https://<your-username>.github.io` exactly
     (no extra path), name the repo `<your-username>.github.io` instead.
3. Make it **Public**, don't add a README (you already have one), click
   **Create repository**.
4. On the empty repo's page, click **uploading an existing file**, drag in
   every file/folder from this project (keep the folder structure — `css/`,
   `js/`, `assets/` must stay as folders), and click **Commit changes**.

   *(Prefer the command line? See section 5 below.)*

## 2. Turn on GitHub Pages

1. In your repo, go to **Settings → Pages** (left sidebar).
2. Under **Build and deployment → Source**, choose **Deploy from a branch**.
3. Under **Branch**, choose `main` and folder `/ (root)`, click **Save**.
4. Wait about a minute, then refresh — GitHub shows your live URL, usually:
   `https://<your-username>.github.io/platypirates-site/`

That's it — the site is live. Every time you edit a file and commit, it
redeploys automatically in a minute or two.

## 3. Customize the content

Everything is plain HTML — open any `.html` file in a text editor (VS Code,
or even GitHub's own web editor: press `.` on the repo page to open a
browser-based editor).

- **Roster (`team.html`)**: duplicate a `.card` block, replace the name/role/
  bio. Each card has a dashed "Photo" placeholder — see below to swap in a
  real photo.
- **Robots & log (`robots.html`)**: same pattern — duplicate a `.card` for
  each robot, duplicate a `.log-entry` for each event.
- **Sponsors (`sponsors.html`)**: duplicate a `.sponsor-logo-slot`.
- **Resources (`resources.html`)**: each row is a `.resource-item` — see
  section 4 to link real files.
- **Colors/fonts**: edit the `:root { ... }` block at the top of
  `css/style.css` — every color and font on the site is defined there once.

### Adding real photos

1. Drop image files into `assets/` (e.g. `assets/team-photo-jane.jpg`).
2. Replace a placeholder like:
   ```html
   <div class="avatar-placeholder">Photo</div>
   ```
   with:
   ```html
   <img src="assets/team-photo-jane.jpg" alt="Jane, Build Lead" style="width:100%; border-radius:4px; margin-bottom:14px;">
   ```

## 4. Add PDFs to the Resources page

1. Create a folder `assets/docs/` and drop your PDFs in there (e.g.
   `assets/docs/new-member-handbook.pdf`).
2. In `resources.html`, find the matching `<a class="btn btn-ghost" href="#">Download</a>`
   and change `href="#"` to `href="assets/docs/new-member-handbook.pdf"`.

## 5. Connect the Join form (so submissions reach you)

The form on `join.html` currently just shows a thank-you message locally —
GitHub Pages can't run server code, so it can't email anyone by default.
The easiest free fix is **Formspree** (no backend/account setup beyond a
free account):

1. Sign up free at [formspree.io](https://formspree.io) and create a new
   form — it gives you an endpoint like
   `https://formspree.io/f/abcdwxyz`.
2. In `join.html`, find:
   ```html
   <form id="join-form">
   ```
   and change it to:
   ```html
   <form id="join-form" action="https://formspree.io/f/abcdwxyz" method="POST">
   ```
3. In `js/main.js`, delete the `join-form` submit-handler block (the whole
   `if (joinForm) { ... }` section) so the browser submits the form normally
   to Formspree instead of intercepting it.

Alternative: swap the form for an embedded **Google Form** link/iframe if
you'd rather manage responses in a Sheet.

## 6. Update social links

In `social.html` (and the footer of every page), replace the grayed-out
placeholder cards (YouTube, X/Twitter, Discord) with your real links, or
delete the ones you're not using. Instagram is already wired to
`@frc_platypirates`.

## 7. Optional: custom domain

If the team ever gets a real domain (e.g. `platypirates9181.org`), add a
file named `CNAME` (no extension) at the project root containing just the
domain name, then point your domain's DNS at GitHub Pages per
[GitHub's custom domain guide](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site).

## 8. Preview locally before pushing

You don't need a server for basic edits — just double-click `index.html` to
open it in a browser. If you want the mobile-menu JS and relative links to
behave exactly like the live site, run a tiny local server from this folder
instead:

```bash
# Python (usually pre-installed on Mac/Linux):
python3 -m http.server 8000
# then visit http://localhost:8000
```

---

Questions or stuck on a step? The GitHub Pages docs are here:
https://docs.github.com/en/pages
