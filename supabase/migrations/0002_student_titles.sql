-- Add student titles: Team Captain and Sub-Team Lead sit above regular students.
-- Safe to run on top of 0001_portal.sql.

alter table public.profiles
  add column if not exists student_title text;

do $$ begin
  alter table public.profiles add constraint profiles_student_title_chk
    check (student_title in ('team_captain','subteam_lead'));
exception when duplicate_object then null; end $$;

-- Keep student_title aligned with role: nulled when role isn't 'student'.
create or replace function public.profiles_normalize()
returns trigger language plpgsql as $$
begin
  new.username := lower(trim(new.username));
  new.email := lower(trim(new.email));
  new.updated_at := now();
  if new.role <> 'lead' then new.lead_title := null; end if;
  if new.role <> 'student' then new.student_title := null; end if;
  return new;
end$$;

drop trigger if exists profiles_normalize on public.profiles;
create trigger profiles_normalize
  before insert or update on public.profiles
  for each row execute function public.profiles_normalize();

-- Guard: only Leads can change a member's student_title too.
create or replace function public.profiles_guard_self_edit()
returns trigger language plpgsql as $$
begin
  if auth.uid() = new.id and not public.is_lead() then
    if new.role is distinct from old.role
       or new.status is distinct from old.status
       or new.lead_title is distinct from old.lead_title
       or new.student_title is distinct from old.student_title
       or new.username is distinct from old.username
       or new.email is distinct from old.email then
      raise exception 'Only a Lead can change role, status, lead_title, student_title, username, or email.';
    end if;
  end if;
  return new;
end$$;

drop trigger if exists profiles_guard_self_edit on public.profiles;
create trigger profiles_guard_self_edit
  before update on public.profiles
  for each row execute function public.profiles_guard_self_edit();
