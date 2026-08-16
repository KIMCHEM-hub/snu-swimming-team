-- Run after attendance-schema.sql.
-- 실행 전 확인: self_reported_activities에 같은 member_id+date+그룹(자유수영/3인훈련 묶음, 또는 4인모임)으로
-- status가 pending/approved인 중복 행이 이미 있으면 unique index 생성이 실패함. 실행 전 아래 쿼리로 확인:
-- select member_id, date, case when activity_type in ('자유수영','3인훈련') then 'A' else 'B' end as grp, count(*)
-- from public.self_reported_activities where status in ('pending','approved')
-- group by 1,2,3 having count(*) > 1;
-- 결과가 있으면 먼저 정리할 것.

-- Add the three-person training self-report type and its participant record.
alter table public.self_reported_activities
  add column if not exists participants text;

alter table public.self_reported_activities
  drop constraint if exists self_reported_activities_activity_type_check;

alter table public.self_reported_activities
  add constraint self_reported_activities_activity_type_check
  check (activity_type in ('자유수영', '3인훈련', '4인모임'));

alter table public.self_reported_activities
  add constraint self_reported_activities_participants_check
  check (
    (activity_type = '3인훈련' and participants is not null)
    or (activity_type <> '3인훈련' and participants is null)
  );

-- A member may have one pending or approved report per day in each activity group:
-- group A is 자유수영 + 3인훈련, and group B is 4인모임.
create unique index self_reported_activities_daily_group_limit_idx
  on public.self_reported_activities (
    member_id,
    date,
    (case when activity_type in ('자유수영', '3인훈련') then 'A' else 'B' end)
  )
  where status in ('pending', 'approved');

-- Include approved self-reported activity points in the monthly attendance score.
-- There is intentionally no upper cap: scores above 120% must remain visible.
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

create table if not exists public.monthly_prizes (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id),
  year_month date not null check (year_month = date_trunc('month', year_month)::date),
  tier text not null check (tier in ('80', '100', '120', 'winner')),
  score numeric not null,
  distributed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (member_id, year_month, tier)
);

alter table public.monthly_prizes enable row level security;

create policy "Members read their own monthly prizes"
on public.monthly_prizes for select
to authenticated
using (member_id = public.current_member_id());

create policy "Admins read all monthly prizes"
on public.monthly_prizes for select
to authenticated
using (public.is_admin());

create policy "Admins insert monthly prizes"
on public.monthly_prizes for insert
to authenticated
with check (public.is_admin());

create policy "Admins update monthly prizes"
on public.monthly_prizes for update
to authenticated
using (public.is_admin())
with check (public.is_admin());
