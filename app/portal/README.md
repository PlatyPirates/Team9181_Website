# Member portal

Routes
- `/portal/login` — sign in with username **or** email
- `/portal/signup` — self-serve sign-up; account lands as `pending`
- `/portal/pending` — holding page shown until a Lead approves
- `/portal/forgot-password`, `/portal/reset-password` — password reset by email
- `/portal` — dashboard with tiles
- `/portal/calendar` · `/sponsors` · `/inventory` · `/attendance` · `/outreach` — placeholders
- `/portal/roster` — member roster (gated)
- `/portal/admin` — Leads only: approve pending, change roles, create accounts, send reset links

Access control (three layers)
1. `proxy.ts` refreshes the session cookie and bounces signed-out visitors away from `/portal/*`.
2. `lib/auth.ts` `requireMember()` / `requireLead()` re-verify on every portal page.
3. RLS in the database (see `supabase/migrations/0001_portal.sql`) is the real lock.

Env vars (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # server-only; needed for Admin "create account" and "email reset link"
```

Setup
1. Open the Supabase SQL editor and run `supabase/migrations/0001_portal.sql`.
2. Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` (Project Settings → API).
3. In Supabase Auth settings, turn **Confirm email** off if you want new sign-ups to log in immediately (they'll still sit at `pending` until a Lead approves). Keep it on if you'd rather accounts verify email first.
4. Restart `npm run dev`.
5. Sign up as yourself at `/portal/signup`, then in the SQL editor run:
   ```sql
   update public.profiles
     set role='lead', lead_title='team_admin', status='active'
     where email = 'you@example.com';
   ```
   You are now the first Lead and can use `/portal/admin` to approve everyone else.
