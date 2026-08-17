-- Run after supabase/training-evaluations.sql, which defines public.is_coach()/is_admin()/current_member_id().
-- This migration converts training_evaluations from a score to an attendance-type record,
-- and adds a member self-report table for activities that do not count toward the official
-- attendance rate (free swim / 4-person meetups).

-- 1. training_evaluations: score -> attendance_type -------------------------------------------

-- Existing test rows (score-based) are discarded intentionally; attendance_type is NOT NULL
-- from the start, so there is nothing meaningful to backfill them with.
delete from public.training_evaluations;

alter table public.training_evaluations
  drop column score,
  add column attendance_type text not null default '출석',
  add constraint training_evaluations_attendance_type_check
    check (attendance_type in ('출석', '지각', '인정결석', '미인정결석'));

alter table public.training_evaluations
  alter column attendance_type drop default;

-- RLS policies on training_evaluations are unchanged (§training-evaluations.sql) — none of them
-- reference the score/attendance_type column, only session_id/member_id/created_by.

-- 2. self_reported_activities -------------------------------------------------------------------

create table if not exists public.self_reported_activities (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id),
  activity_type text not null check (activity_type in ('자유수영', '4인모임')),
  date date not null,
  created_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approved_by uuid references auth.users(id),
  approved_at timestamptz
);

create index if not exists self_reported_activities_member_id_idx
  on public.self_reported_activities (member_id);
create index if not exists self_reported_activities_date_idx
  on public.self_reported_activities (date);

alter table public.self_reported_activities enable row level security;

-- Members can only ever insert their own record, and only in the pending state — they cannot
-- pre-approve themselves or set approved_by/approved_at.
create policy "Members insert their own self-reported activities"
on public.self_reported_activities for insert
to authenticated
with check (
  member_id = public.current_member_id()
  and status = 'pending'
  and approved_by is null
  and approved_at is null
);

create policy "Members read their own self-reported activities"
on public.self_reported_activities for select
to authenticated
using (member_id = public.current_member_id());

create policy "Coaches read all self-reported activities"
on public.self_reported_activities for select
to authenticated
using (public.is_coach());

create policy "Admins read all self-reported activities"
on public.self_reported_activities for select
to authenticated
using (public.is_admin());

-- Admins are expected to update only status/approved_by/approved_at (enforced by the app, not
-- by column-level RLS). No delete policy exists for anyone by design — corrections go through
-- status = 'rejected' rather than removing rows.
create policy "Admins update self-reported activity approval"
on public.self_reported_activities for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- 3. Monthly attendance rate --------------------------------------------------------------------
-- Implemented as a SECURITY DEFINER function rather than a view: a plain view would run with the
-- view owner's privileges and could bypass the RLS on training_sessions/training_evaluations/
-- members, so role-scoping is done explicitly inside the function body instead (same pattern as
-- coach_member_directory() / active_popups() in the other migrations).
--
-- Approved self-reported activities contribute their configured score. The denominator remains
-- the total number of sessions held that month, so a session the coach never evaluated for a
-- given member still counts against them (weight 0).
create or replace function public.monthly_attendance_rates(p_year int default null, p_month int default null)
returns table (
  member_id uuid,
  member_name text,
  month date,
  session_count bigint,
  attendance_rate numeric,
  self_report_score numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with approved_self_report_scores as (
    select
      sra.member_id,
      date_trunc('month', sra.date)::date as month,
      sum(case sra.activity_type
        when '자유수영' then 0.5
        when '3인훈련' then 0.75
        when '4인모임' then 0.5
        else 0
      end)::numeric as self_report_score
    from public.self_reported_activities sra
    where sra.status = 'approved'
    group by sra.member_id, date_trunc('month', sra.date)::date
  )
  select
    m.id,
    m.name,
    date_trunc('month', ts.date)::date,
    count(distinct ts.id),
    round(
      (
        coalesce(sum(case te.attendance_type
          when '출석' then 1.0
          when '지각' then 0.8
          when '인정결석' then 0.5
          when '미인정결석' then 0
          else 0
        end), 0)
        + coalesce(srs.self_report_score, 0)
      ) / count(distinct ts.id) * 100,
      1
    ),
    coalesce(srs.self_report_score, 0)::numeric
  from public.members m
  join public.training_sessions ts on true
  left join public.training_evaluations te
    on te.session_id = ts.id and te.member_id = m.id
  left join approved_self_report_scores srs
    on srs.member_id = m.id
    and srs.month = date_trunc('month', ts.date)::date
  where m.status = 'active'
    and (public.is_coach() or public.is_admin() or m.id = public.current_member_id())
    and (p_year is null or extract(year from ts.date) = p_year)
    and (p_month is null or extract(month from ts.date) = p_month)
  group by m.id, m.name, date_trunc('month', ts.date), srs.self_report_score;
$$;

revoke all on function public.monthly_attendance_rates(int, int) from public;
grant execute on function public.monthly_attendance_rates(int, int) to authenticated;
