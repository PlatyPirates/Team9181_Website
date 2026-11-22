-- Team calendar (v1): parent accounts + links, per-member calendar permissions,
-- visibility groups, categories, events with recurrence + exceptions, RSVPs,
-- comments, activity log (who did what, and whether a parent did it for their
-- student), and personal .ics feed tokens.
--
-- Additive and safe to run on top of 0001–0003. Re-running it is harmless.

-- ============================================================
-- 1. Parent accounts
--    "Parent" is a link to a student (guardian_links), held alongside any
--    role. The `parent` role is only for parents with no other team role.
-- ============================================================
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.profiles'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%student%mentor%lead%'
  loop
    execute format('alter table public.profiles drop constraint %I', c);
  end loop;
end $$;

alter table public.profiles
  add constraint profiles_role_check check (role in ('student','mentor','lead','parent'));

create table if not exists public.guardian_links (
  parent_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (parent_id, student_id),
  check (parent_id <> student_id)
);
create index if not exists guardian_links_student_idx on public.guardian_links (student_id);

alter table public.guardian_links enable row level security;

drop policy if exists "read own guardian links" on public.guardian_links;
create policy "read own guardian links" on public.guardian_links for select
  using (parent_id = auth.uid() or student_id = auth.uid() or public.is_lead());
drop policy if exists "leads add guardian links" on public.guardian_links;
create policy "leads add guardian links" on public.guardian_links for insert
  with check (public.is_lead());
drop policy if exists "leads remove guardian links" on public.guardian_links;
create policy "leads remove guardian links" on public.guardian_links for delete
  using (public.is_lead());

-- Is the signed-in user a parent of this member?
create or replace function public.is_guardian_of(student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select student is not null and exists (
    select 1 from public.guardian_links
    where parent_id = auth.uid() and student_id = student
  );
$$;

-- The member plus every student they are a parent of.
create or replace function public.cal_viewer_ids(uid uuid)
returns uuid[] language sql stable security definer set search_path = public as $$
  select array_append(
    coalesce((select array_agg(student_id) from public.guardian_links where parent_id = uid), '{}'::uuid[]),
    uid);
$$;

-- ============================================================
-- 2. Calendar permissions (per member, not per role)
-- ============================================================
create table if not exists public.calendar_permissions (
  key text primary key,
  label text not null,
  description text not null,
  sort int not null default 0
);

insert into public.calendar_permissions (key, label, description, sort) values
  ('create_personal',    'Personal events',      'Create private events only you (and your parents) see', 10),
  ('create_for_student', 'For my student',       'Create, edit and delete events for your linked student(s)', 20),
  ('request_team_event', 'Request team events',  'Submit an event for approval as a team event', 30),
  ('create_team_event',  'Post team events',     'Post team events directly, without approval', 40),
  ('mark_public',        'Make public',          'Put an event on the public website calendar', 50),
  ('approve_requests',   'Approve requests',     'Approve or reject requested team events', 60),
  ('edit_any_event',     'Edit any event',       'Edit team events other people created', 70),
  ('delete_any_event',   'Delete any event',     'Delete team events other people created', 80),
  ('manage_categories',  'Categories',           'Add categories and change their names and colors', 90),
  ('manage_groups',      'Groups',               'Add or remove people from visibility groups', 100),
  ('moderate_comments',  'Moderate comments',    'Remove other people''s comments', 110),
  ('manage_permissions', 'Permissions',          'Edit this permission grid for everyone', 120)
on conflict (key) do update set label = excluded.label, description = excluded.description, sort = excluded.sort;

-- role_key: student | mentor | coach | team_admin | parent
-- (a lead with no title counts as coach; 'parent' applies to anyone linked to a student)
create table if not exists public.calendar_role_defaults (
  role_key text not null check (role_key in ('student','mentor','coach','team_admin','parent')),
  permission text not null references public.calendar_permissions(key) on delete cascade,
  primary key (role_key, permission)
);

insert into public.calendar_role_defaults (role_key, permission)
select r, p from (values
  ('student','create_personal'), ('student','request_team_event'),
  ('parent','create_personal'), ('parent','create_for_student'), ('parent','request_team_event'),
  ('mentor','create_personal'), ('mentor','request_team_event'),
  ('coach','create_personal'), ('coach','request_team_event'), ('coach','create_team_event'),
  ('coach','mark_public'), ('coach','approve_requests'), ('coach','edit_any_event'),
  ('coach','delete_any_event'), ('coach','manage_categories'), ('coach','moderate_comments'),
  ('team_admin','create_personal'), ('team_admin','request_team_event'), ('team_admin','create_team_event'),
  ('team_admin','mark_public'), ('team_admin','approve_requests'), ('team_admin','edit_any_event'),
  ('team_admin','delete_any_event'), ('team_admin','manage_categories'), ('team_admin','manage_groups'),
  ('team_admin','moderate_comments'), ('team_admin','manage_permissions')
) as v(r, p)
on conflict do nothing;

create table if not exists public.calendar_user_permissions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  permission text not null references public.calendar_permissions(key) on delete cascade,
  granted_by uuid references public.profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, permission)
);

