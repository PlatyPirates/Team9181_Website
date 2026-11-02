-- Platy Pirates portal: profiles, roles, pending approval, RLS.
-- NUKE AND PAVE: drops the old `profiles` table before recreating.
-- Only run this on a database where you're OK losing existing profile rows.

drop table if exists public.profiles cascade;
drop function if exists public.is_lead() cascade;
drop function if exists public.is_active_member() cascade;
drop function if exists public.handle_new_auth_user() cascade;
drop function if exists public.email_for_login(text) cascade;

-- ============================================================
-- profiles
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text not null default '',
  email text not null,
  role text not null default 'student' check (role in ('student','mentor','lead')),
  lead_title text check (lead_title in ('coach','team_admin')),
  status text not null default 'pending' check (status in ('pending','active','disabled')),
  subteam text,
  is_active boolean generated always as (status = 'active') stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_username_lower_idx on public.profiles (lower(username));
create index profiles_role_idx on public.profiles (role);
create index profiles_status_idx on public.profiles (status);

-- Normalize username/email, bump updated_at, null out lead_title unless lead.
create or replace function public.profiles_normalize()
returns trigger language plpgsql as $$
begin
  new.username := lower(trim(new.username));
  new.email := lower(trim(new.email));
  new.updated_at := now();
  if new.role <> 'lead' then new.lead_title := null; end if;
  return new;
end$$;

create trigger profiles_normalize
  before insert or update on public.profiles
  for each row execute function public.profiles_normalize();

-- Auto-create a profile when a new auth user is created.
-- Signup form passes full_name + username via options.data.
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  u text;
  n text;
begin
  u := coalesce(lower(nullif(trim(new.raw_user_meta_data->>'username'), '')),
                regexp_replace(lower(split_part(new.email,'@',1)), '[^a-z0-9_.-]', '', 'g'));
  n := coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), u);
  while exists (select 1 from public.profiles where username = u) loop
    u := u || substr(replace(gen_random_uuid()::text,'-',''), 1, 3);
  end loop;
  insert into public.profiles (id, username, full_name, email, role, status)
  values (new.id, u, n, new.email, 'student', 'pending');
  return new;
end$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ============================================================
-- RLS helpers
-- ============================================================
create or replace function public.is_lead()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'lead' and status = 'active'
  );
$$;

create or replace function public.is_active_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'active'
  );
$$;

-- Block a member from editing their own role/status/username/email.
create or replace function public.profiles_guard_self_edit()
returns trigger language plpgsql as $$
begin
  if auth.uid() = new.id and not public.is_lead() then
    if new.role is distinct from old.role
       or new.status is distinct from old.status
       or new.lead_title is distinct from old.lead_title
       or new.username is distinct from old.username
       or new.email is distinct from old.email then
      raise exception 'Only a Lead can change role, status, lead_title, username, or email.';
    end if;
  end if;
  return new;
end$$;

create trigger profiles_guard_self_edit
  before update on public.profiles
  for each row execute function public.profiles_guard_self_edit();

-- ============================================================
-- RLS policies
-- ============================================================
alter table public.profiles enable row level security;

create policy "members read all profiles"
  on public.profiles for select
  using (public.is_active_member() or auth.uid() = id);

create policy "self update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "leads update any profile"
  on public.profiles for update
  using (public.is_lead())
  with check (true);

create policy "leads insert profiles"
  on public.profiles for insert
  with check (public.is_lead());

create policy "leads delete profiles"
  on public.profiles for delete
  using (public.is_lead());

-- ============================================================
-- Email lookup for "sign in with username OR email".
-- Callable by anon so the login form can resolve a username to an email.
-- ============================================================
create or replace function public.email_for_login(identifier text)
returns text language sql stable security definer set search_path = public as $$
  select email from public.profiles
    where (position('@' in identifier) > 0 and lower(email) = lower(identifier))
       or (position('@' in identifier) = 0 and username = lower(identifier))
  limit 1;
$$;

grant execute on function public.email_for_login(text) to anon, authenticated;

-- ============================================================
-- Bootstrap: after you sign up as yourself at /portal/signup, run
--   update public.profiles
--     set role='lead', lead_title='team_admin', status='active'
--     where email = 'you@example.com';
-- to become the first Lead.
-- ============================================================
