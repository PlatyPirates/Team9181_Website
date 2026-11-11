-- Recruiting: Join Us submissions (students, mentors, sponsors) from either
-- the site's native forms or a Google Form, plus per-Lead notification prefs.
-- Safe to run on top of 0001 + 0002. Re-runnable.

-- ============================================================
-- Where each Join Us tile sends people: our own form or a Google Form.
-- ============================================================
create table if not exists public.recruiting_sources (
  kind text primary key check (kind in ('student','mentor','sponsor')),
  mode text not null default 'native' check (mode in ('native','google')),
  google_form_url text,
  google_sheet_url text,
  updated_at timestamptz not null default now()
);

insert into public.recruiting_sources (kind) values ('student'), ('mentor'), ('sponsor')
  on conflict (kind) do nothing;

alter table public.recruiting_sources enable row level security;

-- The public Join Us page reads this to know where each tile links.
drop policy if exists "anyone reads recruiting sources" on public.recruiting_sources;
create policy "anyone reads recruiting sources"
  on public.recruiting_sources for select using (true);

drop policy if exists "leads update recruiting sources" on public.recruiting_sources;
create policy "leads update recruiting sources"
  on public.recruiting_sources for update
  using (public.is_lead()) with check (public.is_lead());

-- ============================================================
-- Shared secret the Google Apps Script sends with each response.
-- Single row. Only Leads can read it (shown on the Recruiting settings page).
-- ============================================================
create table if not exists public.recruiting_secret (
  id int primary key default 1 check (id = 1),
  secret text not null default (replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','')),
  updated_at timestamptz not null default now()
);

insert into public.recruiting_secret (id) values (1) on conflict (id) do nothing;

alter table public.recruiting_secret enable row level security;

drop policy if exists "leads read recruiting secret" on public.recruiting_secret;
create policy "leads read recruiting secret"
  on public.recruiting_secret for select using (public.is_lead());

drop policy if exists "leads update recruiting secret" on public.recruiting_secret;
create policy "leads update recruiting secret"
  on public.recruiting_secret for update
  using (public.is_lead()) with check (public.is_lead());

-- ============================================================
-- Submissions. Inserted only by the server (service role), read and
-- triaged by Leads.
-- ============================================================
create table if not exists public.recruiting_inquiries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('student','mentor','sponsor','other')),
  source text not null default 'native' check (source in ('native','google')),
  external_id text unique,               -- Google response id, for de-duplication
  name text not null default '',
  email text not null default '',
  phone text,
  organization text,                     -- school, employer, or company
  message text,
  details jsonb not null default '{}'::jsonb,  -- every question → answer, as submitted
  status text not null default 'new'
    check (status in ('new','contacted','accepted','declined','archived')),
  notes text,
  handled_by uuid references public.profiles(id) on delete set null,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recruiting_inquiries_kind_idx on public.recruiting_inquiries (kind, status, submitted_at desc);

create or replace function public.recruiting_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end$$;

drop trigger if exists recruiting_inquiries_touch on public.recruiting_inquiries;
create trigger recruiting_inquiries_touch
  before update on public.recruiting_inquiries
  for each row execute function public.recruiting_touch();

alter table public.recruiting_inquiries enable row level security;

drop policy if exists "leads read inquiries" on public.recruiting_inquiries;
create policy "leads read inquiries"
  on public.recruiting_inquiries for select using (public.is_lead());

drop policy if exists "leads update inquiries" on public.recruiting_inquiries;
create policy "leads update inquiries"
  on public.recruiting_inquiries for update
  using (public.is_lead()) with check (public.is_lead());

drop policy if exists "leads delete inquiries" on public.recruiting_inquiries;
create policy "leads delete inquiries"
  on public.recruiting_inquiries for delete using (public.is_lead());

-- ============================================================
-- Per-member notification preferences (Profile page).
-- ============================================================
create table if not exists public.notification_prefs (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  email_alerts boolean not null default true,
  ntfy_enabled boolean not null default false,
  ntfy_topic text,
  kinds text[] not null default array['student','mentor','sponsor'],
  updated_at timestamptz not null default now()
);

alter table public.notification_prefs enable row level security;

drop policy if exists "self reads prefs" on public.notification_prefs;
create policy "self reads prefs"
  on public.notification_prefs for select using (auth.uid() = user_id);

drop policy if exists "self inserts prefs" on public.notification_prefs;
create policy "self inserts prefs"
  on public.notification_prefs for insert with check (auth.uid() = user_id);

drop policy if exists "self updates prefs" on public.notification_prefs;
create policy "self updates prefs"
  on public.notification_prefs for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
