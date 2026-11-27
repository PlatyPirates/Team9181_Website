-- Team Admin (a superuser checkbox on Leads) and Alumni (a tag on Mentors).
-- Builds on 0007_role_tree.sql and 0008_profile.sql. Run after both. Safe to re-run.

alter table public.profiles add column if not exists is_team_admin boolean not null default false;
alter table public.profiles add column if not exists is_alumni boolean not null default false;

-- The old 'team_admin' lead title becomes the checkbox (title goes back to the default "Lead").
update public.profiles
   set is_team_admin = true, lead_title = null
 where role = 'lead' and lead_title = 'team_admin';

alter table public.profiles drop constraint if exists profiles_lead_title_check;
alter table public.profiles add constraint profiles_lead_title_check
  check (lead_title in ('lead_coach_1','lead_coach_2','finance','coach'));

-- Keep sub-roles and flags aligned with role.
create or replace function public.profiles_normalize()
returns trigger language plpgsql as $$
begin
  new.username := lower(trim(new.username));
  new.email := lower(trim(new.email));
  new.updated_at := now();
  if new.role <> 'lead' then new.lead_title := null; new.is_team_admin := false; end if;
  if new.role <> 'student' then new.student_title := null; end if;
  if new.role <> 'mentor' then new.mentor_title := null; new.is_alumni := false; end if;
  if new.role <> 'parent' then new.has_student := null; end if;
  return new;
end$$;

-- Same as 0008_profile.sql, plus is_team_admin and is_alumni.
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
       or new.is_team_admin is distinct from old.is_team_admin
       or new.is_alumni is distinct from old.is_alumni
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

-- Is this account an active Team Admin?
create or replace function public.is_team_admin(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select uid is not null and exists (
    select 1 from public.profiles
    where id = uid and role = 'lead' and is_team_admin and status = 'active'
  );
$$;

-- Calendar starting permissions: Team Admins get the team_admin set, other Leads the coach set.
create or replace function public.cal_role_key(p public.profiles)
returns text language sql immutable as $$
  select case p.role
    when 'lead' then case when p.is_team_admin then 'team_admin' else 'coach' end
    else p.role
  end;
$$;

-- Superuser: a Team Admin passes every calendar permission check in the database,
-- whatever is ticked in the grid.
create or replace function public.cal_user_has_perm(uid uuid, perm text)
returns boolean language sql stable security definer set search_path = public as $$
  select uid is not null and (
    public.is_team_admin(uid)
    or exists (
      select 1 from public.calendar_user_permissions cp
      join public.profiles p on p.id = cp.user_id
      where cp.user_id = uid and cp.permission = perm and p.status = 'active'
    )
  );
$$;

-- Making someone Team Admin also ticks every calendar permission for them,
-- so the app's own checks and the permissions grid show it too.
create or replace function public.grant_team_admin_perms()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role = 'lead' and new.is_team_admin
     and (tg_op = 'INSERT' or not coalesce(old.is_team_admin, false) or old.role <> 'lead') then
    insert into public.calendar_user_permissions (user_id, permission, granted_by)
    select new.id, cp.key, auth.uid() from public.calendar_permissions cp
    on conflict do nothing;
  end if;
  return new;
end$$;

drop trigger if exists profiles_team_admin_perms on public.profiles;
create trigger profiles_team_admin_perms
  after insert or update of role, is_team_admin on public.profiles
  for each row execute function public.grant_team_admin_perms();

-- Existing Team Admins: tick everything now.
insert into public.calendar_user_permissions (user_id, permission)
select p.id, cp.key
from public.profiles p cross join public.calendar_permissions cp
where p.role = 'lead' and p.is_team_admin
on conflict do nothing;
