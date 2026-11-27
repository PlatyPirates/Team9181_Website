-- Profile app: public profile fields, private sections (one table per access
-- grant), Lead-only records, access grants, parent link requests, photo
-- approval, and an edit-history log written only by triggers.
--
-- Builds on 0004_calendar.sql (role 'parent', guardian_links, is_guardian_of)
-- and 0007_role_tree.sql (mentor_title, has_student).
-- Additive and safe to re-run.

-- ============================================================
-- 1. Public fields on profiles (readable by every active member)
-- ============================================================
alter table public.profiles
  add column if not exists preferred_name text,
  add column if not exists pronunciation text,
  add column if not exists bio text,
  add column if not exists avatar_mode text not null default 'avatar',
  add column if not exists avatar_config jsonb not null default '{}'::jsonb,
  add column if not exists photo_path text,
  add column if not exists photo_status text not null default 'none',
  add column if not exists photo_auto_approve boolean not null default false,
  add column if not exists subteams text[] not null default '{}',
  add column if not exists grad_year int,
  add column if not exists school text,
  add column if not exists interests text[] not null default '{}',
  add column if not exists first_season int,
  add column if not exists employer text,
  add column if not exists job_title text;

do $$ begin
  alter table public.profiles add constraint profiles_avatar_mode_chk check (avatar_mode in ('avatar','photo'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.profiles add constraint profiles_photo_status_chk
    check (photo_status in ('none','pending','approved','rejected'));
exception when duplicate_object then null; end $$;

-- Move the single subteam into the new array (kept for now; drop later).
update public.profiles
   set subteams = array[subteam]
 where subteam is not null and subteam <> '' and subteams = '{}';

-- Non-Leads (the member themselves or their parent) may not change these.
create or replace function public.profiles_guard_self_edit()
returns trigger language plpgsql as $$
begin
  if auth.uid() is not null and not public.is_lead() then
    if new.role is distinct from old.role
       or new.status is distinct from old.status
       or new.lead_title is distinct from old.lead_title
       or new.student_title is distinct from old.student_title
       or new.mentor_title is distinct from old.mentor_title
       or new.has_student is distinct from old.has_student
       or new.username is distinct from old.username
       or new.email is distinct from old.email
       or new.subteam is distinct from old.subteam
       or new.subteams is distinct from old.subteams
       or new.first_season is distinct from old.first_season
       or new.photo_auto_approve is distinct from old.photo_auto_approve
       or (new.photo_status is distinct from old.photo_status
           and new.photo_path is not distinct from old.photo_path) then
      raise exception 'Only a Lead can change role, status, titles, username, email, subteams, first season, or photo approval.';
    end if;
  end if;
  return new;
end$$;

drop trigger if exists profiles_guard_self_edit on public.profiles;
create trigger profiles_guard_self_edit
  before update on public.profiles
  for each row execute function public.profiles_guard_self_edit();

-- Photo approval: a student's new photo waits for a Lead unless they are on
-- auto-approve. Mentors', parents' and Leads' photos are approved right away.
-- Named so it fires after profiles_guard_self_edit and profiles_normalize.
create or replace function public.profiles_photo_status()
returns trigger language plpgsql as $$
begin
  if new.photo_path is distinct from old.photo_path then
    if new.photo_path is null then
      new.photo_status := 'none';
      new.avatar_mode := 'avatar';
    elsif public.is_lead() or new.role <> 'student' or new.photo_auto_approve then
      new.photo_status := 'approved';
    else
      new.photo_status := 'pending';
    end if;
  end if;
  return new;
end$$;

drop trigger if exists profiles_photo_status on public.profiles;
create trigger profiles_photo_status
  before update on public.profiles
  for each row execute function public.profiles_photo_status();

-- Parents may edit their child's profile row (guard above still applies).
drop policy if exists "parents update child profile" on public.profiles;
create policy "parents update child profile" on public.profiles for update
  using (public.is_guardian_of(id))
  with check (public.is_guardian_of(id));

-- Every active member can see who is linked to whom (names on the Roster).
drop policy if exists "members read guardian links" on public.guardian_links;
create policy "members read guardian links" on public.guardian_links for select
  using (public.is_active_member());

-- ============================================================
-- 2. Private sections, one table per access grant
-- ============================================================
create table if not exists public.profile_birthday (        -- self chooses Self or All
  user_id uuid primary key references public.profiles(id) on delete cascade,
  month smallint not null check (month between 1 and 12),
  day smallint not null check (day between 1 and 31),
  is_public boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_contact (         -- Student contact / Parent contact
  user_id uuid primary key references public.profiles(id) on delete cascade,
  phone text,
  personal_email text,
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_guardians (       -- Parent contact: guardians without an account
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  relationship text,
  email text,
  phone text,
  employer text,
  sort smallint not null default 1,
  updated_at timestamptz not null default now()
);
create index if not exists profile_guardians_student_idx on public.profile_guardians (student_id);

create table if not exists public.profile_household (       -- Address grant
  user_id uuid primary key references public.profiles(id) on delete cascade,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  zip text,
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_health (          -- Emergency grant
  user_id uuid primary key references public.profiles(id) on delete cascade,
  emergency_name text,
  emergency_relationship text,
  emergency_phone text,
  allergies text,
  medical_notes text,
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_logistics (       -- Logistics grant
  user_id uuid primary key references public.profiles(id) on delete cascade,
  shirt_size text check (shirt_size in ('YS','YM','YL','S','M','L','XL','2XL','3XL')),
  transportation text check (transportation in ('drives_self','parent_drives','needs_ride','other')),
  other_commitments text,
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_skills (          -- no grant: self, parents, Leads
  user_id uuid primary key references public.profiles(id) on delete cascade,
  skills text,
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_consents (        -- no grant: self, parents, Leads
  user_id uuid primary key references public.profiles(id) on delete cascade,
  parental_permission_at timestamptz,
  parental_permission_by uuid references public.profiles(id) on delete set null,
  media_consent boolean,
  media_consent_at timestamptz,
  media_consent_by uuid references public.profiles(id) on delete set null,
  contact_ack_at timestamptz,
  contact_ack_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_admin (           -- Leads only
  user_id uuid primary key references public.profiles(id) on delete cascade,
  first_registered boolean not null default false,
  first_consent_done boolean not null default false,
  ypp_status text check (ypp_status in ('none','pending','cleared','expired')),
  ypp_expires date,
  dues_paid_season int,
  notes text,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 3. Access grants
-- ============================================================
create table if not exists public.profile_access_grants (
  id uuid primary key default gen_random_uuid(),
  grantee uuid not null references public.profiles(id) on delete cascade,
  scope text not null check (scope in ('student_contact','parent_contact','address','emergency','logistics')),
  subteams text[],                      -- null = whole team
  expires_on date,                      -- null = until revoked
  granted_by uuid references public.profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  revoked_by uuid references public.profiles(id) on delete set null,
  revoked_at timestamptz
);
create index if not exists profile_access_grants_grantee_idx on public.profile_access_grants (grantee) where revoked_at is null;

-- Only mentors, Team Captains and Sub-Team Leads can hold a grant.
create or replace function public.profile_grant_check()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = new.grantee and p.status = 'active'
      and (p.role = 'mentor' or (p.role = 'student' and p.student_title in ('team_captain','subteam_lead')))
  ) then
    raise exception 'Grants can only go to active mentors, Team Captains or Sub-Team Leads.';
  end if;
  if new.subteams is not null and cardinality(new.subteams) = 0 then new.subteams := null; end if;
  return new;
end$$;

drop trigger if exists profile_grant_check on public.profile_access_grants;
create trigger profile_grant_check
  before insert on public.profile_access_grants
  for each row execute function public.profile_grant_check();

-- Subteams a member belongs to; for a parent, their linked students' subteams.
create or replace function public.subteams_of(subject uuid)
returns text[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct s), '{}'::text[]) from (
    select unnest(p.subteams) as s from public.profiles p where p.id = subject
    union
    select unnest(p.subteams) from public.guardian_links g
      join public.profiles p on p.id = g.student_id
     where g.parent_id = subject
  ) x;
$$;

-- Is this member linked to a student as a parent?
create or replace function public.is_parent_account(subject uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.guardian_links where parent_id = subject);
$$;

-- Family: a parent of the subject, the subject's own student, or a co-parent.
create or replace function public.is_family_of(subject uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_guardian_of(subject)
      or exists (select 1 from public.guardian_links where parent_id = subject and student_id = auth.uid())
      or exists (
        select 1 from public.guardian_links a
        join public.guardian_links b on a.student_id = b.student_id
        where a.parent_id = subject and b.parent_id = auth.uid());
$$;

-- Does the signed-in user hold a live grant for this scope that covers the subject?
create or replace function public.has_grant(subject uuid, want text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profile_access_grants g
    join public.profiles me on me.id = auth.uid() and me.status = 'active'
    where g.grantee = auth.uid() and g.scope = want and g.revoked_at is null
      and (g.expires_on is null or g.expires_on >= current_date)
      and (g.subteams is null or g.subteams && public.subteams_of(subject)));
$$;

-- Read rule for a private section: self, Leads, parents (and family for
-- contact), or a grant holder for that scope.
create or replace function public.can_see(subject uuid, want text)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() = subject
      or public.is_lead()
      or public.is_guardian_of(subject)
      or (want in ('student_contact','parent_contact') and public.is_family_of(subject))
      or (want is not null and public.has_grant(subject, want));
$$;

-- Write rule for a private section: self, Leads, or a parent of the member.
create or replace function public.can_edit_profile(subject uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() = subject or public.is_lead() or public.is_guardian_of(subject);
$$;

-- Contact rows of a parent are covered by the Parent contact grant.
create or replace function public.contact_scope(subject uuid)
returns text language sql stable security definer set search_path = public as $$
  select case when public.is_parent_account(subject) then 'parent_contact' else 'student_contact' end;
$$;

-- ============================================================
-- 4. Parent link requests
-- ============================================================
create table if not exists public.guardian_link_requests (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  student_name text not null,
  student_id uuid references public.profiles(id) on delete set null,   -- set by the approving Lead
  status text not null default 'pending' check (status in ('pending','approved','declined')),
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists guardian_link_requests_pending_idx on public.guardian_link_requests (created_at) where status = 'pending';

-- ============================================================
-- 5. Edit history (written only by triggers)
-- ============================================================
create table if not exists public.profile_changes (
  id bigint generated always as identity primary key,
  subject uuid not null references public.profiles(id) on delete cascade,
  editor uuid references public.profiles(id) on delete set null,
  editor_kind text not null check (editor_kind in ('self','parent','lead','system')),
  section text not null,
  action text not null check (action in ('added','edited','cleared','granted','revoked','approved','rejected')),
  fields text[] not null default '{}',
  old_values jsonb,
  new_values jsonb,
  changed_at timestamptz not null default now()
);
create index if not exists profile_changes_subject_idx on public.profile_changes (subject, changed_at desc);

create or replace function public.profile_editor_kind(subject uuid)
returns text language sql stable security definer set search_path = public as $$
  select case
    when auth.uid() is null then 'system'
    when auth.uid() = subject then 'self'
    when public.is_lead() then 'lead'
    when public.is_guardian_of(subject) then 'parent'
    else 'system' end;
$$;

-- Generic row logger. TG_ARGV[0] = the column holding the member's id.
create or replace function public.profile_log_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  o jsonb := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else '{}'::jsonb end;
  n jsonb := case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else '{}'::jsonb end;
  subj uuid := coalesce(n ->> tg_argv[0], o ->> tg_argv[0])::uuid;
  skip text[] := array['id','user_id','student_id','updated_at','created_at','is_active','sort'];
  k text;
  changed text[] := '{}';
  ov jsonb := '{}'::jsonb;
  nv jsonb := '{}'::jsonb;
  all_empty boolean := true;
  act text;
begin
  for k in select jsonb_object_keys(o || n) loop
    continue when k = any(skip);
    if nullif(o -> k, 'null'::jsonb) is distinct from nullif(n -> k, 'null'::jsonb) then
      changed := changed || k;
      ov := ov || jsonb_build_object(k, o -> k);
      nv := nv || jsonb_build_object(k, n -> k);
      if coalesce(o ->> k, '') not in ('', '[]', '{}') then all_empty := false; end if;
    end if;
  end loop;
  if cardinality(changed) = 0 then return null; end if;

  act := case
    when tg_op = 'DELETE' then 'cleared'
    when tg_table_name = 'profiles' and 'photo_status' = any(changed) and n ->> 'photo_status' = 'approved'
         and not ('photo_path' = any(changed)) then 'approved'
    when tg_table_name = 'profiles' and 'photo_status' = any(changed) and n ->> 'photo_status' = 'rejected' then 'rejected'
    when all_empty then 'added'
    else 'edited' end;

  insert into public.profile_changes (subject, editor, editor_kind, section, action, fields, old_values, new_values)
  values (subj, auth.uid(), public.profile_editor_kind(subj), tg_table_name, act, changed,
          case when tg_op = 'INSERT' then null else ov end,
          case when tg_op = 'DELETE' then null else nv end);
  return null;
end$$;

drop trigger if exists profile_log on public.profiles;
create trigger profile_log after update on public.profiles
  for each row execute function public.profile_log_change('id');

do $$
declare t text;
begin
  foreach t in array array['profile_birthday','profile_contact','profile_household','profile_health',
                           'profile_logistics','profile_skills','profile_consents','profile_admin'] loop
    execute format('drop trigger if exists profile_log on public.%I', t);
    execute format('create trigger profile_log after insert or update or delete on public.%I
                    for each row execute function public.profile_log_change(%L)', t, 'user_id');
  end loop;
end $$;

drop trigger if exists profile_log on public.profile_guardians;
create trigger profile_log after insert or update or delete on public.profile_guardians
  for each row execute function public.profile_log_change('student_id');

-- Grants given / revoked are logged against the person who holds them.
create or replace function public.profile_log_grant()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.profile_changes (subject, editor, editor_kind, section, action, fields, new_values)
    values (new.grantee, auth.uid(), public.profile_editor_kind(new.grantee), 'grant', 'granted', array[new.scope],
            jsonb_build_object('scope', new.scope, 'subteams', new.subteams, 'expires_on', new.expires_on));
  elsif new.revoked_at is not null and old.revoked_at is null then
    insert into public.profile_changes (subject, editor, editor_kind, section, action, fields, old_values)
    values (new.grantee, auth.uid(), public.profile_editor_kind(new.grantee), 'grant', 'revoked', array[new.scope],
            jsonb_build_object('scope', new.scope, 'subteams', new.subteams, 'expires_on', new.expires_on));
  end if;
  return null;
end$$;

drop trigger if exists profile_log on public.profile_access_grants;
create trigger profile_log after insert or update on public.profile_access_grants
  for each row execute function public.profile_log_grant();

-- Parent links added / removed are logged against the student.
create or replace function public.profile_log_guardian_link()
returns trigger language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if tg_op = 'DELETE' then r := old; else r := new; end if;
  insert into public.profile_changes (subject, editor, editor_kind, section, action, fields, old_values, new_values)
  values (r.student_id, auth.uid(), public.profile_editor_kind(r.student_id), 'guardian_links',
          case when tg_op = 'DELETE' then 'cleared' else 'added' end, array['parent_id'],
          case when tg_op = 'DELETE' then jsonb_build_object('parent_id', r.parent_id) end,
          case when tg_op = 'INSERT' then jsonb_build_object('parent_id', r.parent_id) end);
  return null;
end$$;

drop trigger if exists profile_log on public.guardian_links;
create trigger profile_log after insert or delete on public.guardian_links
  for each row execute function public.profile_log_guardian_link();

-- ============================================================
-- 6. Row-level security
-- ============================================================
alter table public.profile_birthday enable row level security;
alter table public.profile_contact enable row level security;
alter table public.profile_guardians enable row level security;
alter table public.profile_household enable row level security;
alter table public.profile_health enable row level security;
alter table public.profile_logistics enable row level security;
alter table public.profile_skills enable row level security;
alter table public.profile_consents enable row level security;
alter table public.profile_admin enable row level security;
alter table public.profile_access_grants enable row level security;
alter table public.guardian_link_requests enable row level security;
alter table public.profile_changes enable row level security;

-- Read policies
drop policy if exists "read" on public.profile_birthday;
create policy "read" on public.profile_birthday for select
  using (public.can_edit_profile(user_id) or (is_public and public.is_active_member()));
drop policy if exists "read" on public.profile_contact;
create policy "read" on public.profile_contact for select
  using (public.can_see(user_id, public.contact_scope(user_id)));
drop policy if exists "read" on public.profile_guardians;
create policy "read" on public.profile_guardians for select
  using (public.can_see(student_id, 'parent_contact'));
drop policy if exists "read" on public.profile_household;
create policy "read" on public.profile_household for select
  using (public.can_see(user_id, 'address'));
drop policy if exists "read" on public.profile_health;
create policy "read" on public.profile_health for select
  using (public.can_see(user_id, 'emergency'));
drop policy if exists "read" on public.profile_logistics;
create policy "read" on public.profile_logistics for select
  using (public.can_see(user_id, 'logistics'));
drop policy if exists "read" on public.profile_skills;
create policy "read" on public.profile_skills for select
  using (public.can_edit_profile(user_id));
drop policy if exists "read" on public.profile_consents;
create policy "read" on public.profile_consents for select
  using (public.can_edit_profile(user_id));
drop policy if exists "read" on public.profile_admin;
create policy "read" on public.profile_admin for select using (public.is_lead());

-- Write policies: self, parents, Leads (profile_admin: Leads only)
do $$
declare t text;
begin
  foreach t in array array['profile_birthday','profile_contact','profile_household','profile_health',
                           'profile_logistics','profile_skills','profile_consents'] loop
    execute format('drop policy if exists "write" on public.%I', t);
    execute format('create policy "write" on public.%I for insert with check (public.can_edit_profile(user_id))', t);
    execute format('drop policy if exists "update" on public.%I', t);
    execute format('create policy "update" on public.%I for update using (public.can_edit_profile(user_id)) with check (public.can_edit_profile(user_id))', t);
    execute format('drop policy if exists "delete" on public.%I', t);
    execute format('create policy "delete" on public.%I for delete using (public.can_edit_profile(user_id))', t);
  end loop;
end $$;

drop policy if exists "write" on public.profile_guardians;
create policy "write" on public.profile_guardians for insert with check (public.can_edit_profile(student_id));
drop policy if exists "update" on public.profile_guardians;
create policy "update" on public.profile_guardians for update
  using (public.can_edit_profile(student_id)) with check (public.can_edit_profile(student_id));
drop policy if exists "delete" on public.profile_guardians;
create policy "delete" on public.profile_guardians for delete using (public.can_edit_profile(student_id));

drop policy if exists "leads write" on public.profile_admin;
create policy "leads write" on public.profile_admin for all
  using (public.is_lead()) with check (public.is_lead());

-- Grants: Leads manage; holders see their own
drop policy if exists "read" on public.profile_access_grants;
create policy "read" on public.profile_access_grants for select
  using (public.is_lead() or grantee = auth.uid());
drop policy if exists "leads write" on public.profile_access_grants;
create policy "leads write" on public.profile_access_grants for all
  using (public.is_lead()) with check (public.is_lead());

-- Link requests: a parent files their own; Leads decide
drop policy if exists "read" on public.guardian_link_requests;
create policy "read" on public.guardian_link_requests for select
  using (parent_id = auth.uid() or public.is_lead());
drop policy if exists "file own" on public.guardian_link_requests;
create policy "file own" on public.guardian_link_requests for insert
  with check (parent_id = auth.uid() and status = 'pending' and student_id is null);
drop policy if exists "withdraw own" on public.guardian_link_requests;
create policy "withdraw own" on public.guardian_link_requests for delete
  using ((parent_id = auth.uid() and status = 'pending') or public.is_lead());
drop policy if exists "leads decide" on public.guardian_link_requests;
create policy "leads decide" on public.guardian_link_requests for update
  using (public.is_lead()) with check (public.is_lead());

-- History: Leads see all; a member and their parents see the member's.
-- No insert/update/delete policies, so the log can't be changed from the app.
drop policy if exists "read" on public.profile_changes;
create policy "read" on public.profile_changes for select
  using (public.is_lead()
         or ((subject = auth.uid() or public.is_guardian_of(subject)) and section <> 'profile_admin'));

-- ============================================================
-- 7. Sign-up: remember who is joining as what (a Lead still approves)
-- ============================================================
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  u text;
  n text;
  r text;
begin
  u := coalesce(lower(nullif(trim(new.raw_user_meta_data->>'username'), '')),
                regexp_replace(lower(split_part(new.email,'@',1)), '[^a-z0-9_.-]', '', 'g'));
  n := coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), u);
  r := coalesce(new.raw_user_meta_data->>'joining_as', 'student');
  if r not in ('student','mentor','parent') then r := 'student'; end if;
  while exists (select 1 from public.profiles where username = u) loop
    u := u || substr(replace(gen_random_uuid()::text,'-',''), 1, 3);
  end loop;
  insert into public.profiles (id, username, full_name, email, role, status)
  values (new.id, u, n, new.email, r, 'pending');
  -- A parent can name their students at sign-up; a Lead approves each link.
  if jsonb_typeof(new.raw_user_meta_data->'student_names') = 'array' then
    insert into public.guardian_link_requests (parent_id, student_name)
    select new.id, left(trim(x), 120)
      from jsonb_array_elements_text(new.raw_user_meta_data->'student_names') as x
     where trim(x) <> ''
     limit 6;
  end if;
  return new;
end$$;

-- ============================================================
-- 8. Photo storage (private bucket; the server signs URLs for approved photos)
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.avatar_owner(object_name text)
returns uuid language sql immutable as $$
  select case when split_part(object_name, '/', 1) ~ '^[0-9a-f-]{36}$'
              then split_part(object_name, '/', 1)::uuid end;
$$;

drop policy if exists "avatars read" on storage.objects;
create policy "avatars read" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and public.can_edit_profile(public.avatar_owner(name)));
drop policy if exists "avatars upload" on storage.objects;
create policy "avatars upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and public.can_edit_profile(public.avatar_owner(name)));
drop policy if exists "avatars update" on storage.objects;
create policy "avatars update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and public.can_edit_profile(public.avatar_owner(name)));
drop policy if exists "avatars delete" on storage.objects;
create policy "avatars delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and public.can_edit_profile(public.avatar_owner(name)));
