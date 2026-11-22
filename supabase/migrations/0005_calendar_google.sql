-- 0005_calendar_google.sql
-- Team calendar v1.1: Google Calendar push + fallback reminders.
-- Additive only (no drops of data), safe to run twice. Run after 0004.
--
-- The Google tables have RLS on and NO policies for signed-in users: only
-- server code using the service-role key reads or writes them, so refresh
-- tokens never reach the browser.

-- ============================================================
-- 1. One row per member who connected Google
-- ============================================================
create table if not exists public.google_calendar_links (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  google_email text,
  refresh_token_enc text not null,          -- AES-256-GCM, key in CALENDAR_ENC_KEY
  google_calendar_id text,                  -- the "Platy Pirates" calendar we created
  mode text not null default 'push' check (mode in ('push', 'two_way')),
  status text not null default 'active' check (status in ('active', 'error', 'revoked')),
  last_error text,
  dirty boolean not null default true,      -- something changed: push again
  sync_token text,                          -- v1.2 (two-way pull)
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.google_calendar_links enable row level security;
create index if not exists google_calendar_links_dirty_idx
  on public.google_calendar_links (dirty) where status = 'active';

-- ============================================================
-- 2. Our event -> their Google event. No FK to calendar_events on
--    purpose: when an event is deleted we still need the row to remove
--    it from Google.
-- ============================================================
create table if not exists public.google_event_map (
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null,
  google_event_id text not null,
  extra_ids text[] not null default '{}',   -- standalone copies of edited single dates
  content_hash text not null,
  etag text,
  pushed_at timestamptz not null default now(),
  primary key (user_id, event_id)
);
alter table public.google_event_map enable row level security;

-- ============================================================
-- 3. Fallback reminders: one row per reminder sent (never twice)
-- ============================================================
create table if not exists public.calendar_reminders_sent (
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.calendar_events(id) on delete cascade,
  occurrence text not null default '',
  sent_at timestamptz not null default now(),
  primary key (user_id, event_id, occurrence)
);
alter table public.calendar_reminders_sent enable row level security;

-- v1.2 uses this: a team event a member deleted in Google stays hidden for
-- them only. Created now so 0005 is the only Google migration.
create table if not exists public.calendar_hidden_events (
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.calendar_events(id) on delete cascade,
  hidden_at timestamptz not null default now(),
  primary key (user_id, event_id)
);
alter table public.calendar_hidden_events enable row level security;
drop policy if exists "self reads hidden events" on public.calendar_hidden_events;
create policy "self reads hidden events"
  on public.calendar_hidden_events for select using (auth.uid() = user_id);
drop policy if exists "self unhides events" on public.calendar_hidden_events;
create policy "self unhides events"
  on public.calendar_hidden_events for delete using (auth.uid() = user_id);

-- ============================================================
-- 4. Reminder preferences
-- ============================================================
alter table public.notification_prefs
  add column if not exists cal_reminders boolean not null default false,
  add column if not exists cal_reminder_minutes integer not null default 60,
  add column if not exists cal_reminder_email boolean not null default true,
  add column if not exists cal_reminder_ntfy boolean not null default true;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'notification_prefs_cal_reminder_minutes_check'
  ) then
    alter table public.notification_prefs
      add constraint notification_prefs_cal_reminder_minutes_check
      check (cal_reminder_minutes in (15, 60, 1440));
  end if;
end $$;

-- ============================================================
-- 5. Mark Google links dirty when anything that changes what a member
--    sees is written. The push compares content hashes, so a dirty flag
--    with nothing really changed costs no Google calls.
-- ============================================================
create or replace function public.cal_mark_google_dirty()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.google_calendar_links set dirty = true
   where status = 'active' and not dirty;
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'calendar_events', 'calendar_event_groups', 'calendar_event_exceptions',
    'calendar_group_members', 'calendar_user_permissions', 'guardian_links',
    'calendar_categories'
  ] loop
    execute format('drop trigger if exists cal_google_dirty on public.%I', t);
    execute format(
      'create trigger cal_google_dirty after insert or update or delete on public.%I
         for each statement execute function public.cal_mark_google_dirty()', t);
  end loop;
end $$;

-- A member switching groups off in their filter only affects their own copy.
create or replace function public.cal_mark_google_dirty_self()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.google_calendar_links set dirty = true
   where user_id = new.user_id and status = 'active';
  return null;
end $$;

drop trigger if exists cal_google_dirty_prefs on public.notification_prefs;
create trigger cal_google_dirty_prefs
  after update of cal_hidden_groups on public.notification_prefs
  for each row when (old.cal_hidden_groups is distinct from new.cal_hidden_groups)
  execute function public.cal_mark_google_dirty_self();

-- ============================================================
-- 6. Scheduler (pg_cron + pg_net). NOT run by this file, because it needs
--    your secret. After setting CALENDAR_CRON_SECRET on Vercel, enable the
--    pg_cron and pg_net extensions (Database -> Extensions) and run:
--
--   select cron.schedule(
--     'team-calendar',
--     '*/10 * * * *',
--     $job$
--       select net.http_post(
--         url := 'https://www.team9181.org/api/calendar/cron',
--         headers := jsonb_build_object(
--           'Authorization', 'Bearer YOUR_CALENDAR_CRON_SECRET',
--           'Content-Type', 'application/json'),
--         body := '{}'::jsonb,
--         timeout_milliseconds := 60000);
--     $job$);
--
--   To stop it:  select cron.unschedule('team-calendar');
-- ============================================================
