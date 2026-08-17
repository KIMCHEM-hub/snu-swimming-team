-- Run after supabase/training-evaluations.sql and supabase/attendance-schema.sql.
-- Do not run this file from the application. public.members.status is the source of truth.

alter table public.members add column if not exists status text;

do $$
begin
  if exists (select 1 from pg_constraint where conrelid = 'public.members'::regclass and conname = 'members_status_check') then
    alter table public.members drop constraint members_status_check;
  end if;
end $$;

update public.members set status = 'ob' where status = 'OB';
update public.members set status = 'active' where status is null;
alter table public.members alter column status set default 'active';
alter table public.members alter column status set not null;
alter table public.members add constraint members_status_check check (status in ('active', 'ob'));

create index if not exists members_status_idx on public.members (status);

-- SECURITY DEFINER helpers keep RLS policies from reading members directly.
create or replace function public.member_is_active(p_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.members m where m.id = p_member_id and m.status = 'active'
  );
$$;

revoke all on function public.member_is_active(uuid) from public;
grant execute on function public.member_is_active(uuid) to authenticated;

-- Coaches and admins only receive active members for new evaluations.
create or replace function public.coach_member_directory()
returns table (id uuid, name text)
language sql
stable
security definer
set search_path = public
as $$
  select m.id, m.name
  from public.members m
  where (public.is_coach() or public.is_admin())
    and m.status = 'active'
  order by m.name;
$$;

-- Admin-only status directory. No direct members-table policy is broadened.
create or replace function public.admin_member_directory()
returns table (id uuid, name text, status text)
language sql
stable
security definer
set search_path = public
as $$
  select m.id, m.name, m.status
  from public.members m
  where public.is_admin()
  order by m.name;
$$;

create or replace function public.set_member_status(p_member_id uuid, p_status text)
returns table (id uuid, name text, status text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator role required.' using errcode = '42501';
  end if;
  if p_status not in ('active', 'ob') then
    raise exception 'Invalid member status.' using errcode = '22023';
  end if;

  return query
  update public.members m
  set status = p_status
  where m.id = p_member_id
  returning m.id, m.name, m.status;

  if not found then
    raise exception 'Member not found.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.coach_member_directory() from public;
revoke all on function public.admin_member_directory() from public;
revoke all on function public.set_member_status(uuid, text) from public;
grant execute on function public.coach_member_directory() to authenticated;
grant execute on function public.admin_member_directory() to authenticated;
grant execute on function public.set_member_status(uuid, text) to authenticated;

-- ob members retain read access to their existing history, but no new self-report rows.
drop policy if exists "Members insert their own self-reported activities" on public.self_reported_activities;
drop policy if exists "Active members insert their own self-reported activities" on public.self_reported_activities;
create policy "Active members insert their own self-reported activities"
on public.self_reported_activities for insert
to authenticated
with check (
  member_id = public.current_member_id()
  and public.member_is_active(member_id)
  and status = 'pending'
  and approved_by is null
  and approved_at is null
);

-- Only active members can be the target of a new or changed evaluation. Existing rows stay,
-- including their original coach/admin DELETE permissions.
drop policy if exists "Coaches create their own evaluations" on public.training_evaluations;
drop policy if exists "Coaches update their own evaluations" on public.training_evaluations;
drop policy if exists "Coaches delete their own evaluations" on public.training_evaluations;
drop policy if exists "Admins manage all training evaluations" on public.training_evaluations;
drop policy if exists "Coaches create evaluations for active members" on public.training_evaluations;
drop policy if exists "Coaches update evaluations for active members" on public.training_evaluations;
drop policy if exists "Admins read all training evaluations" on public.training_evaluations;
drop policy if exists "Admins create evaluations for active members" on public.training_evaluations;
drop policy if exists "Admins update evaluations for active members" on public.training_evaluations;
drop policy if exists "Coaches delete evaluations" on public.training_evaluations;
drop policy if exists "Admins delete all training evaluations" on public.training_evaluations;

create policy "Coaches create evaluations for active members"
on public.training_evaluations for insert
to authenticated
with check (
  public.is_coach()
  and created_by = auth.uid()
  and public.member_is_active(member_id)
);

create policy "Coaches update evaluations for active members"
on public.training_evaluations for update
to authenticated
using (public.is_coach() and created_by = auth.uid() and public.member_is_active(member_id))
with check (public.is_coach() and created_by = auth.uid() and public.member_is_active(member_id));

create policy "Coaches delete evaluations"
on public.training_evaluations for delete
to authenticated
using (public.is_coach() and created_by = auth.uid());

create policy "Admins read all training evaluations"
on public.training_evaluations for select
to authenticated
using (public.is_admin());

create policy "Admins create evaluations for active members"
on public.training_evaluations for insert
to authenticated
with check (public.is_admin() and public.member_is_active(member_id));

create policy "Admins update evaluations for active members"
on public.training_evaluations for update
to authenticated
using (public.is_admin() and public.member_is_active(member_id))
with check (public.is_admin() and public.member_is_active(member_id));

create policy "Admins delete all training evaluations"
on public.training_evaluations for delete
to authenticated
using (public.is_admin());

-- monthly_attendance_rates intentionally returns active members only.
create or replace function public.monthly_attendance_rates(p_year int default null, p_month int default null)
returns table (member_id uuid, member_name text, month date, session_count bigint, attendance_rate numeric)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id,
    m.name,
    date_trunc('month', ts.date)::date,
    count(distinct ts.id),
    round(coalesce(sum(case te.attendance_type
      when '출석' then 1.0
      when '지각' then 0.8
      when '인정결석' then 0.5
      when '미인정결석' then 0
      else 0
    end), 0) / count(distinct ts.id) * 100, 1)
  from public.members m
  join public.training_sessions ts on true
  left join public.training_evaluations te on te.session_id = ts.id and te.member_id = m.id
  where m.status = 'active'
    and (public.is_coach() or public.is_admin() or m.id = public.current_member_id())
    and (p_year is null or extract(year from ts.date) = p_year)
    and (p_month is null or extract(month from ts.date) = p_month)
  group by m.id, m.name, date_trunc('month', ts.date);
$$;

revoke all on function public.monthly_attendance_rates(int, int) from public;
grant execute on function public.monthly_attendance_rates(int, int) to authenticated;
