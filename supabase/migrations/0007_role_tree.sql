-- Role tree for the admin role editor (see lib/roles.ts).
--   Student -> student_title: null (Member) | subteam_lead | team_captain   (unchanged)
--   Mentor  -> mentor_title:  null (Mentor) | programming | mechanical | build | business | media | drive_team | ...
--   Lead    -> lead_title:    null (Lead) | lead_coach_1 | lead_coach_2 | finance   (old coach/team_admin still allowed)
--   Parent  -> has_student:   true | false
-- Safe to run more than once. Existing data is not changed.

-- Mentor area. No check constraint on purpose: new areas are added in lib/roles.ts only.
alter table public.profiles add column if not exists mentor_title text;

-- Parent only / Volunteer: do they have a student on the team?
alter table public.profiles add column if not exists has_student boolean;

-- New lead titles, keeping the old ones valid until each account is re-saved.
alter table public.profiles drop constraint if exists profiles_lead_title_check;
alter table public.profiles add constraint profiles_lead_title_check
  check (lead_title in ('lead_coach_1','lead_coach_2','finance','coach','team_admin'));

-- Keep sub-roles aligned with role: each one is nulled when the role doesn't use it.
create or replace function public.profiles_normalize()
returns trigger language plpgsql as $$
begin
  new.username := lower(trim(new.username));
  new.email := lower(trim(new.email));
  new.updated_at := now();
  if new.role <> 'lead' then new.lead_title := null; end if;
  if new.role <> 'student' then new.student_title := null; end if;
  if new.role <> 'mentor' then new.mentor_title := null; end if;
  if new.role <> 'parent' then new.has_student := null; end if;
  return new;
end$$;

-- Only Leads can change role, status, any sub-role, username, or email.
create or replace function public.profiles_guard_self_edit()
returns trigger language plpgsql as $$
begin
  if auth.uid() = new.id and not public.is_lead() then
    if new.role is distinct from old.role
       or new.status is distinct from old.status
       or new.lead_title is distinct from old.lead_title
       or new.student_title is distinct from old.student_title
       or new.mentor_title is distinct from old.mentor_title
       or new.has_student is distinct from old.has_student
       or new.username is distinct from old.username
       or new.email is distinct from old.email then
      raise exception 'Only a Lead can change role, status, titles, username, or email.';
    end if;
  end if;
  return new;
end$$;

-- Calendar starting permissions: Team Admin keeps its own defaults; every other Lead
-- title (including the new ones) starts with the coach defaults, as before.
create or replace function public.cal_role_key(p public.profiles)
returns text language sql immutable as $$
  select case p.role
    when 'lead' then case when p.lead_title = 'team_admin' then 'team_admin' else 'coach' end
    else p.role
  end;
$$;