-- Does `uid` hold `perm`? (active members only)
create or replace function public.cal_user_has_perm(uid uuid, perm text)
returns boolean language sql stable security definer set search_path = public as $$
  select uid is not null and exists (
    select 1 from public.calendar_user_permissions cp
    join public.profiles p on p.id = cp.user_id
    where cp.user_id = uid and cp.permission = perm and p.status = 'active'
  );
$$;

create or replace function public.has_cal_perm(perm text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.cal_user_has_perm(auth.uid(), perm);
$$;

create or replace function public.cal_role_key(p public.profiles)
returns text language sql immutable as $$
  select case p.role
    when 'lead' then coalesce(p.lead_title, 'coach')
    else p.role
  end;
$$;

-- Tick a member's starting boxes: their role's defaults, plus the parent
-- defaults if they are linked to a student. Only ever adds.
create or replace function public.cal_apply_defaults(uid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare prof public.profiles;
begin
  select * into prof from public.profiles where id = uid;
  if not found then return; end if;
  insert into public.calendar_user_permissions (user_id, permission, granted_by)
  select uid, d.permission, auth.uid()
  from public.calendar_role_defaults d
  where d.role_key = public.cal_role_key(prof)
     or (d.role_key = 'parent' and exists (select 1 from public.guardian_links g where g.parent_id = uid))
  on conflict do nothing;
end$$;

-- Lockout guard: someone must always be able to edit the grid.
create or replace function public.cal_guard_last_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.permission = 'manage_permissions' and not exists (
    select 1 from public.calendar_user_permissions
    where permission = 'manage_permissions' and user_id <> old.user_id
  ) and exists (select 1 from public.profiles where id = old.user_id) then
    raise exception 'At least one person must keep the Permissions box.';
  end if;
  return old;
end$$;

drop trigger if exists cal_guard_last_admin on public.calendar_user_permissions;
create trigger cal_guard_last_admin
  before delete on public.calendar_user_permissions
  for each row execute function public.cal_guard_last_admin();

alter table public.calendar_permissions enable row level security;
alter table public.calendar_role_defaults enable row level security;
alter table public.calendar_user_permissions enable row level security;

drop policy if exists "members read permission list" on public.calendar_permissions;
create policy "members read permission list" on public.calendar_permissions for select
  using (auth.uid() is not null);

drop policy if exists "members read role defaults" on public.calendar_role_defaults;
create policy "members read role defaults" on public.calendar_role_defaults for select
  using (auth.uid() is not null);
drop policy if exists "admins edit role defaults" on public.calendar_role_defaults;
create policy "admins edit role defaults" on public.calendar_role_defaults for all
  using (public.has_cal_perm('manage_permissions')) with check (public.has_cal_perm('manage_permissions'));

drop policy if exists "read own or all permissions" on public.calendar_user_permissions;
create policy "read own or all permissions" on public.calendar_user_permissions for select
  using (user_id = auth.uid() or public.has_cal_perm('manage_permissions'));
drop policy if exists "admins grant permissions" on public.calendar_user_permissions;
create policy "admins grant permissions" on public.calendar_user_permissions for insert
  with check (public.has_cal_perm('manage_permissions'));
drop policy if exists "admins revoke permissions" on public.calendar_user_permissions;
create policy "admins revoke permissions" on public.calendar_user_permissions for delete
  using (public.has_cal_perm('manage_permissions'));

-- Lets the admin grid apply defaults (checks the caller's permission).
create or replace function public.cal_reset_to_defaults(uid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_cal_perm('manage_permissions') then
    raise exception 'You need the Permissions box to do that.';
  end if;
  delete from public.calendar_user_permissions
   where user_id = uid and permission <> 'manage_permissions';
  perform public.cal_apply_defaults(uid);
end$$;
grant execute on function public.cal_reset_to_defaults(uuid) to authenticated;

-- ============================================================
-- 3. Visibility groups
-- ============================================================
create table if not exists public.calendar_groups (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  kind text not null default 'members' check (kind in ('members','all_members','public')),
  auto_rule text check (auto_rule in ('students','mentors','student_leadership','mentor_leadership')),
  is_preset boolean not null default false,
  sort int not null default 100,
  created_at timestamptz not null default now()
);

insert into public.calendar_groups (slug, name, kind, auto_rule, is_preset, sort) values
  ('students',           'Students',           'members',     'students',           true, 10),
  ('mentors',            'Mentors',            'members',     'mentors',            true, 20),
  ('student-leadership', 'Student Leadership', 'members',     'student_leadership', true, 30),
  ('mentor-leadership',  'Mentor Leadership',  'members',     'mentor_leadership',  true, 40),
  ('all-members',        'All Members',        'all_members', null,                 true, 50),
  ('public',             'Public Calendar',    'public',      null,                 true, 60)
on conflict (slug) do nothing;

-- source 'auto' rows follow the profile; 'manual' rows were added by hand.
-- excluded = someone with manage_groups removed an auto member; the auto fill
-- leaves them out until they're added back.
create table if not exists public.calendar_group_members (
  group_id uuid not null references public.calendar_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  source text not null default 'manual' check (source in ('auto','manual')),
  excluded boolean not null default false,
  added_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index if not exists calendar_group_members_user_idx on public.calendar_group_members (user_id);

create or replace function public.cal_rule_matches(rule text, p public.profiles)
returns boolean language sql immutable as $$
  select p.status = 'active' and case rule
    when 'students' then p.role = 'student'
    when 'mentors' then p.role = 'mentor'
    when 'student_leadership' then p.role = 'student' and p.student_title is not null
    when 'mentor_leadership' then p.role = 'lead'
    else false
  end;
$$;

create or replace function public.cal_sync_auto_groups(uid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare prof public.profiles; g record;
begin
  select * into prof from public.profiles where id = uid;
  if not found then return; end if;
  for g in select id, auto_rule from public.calendar_groups where auto_rule is not null loop
    if public.cal_rule_matches(g.auto_rule, prof) then
      insert into public.calendar_group_members (group_id, user_id, source)
      values (g.id, uid, 'auto') on conflict do nothing;
    else
      delete from public.calendar_group_members
       where group_id = g.id and user_id = uid and source = 'auto' and not excluded;
    end if;
  end loop;
end$$;

-- Effective membership.
create or replace function public.cal_in_group(gid uuid, uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.calendar_group_members
    where group_id = gid and user_id = uid and not excluded
  );
$$;

-- Profile changes: keep auto groups in step, and tick default permissions the
-- moment an account becomes active.
create or replace function public.cal_on_profile_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.cal_sync_auto_groups(new.id);
  if new.status = 'active' and (tg_op = 'INSERT' or old.status is distinct from 'active') then
    perform public.cal_apply_defaults(new.id);
  end if;
  return new;
end$$;

drop trigger if exists cal_on_profile_change on public.profiles;
create trigger cal_on_profile_change
  after insert or update of role, lead_title, student_title, status on public.profiles
  for each row execute function public.cal_on_profile_change();

-- A first student link ticks the parent boxes the member doesn't already have.
create or replace function public.cal_on_guardian_link()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.calendar_user_permissions (user_id, permission, granted_by)
  select new.parent_id, d.permission, auth.uid()
  from public.calendar_role_defaults d
  join public.profiles p on p.id = new.parent_id and p.status = 'active'
  where d.role_key = 'parent'
  on conflict do nothing;
  return new;
end$$;

drop trigger if exists cal_on_guardian_link on public.guardian_links;
create trigger cal_on_guardian_link
  after insert on public.guardian_links
  for each row execute function public.cal_on_guardian_link();

alter table public.calendar_groups enable row level security;
alter table public.calendar_group_members enable row level security;

drop policy if exists "members read groups" on public.calendar_groups;
create policy "members read groups" on public.calendar_groups for select
  using (auth.uid() is not null);
drop policy if exists "group managers add groups" on public.calendar_groups;
create policy "group managers add groups" on public.calendar_groups for insert
  with check (public.has_cal_perm('manage_groups') and not is_preset);
drop policy if exists "group managers edit groups" on public.calendar_groups;
create policy "group managers edit groups" on public.calendar_groups for update
  using (public.has_cal_perm('manage_groups')) with check (public.has_cal_perm('manage_groups'));
drop policy if exists "group managers delete custom groups" on public.calendar_groups;
create policy "group managers delete custom groups" on public.calendar_groups for delete
  using (public.has_cal_perm('manage_groups') and not is_preset);

drop policy if exists "members read group members" on public.calendar_group_members;
create policy "members read group members" on public.calendar_group_members for select
  using (public.is_active_member() or user_id = auth.uid());
drop policy if exists "group managers add members" on public.calendar_group_members;
create policy "group managers add members" on public.calendar_group_members for insert
  with check (public.has_cal_perm('manage_groups'));
drop policy if exists "group managers edit members" on public.calendar_group_members;
create policy "group managers edit members" on public.calendar_group_members for update
  using (public.has_cal_perm('manage_groups')) with check (public.has_cal_perm('manage_groups'));
drop policy if exists "group managers remove members" on public.calendar_group_members;
create policy "group managers remove members" on public.calendar_group_members for delete
  using (public.has_cal_perm('manage_groups'));

-- ============================================================
-- 4. Categories
-- ============================================================
create table if not exists public.calendar_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 60),
  color text not null default '#6b1e2a' check (color ~ '^#[0-9a-fA-F]{6}$'),
  is_preset boolean not null default false,
  archived boolean not null default false,
  sort int not null default 100,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists calendar_categories_name_idx on public.calendar_categories (lower(name));

insert into public.calendar_categories (name, color, is_preset, sort) values
  ('Meeting',     '#6b1e2a', true, 10),
  ('Build Night', '#0f766e', true, 20),
  ('Outreach',    '#c2410c', true, 30),
  ('Competition', '#1e40af', true, 40),
  ('Fundraising', '#a16207', true, 50),
  ('Deadline',    '#b91c1c', true, 60),
  ('Social',      '#7c3aed', true, 70)
on conflict do nothing;

alter table public.calendar_categories enable row level security;
drop policy if exists "members read categories" on public.calendar_categories;
create policy "members read categories" on public.calendar_categories for select
  using (auth.uid() is not null);
drop policy if exists "category managers add" on public.calendar_categories;
create policy "category managers add" on public.calendar_categories for insert
  with check (public.has_cal_perm('manage_categories'));
drop policy if exists "category managers edit" on public.calendar_categories;
create policy "category managers edit" on public.calendar_categories for update
  using (public.has_cal_perm('manage_categories')) with check (public.has_cal_perm('manage_categories'));

-- ============================================================
-- 5. Events, groups per event, exceptions
-- ============================================================
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 200),
  description text,
  notes text,
  custom_label text check (custom_label is null or length(custom_label) <= 60),
  location text,
  link_url text check (link_url is null or link_url ~* '^https?://'),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean not null default false,
  -- RFC 5545 rule part only, e.g. FREQ=WEEKLY;BYDAY=TU,TH;UNTIL=20270501T235959
  -- (UNTIL in America/Chicago wall time). Null = one-off.
  rrule text,
  rrule_until timestamptz, -- end of the last occurrence; null = forever (or one-off)
  category_id uuid references public.calendar_categories(id) on delete set null,
  tags text[] not null default '{}',
  is_private boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  on_behalf_of uuid references public.profiles(id) on delete cascade,
  status text not null default 'approved' check (status in ('approved','pending','rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at >= starts_at)
);
create index if not exists calendar_events_starts_idx on public.calendar_events (starts_at);
create index if not exists calendar_events_until_idx on public.calendar_events (rrule_until);
create index if not exists calendar_events_creator_idx on public.calendar_events (created_by);
create index if not exists calendar_events_behalf_idx on public.calendar_events (on_behalf_of);
create index if not exists calendar_events_status_idx on public.calendar_events (status);
create index if not exists calendar_events_tags_idx on public.calendar_events using gin (tags);

create table if not exists public.calendar_event_groups (
  event_id uuid not null references public.calendar_events(id) on delete cascade,
  group_id uuid not null references public.calendar_groups(id) on delete cascade,
  primary key (event_id, group_id)
);
create index if not exists calendar_event_groups_group_idx on public.calendar_event_groups (group_id);

create table if not exists public.calendar_event_exceptions (
  event_id uuid not null references public.calendar_events(id) on delete cascade,
  original_start timestamptz not null,
  kind text not null check (kind in ('cancelled','modified')),
  starts_at timestamptz,
  ends_at timestamptz,
  title text,
  location text,
  description text,
  notes text,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (event_id, original_start)
);

-- The one visibility rule. Every path (portal, feeds) goes through it.
create or replace function public.cal_can_see(
  eid uuid, e_created_by uuid, e_on_behalf_of uuid, e_status text, e_private boolean, uid uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare viewers uuid[];
begin
  -- Anyone (signed in or not) sees approved public events.
  if e_status = 'approved' and not e_private and exists (
    select 1 from public.calendar_event_groups eg join public.calendar_groups g on g.id = eg.group_id
    where eg.event_id = eid and g.kind = 'public') then
    return true;
  end if;
  if uid is null or not exists (select 1 from public.profiles where id = uid and status = 'active') then
    return false;
  end if;
  viewers := public.cal_viewer_ids(uid);
  -- Own events, events made for you, and (for parents) your student's events.
  if e_created_by = any(viewers) or e_on_behalf_of = any(viewers) then
    return true;
  end if;
  if e_status <> 'approved' then
    return public.cal_user_has_perm(uid, 'approve_requests');
  end if;
  if e_private then
    return false;
  end if;
  -- Coaches/admins who can edit or approve any event see every team event.
  if public.cal_user_has_perm(uid, 'edit_any_event') or public.cal_user_has_perm(uid, 'approve_requests') then
    return true;
  end if;
  return exists (
    select 1 from public.calendar_event_groups eg
    join public.calendar_groups g on g.id = eg.group_id
    where eg.event_id = eid and (
      g.kind = 'all_members'
      or exists (select 1 from public.calendar_group_members gm
                 where gm.group_id = g.id and not gm.excluded and gm.user_id = any(viewers))
    )
  );
end$$;

create or replace function public.cal_can_see_event(eid uuid, uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.calendar_events e
    where e.id = eid and public.cal_can_see(e.id, e.created_by, e.on_behalf_of, e.status, e.is_private, uid)
  );
$$;

-- Edit: the creator, the member it was made for, their parent, or
-- edit_any_event for non-private events.
create or replace function public.cal_can_edit(eid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.calendar_events e
    where e.id = eid and (
      e.created_by = auth.uid()
      or e.on_behalf_of = auth.uid()
      or public.is_guardian_of(e.created_by)
      or public.is_guardian_of(e.on_behalf_of)
      or (not e.is_private and public.has_cal_perm('edit_any_event'))
      or (e.status = 'pending' and public.has_cal_perm('approve_requests'))
    )
  );
$$;

create or replace function public.cal_can_delete(eid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.calendar_events e
    where e.id = eid and (
      e.created_by = auth.uid()
      or e.on_behalf_of = auth.uid()
      or public.is_guardian_of(e.created_by)
      or public.is_guardian_of(e.on_behalf_of)
      or (not e.is_private and public.has_cal_perm('delete_any_event'))
    )
  );
$$;

-- Ids of every event `uid` can see that overlaps [range_start, range_end).
-- Server-only (personal .ics feed); not callable from the browser.
create or replace function public.calendar_visible_event_ids(uid uuid, range_start timestamptz, range_end timestamptz)
returns setof uuid language sql stable security definer set search_path = public as $$
  select e.id from public.calendar_events e
  where e.starts_at < range_end
    and ((e.rrule is null and e.ends_at > range_start)
      or (e.rrule is not null and (e.rrule_until is null or e.rrule_until > range_start)))
    and e.status = 'approved'
    and public.cal_can_see(e.id, e.created_by, e.on_behalf_of, e.status, e.is_private, uid);
$$;
revoke all on function public.calendar_visible_event_ids(uuid, timestamptz, timestamptz) from public, anon, authenticated;

-- Insert rules, checked by RLS. created_by must be you.
create or replace function public.cal_can_insert(
  e_created_by uuid, e_on_behalf_of uuid, e_status text, e_private boolean)
returns boolean language sql stable security definer set search_path = public as $$
  select e_created_by = auth.uid() and public.is_active_member() and (
    -- personal / for my student
    (e_private and e_status = 'approved' and (
       (e_on_behalf_of is null and public.has_cal_perm('create_personal'))
       or (public.is_guardian_of(e_on_behalf_of) and public.has_cal_perm('create_for_student'))))
    -- team event, straight to the calendar
    or (not e_private and e_status = 'approved' and e_on_behalf_of is null and public.has_cal_perm('create_team_event'))
    -- team event request (yours, or for your student)
    or (not e_private and e_status = 'pending' and (
       (e_on_behalf_of is null and public.has_cal_perm('request_team_event'))
       or (public.is_guardian_of(e_on_behalf_of) and public.has_cal_perm('create_for_student'))))
  );
$$;

-- Stamp updated_by / updated_at, and guard status + privacy changes.
create or replace function public.cal_events_before_write()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if auth.uid() is not null then new.updated_by := auth.uid(); end if;
  if tg_op = 'UPDATE' and auth.uid() is not null then
    if new.created_by is distinct from old.created_by or new.on_behalf_of is distinct from old.on_behalf_of then
      raise exception 'The creator of an event can''t be changed.';
    end if;
    if new.status is distinct from old.status then
      if old.status = 'pending' and new.status in ('approved','rejected') then
        if not public.has_cal_perm('approve_requests') then
          raise exception 'Only approvers can approve or reject requests.';
        end if;
        new.reviewed_by := auth.uid();
        new.reviewed_at := now();
      elsif new.status = 'pending' then
        null; -- (re)submitting as a team event request
      elsif not public.has_cal_perm('approve_requests') then
        raise exception 'That status change isn''t allowed.';
      end if;
    end if;
    -- Turning a personal event into a live team event needs create_team_event.
    if old.is_private and not new.is_private and new.status = 'approved'
       and not public.has_cal_perm('create_team_event') then
      raise exception 'Request it as a team event instead; it needs approval.';
    end if;
  end if;
  return new;
end$$;

drop trigger if exists cal_events_before_write on public.calendar_events;
create trigger cal_events_before_write
  before insert or update on public.calendar_events
  for each row execute function public.cal_events_before_write();

-- Only people with mark_public can put an event on the public calendar.
create or replace function public.cal_guard_public_group()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null
     and exists (select 1 from public.calendar_groups where id = new.group_id and kind = 'public')
     and not public.has_cal_perm('mark_public') then
    raise exception 'You need the Make public box to add events to the public calendar.';
  end if;
  return new;
end$$;

drop trigger if exists cal_guard_public_group on public.calendar_event_groups;
create trigger cal_guard_public_group
  before insert on public.calendar_event_groups
  for each row execute function public.cal_guard_public_group();

alter table public.calendar_events enable row level security;
alter table public.calendar_event_groups enable row level security;
alter table public.calendar_event_exceptions enable row level security;

drop policy if exists "see visible events" on public.calendar_events;
create policy "see visible events" on public.calendar_events for select
  using (public.cal_can_see(id, created_by, on_behalf_of, status, is_private, auth.uid()));
drop policy if exists "create events" on public.calendar_events;
create policy "create events" on public.calendar_events for insert
  with check (public.cal_can_insert(created_by, on_behalf_of, status, is_private));
drop policy if exists "edit events" on public.calendar_events;
create policy "edit events" on public.calendar_events for update
  using (public.cal_can_edit(id)) with check (true);
drop policy if exists "delete events" on public.calendar_events;
create policy "delete events" on public.calendar_events for delete
  using (public.cal_can_delete(id));

drop policy if exists "see event groups" on public.calendar_event_groups;
create policy "see event groups" on public.calendar_event_groups for select
  using (public.cal_can_see_event(event_id, auth.uid()));
drop policy if exists "set event groups" on public.calendar_event_groups;
create policy "set event groups" on public.calendar_event_groups for insert
  with check (public.cal_can_edit(event_id));
drop policy if exists "unset event groups" on public.calendar_event_groups;
create policy "unset event groups" on public.calendar_event_groups for delete
  using (public.cal_can_edit(event_id));

drop policy if exists "see exceptions" on public.calendar_event_exceptions;
create policy "see exceptions" on public.calendar_event_exceptions for select
  using (public.cal_can_see_event(event_id, auth.uid()));
drop policy if exists "add exceptions" on public.calendar_event_exceptions;
create policy "add exceptions" on public.calendar_event_exceptions for insert
  with check (public.cal_can_edit(event_id));
drop policy if exists "edit exceptions" on public.calendar_event_exceptions;
create policy "edit exceptions" on public.calendar_event_exceptions for update
  using (public.cal_can_edit(event_id)) with check (public.cal_can_edit(event_id));
drop policy if exists "remove exceptions" on public.calendar_event_exceptions;
create policy "remove exceptions" on public.calendar_event_exceptions for delete
  using (public.cal_can_edit(event_id));

-- ============================================================
-- 6. RSVPs and comments
--    user_id / author_id = whose answer or comment it is.
--    set_by / posted_by  = who actually clicked (a parent, for their student).
-- ============================================================
create table if not exists public.calendar_rsvps (
  event_id uuid not null references public.calendar_events(id) on delete cascade,
  occurrence text not null default '', -- '' for one-off events, else the occurrence's original start (ISO, UTC)
  user_id uuid not null references public.profiles(id) on delete cascade,
  response text not null check (response in ('yes','no','maybe')),
  set_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (event_id, occurrence, user_id)
);

create table if not exists public.calendar_comments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.calendar_events(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  posted_by uuid references public.profiles(id) on delete set null,
  body text not null check (length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id) on delete set null
);
create index if not exists calendar_comments_event_idx on public.calendar_comments (event_id, created_at);

create or replace function public.cal_stamp_actor()
returns trigger language plpgsql as $$
begin
  if tg_table_name = 'calendar_rsvps' then
    new.set_by := coalesce(auth.uid(), new.set_by);
    new.updated_at := now();
  elsif tg_table_name = 'calendar_comments' then
    if tg_op = 'INSERT' then
      new.posted_by := coalesce(auth.uid(), new.posted_by);
    elsif new.body is distinct from old.body then
      new.edited_at := now();
    end if;
    if new.deleted_at is not null and (tg_op = 'INSERT' or old.deleted_at is null) then
      new.deleted_by := coalesce(auth.uid(), new.deleted_by);
    end if;
  end if;
  return new;
end$$;

drop trigger if exists cal_stamp_rsvp on public.calendar_rsvps;
create trigger cal_stamp_rsvp before insert or update on public.calendar_rsvps
  for each row execute function public.cal_stamp_actor();
drop trigger if exists cal_stamp_comment on public.calendar_comments;
create trigger cal_stamp_comment before insert or update on public.calendar_comments
  for each row execute function public.cal_stamp_actor();

alter table public.calendar_rsvps enable row level security;
alter table public.calendar_comments enable row level security;

drop policy if exists "see rsvps" on public.calendar_rsvps;
create policy "see rsvps" on public.calendar_rsvps for select
  using (public.cal_can_see_event(event_id, auth.uid()));
drop policy if exists "rsvp for self or my student" on public.calendar_rsvps;
create policy "rsvp for self or my student" on public.calendar_rsvps for insert
  with check ((user_id = auth.uid() or public.is_guardian_of(user_id))
              and public.cal_can_see_event(event_id, auth.uid()));
drop policy if exists "change rsvp" on public.calendar_rsvps;
create policy "change rsvp" on public.calendar_rsvps for update
  using (user_id = auth.uid() or public.is_guardian_of(user_id))
  with check (user_id = auth.uid() or public.is_guardian_of(user_id));
drop policy if exists "clear rsvp" on public.calendar_rsvps;
create policy "clear rsvp" on public.calendar_rsvps for delete
  using (user_id = auth.uid() or public.is_guardian_of(user_id));

drop policy if exists "see comments" on public.calendar_comments;
create policy "see comments" on public.calendar_comments for select
  using (public.cal_can_see_event(event_id, auth.uid()));
drop policy if exists "comment as self or for my student" on public.calendar_comments;
create policy "comment as self or for my student" on public.calendar_comments for insert
  with check ((author_id = auth.uid() or public.is_guardian_of(author_id))
              and deleted_at is null
              and public.cal_can_see_event(event_id, auth.uid()));
drop policy if exists "edit or remove comments" on public.calendar_comments;
create policy "edit or remove comments" on public.calendar_comments for update
  using (author_id = auth.uid() or public.is_guardian_of(author_id) or public.has_cal_perm('moderate_comments'))
  with check (true);

-- Moderators may only soft-delete other people's comments, not reword them.
create or replace function public.cal_guard_comment_edit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null
     and new.body is distinct from old.body
     and not (old.author_id = auth.uid() or public.is_guardian_of(old.author_id)) then
    raise exception 'You can only remove other people''s comments, not edit them.';
  end if;
  if new.author_id is distinct from old.author_id or new.event_id is distinct from old.event_id then
    raise exception 'A comment can''t be moved.';
  end if;
  return new;
end$$;

drop trigger if exists cal_guard_comment_edit on public.calendar_comments;
create trigger cal_guard_comment_edit before update on public.calendar_comments
  for each row execute function public.cal_guard_comment_edit();

-- ============================================================
-- 7. Activity log: who did what. by_parent = a parent acted for their student.
--    Written only by triggers, so it can't be forged from the browser.
-- ============================================================
create table if not exists public.calendar_event_activity (
  id bigint generated always as identity primary key,
  event_id uuid references public.calendar_events(id) on delete set null,
  event_title text,
  actor_id uuid references public.profiles(id) on delete set null,
  subject_id uuid references public.profiles(id) on delete set null, -- the member it was for
  by_parent boolean not null default false,
  action text not null,
  detail jsonb not null default '{}'::jsonb,
  at timestamptz not null default now()
);
create index if not exists calendar_event_activity_event_idx on public.calendar_event_activity (event_id, at desc);
create index if not exists calendar_event_activity_subject_idx on public.calendar_event_activity (subject_id, at desc);

create or replace function public.cal_log(eid uuid, title text, subject uuid, act text, det jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare actor uuid := auth.uid();
begin
  if actor is null then return; end if; -- server jobs don't log
  insert into public.calendar_event_activity (event_id, event_title, actor_id, subject_id, by_parent, action, detail)
  values (eid, title, actor, subject,
          subject is not null and subject <> actor
            and exists (select 1 from public.guardian_links where parent_id = actor and student_id = subject),
          act, coalesce(det, '{}'::jsonb));
end$$;

create or replace function public.cal_log_event()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.cal_log(new.id, new.title, coalesce(new.on_behalf_of, new.created_by),
      case when new.status = 'pending' then 'requested' else 'created' end, '{}'::jsonb);
  elsif tg_op = 'UPDATE' then
    perform public.cal_log(new.id, new.title, coalesce(new.on_behalf_of, new.created_by),
      case
        when old.status = 'pending' and new.status = 'approved' then 'approved'
        when old.status = 'pending' and new.status = 'rejected' then 'rejected'
        when old.status <> 'pending' and new.status = 'pending' then 'requested'
        else 'edited' end,
      '{}'::jsonb);
  else
    perform public.cal_log(null, old.title, coalesce(old.on_behalf_of, old.created_by), 'deleted',
      jsonb_build_object('event_id', old.id));
    return old;
  end if;
  return new;
end$$;

drop trigger if exists cal_log_event on public.calendar_events;
create trigger cal_log_event after insert or update or delete on public.calendar_events
  for each row execute function public.cal_log_event();

create or replace function public.cal_log_exception()
returns trigger language plpgsql security definer set search_path = public as $$
declare e public.calendar_events;
begin
  select * into e from public.calendar_events where id = new.event_id;
  if found then
    perform public.cal_log(e.id, e.title, coalesce(e.on_behalf_of, e.created_by),
      case when new.kind = 'cancelled' then 'cancelled_date' else 'edited_date' end,
      jsonb_build_object('occurrence', new.original_start));
  end if;
  return new;
end$$;

drop trigger if exists cal_log_exception on public.calendar_event_exceptions;
create trigger cal_log_exception after insert or update on public.calendar_event_exceptions
  for each row execute function public.cal_log_exception();

create or replace function public.cal_log_rsvp()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.cal_log(new.event_id, (select title from public.calendar_events where id = new.event_id),
    new.user_id, 'rsvp', jsonb_build_object('response', new.response, 'occurrence', new.occurrence));
  return new;
end$$;

drop trigger if exists cal_log_rsvp on public.calendar_rsvps;
create trigger cal_log_rsvp after insert or update on public.calendar_rsvps
  for each row execute function public.cal_log_rsvp();

create or replace function public.cal_log_comment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.cal_log(new.event_id, (select title from public.calendar_events where id = new.event_id),
    new.author_id,
    case when tg_op = 'INSERT' then 'commented'
         when new.deleted_at is not null and old.deleted_at is null then 'removed_comment'
         else 'edited_comment' end,
    jsonb_build_object('comment_id', new.id));
  return new;
end$$;

drop trigger if exists cal_log_comment on public.calendar_comments;
create trigger cal_log_comment after insert or update on public.calendar_comments
  for each row execute function public.cal_log_comment();

alter table public.calendar_event_activity enable row level security;
drop policy if exists "see activity" on public.calendar_event_activity;
create policy "see activity" on public.calendar_event_activity for select
  using (
    actor_id = auth.uid() or subject_id = auth.uid() or public.is_guardian_of(subject_id)
    or (event_id is not null and public.cal_can_see_event(event_id, auth.uid())
        and (public.has_cal_perm('edit_any_event') or public.has_cal_perm('approve_requests')))
  );

-- ============================================================
-- 8. Personal .ics feed tokens (server-only: no policies)
-- ============================================================
create table if not exists public.calendar_feed_tokens (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  token_hash text unique not null,
  token_enc text not null,
  created_at timestamptz not null default now()
);
alter table public.calendar_feed_tokens enable row level security;

-- ============================================================
-- 9. Per-member calendar preferences on the existing notification_prefs
-- ============================================================
alter table public.notification_prefs
  add column if not exists cal_hidden_groups uuid[] not null default '{}',
  add column if not exists cal_alerts boolean not null default true,
  add column if not exists cal_show_local_tz boolean not null default false;

-- ============================================================
-- 10. Backfill: groups + default permissions for everyone already active.
-- ============================================================
do $$
declare r record;
begin
  for r in select id from public.profiles loop
    perform public.cal_sync_auto_groups(r.id);
  end loop;
  for r in select id from public.profiles where status = 'active' loop
    perform public.cal_apply_defaults(r.id);
  end loop;
end $$;
