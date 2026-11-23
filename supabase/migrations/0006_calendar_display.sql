-- 0006_calendar_display.sql
-- Calendar event style: a team default (set by Leads; also used on the
-- public /calendar page) and an optional personal choice per member.
-- Additive only, safe to run twice. Run after 0005.

create table if not exists public.calendar_settings (
  id boolean primary key default true check (id),   -- exactly one row
  event_style text not null default 'tint' check (event_style in ('tint', 'solid')),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.calendar_settings (id) values (true) on conflict (id) do nothing;

alter table public.calendar_settings enable row level security;

drop policy if exists "anyone reads calendar settings" on public.calendar_settings;
create policy "anyone reads calendar settings"
  on public.calendar_settings for select using (true);

drop policy if exists "leads update calendar settings" on public.calendar_settings;
create policy "leads update calendar settings"
  on public.calendar_settings for update
  using (public.is_lead()) with check (public.is_lead());

-- Personal choices: event style (null = use the team default) and
-- calendar size on the portal calendar page.
alter table public.notification_prefs
  add column if not exists cal_event_style text,
  add column if not exists cal_size text not null default 'default';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'notification_prefs_cal_event_style_check') then
    alter table public.notification_prefs
      add constraint notification_prefs_cal_event_style_check
      check (cal_event_style is null or cal_event_style in ('tint', 'solid'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'notification_prefs_cal_size_check') then
    alter table public.notification_prefs
      add constraint notification_prefs_cal_size_check
      check (cal_size in ('compact', 'default', 'large'));
  end if;
end $$;
