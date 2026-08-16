-- Run after supabase/session-details-categories.sql.
-- Per-rep set times: each row is one member's time for one rep of a given
-- training_session_details row (a WARM-UP/MAIN SET/EVENTS/COOL-DOWN detail line).

create table if not exists public.training_set_times (
  id uuid primary key default gen_random_uuid(),
  session_detail_id uuid not null references public.training_session_details(id) on delete cascade,
  member_id uuid not null references public.members(id),
  rep_number integer not null check (rep_number > 0),
  time_seconds numeric not null check (time_seconds > 0),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (session_detail_id, member_id, rep_number)
);

-- rep_number is not checked against the detail row's planned `sets` count here —
-- that validation belongs to the app layer (coach input UI), not the DB.

create index if not exists training_set_times_session_detail_id_idx
  on public.training_set_times (session_detail_id);
create index if not exists training_set_times_member_id_idx
  on public.training_set_times (member_id);

alter table public.training_set_times enable row level security;

-- Members (including OB) can read their own past times.
create policy "Members read their own set times"
on public.training_set_times for select
to authenticated
using (member_id = public.current_member_id());

create policy "Coaches read all set times"
on public.training_set_times for select
to authenticated
using (public.is_coach());

create policy "Admins read all set times"
on public.training_set_times for select
to authenticated
using (public.is_admin());

-- Same ownership model as training_session_details: a coach may only manage set
-- times for detail rows that belong to a session they created, and only for
-- currently active members.
create policy "Coaches manage set times for their own sessions"
on public.training_set_times for all
to authenticated
using (
  exists (
    select 1 from public.training_session_details tsd
    join public.training_sessions ts on ts.id = tsd.session_id
    where tsd.id = session_detail_id and ts.created_by = auth.uid() and public.is_coach()
  )
)
with check (
  exists (
    select 1 from public.training_session_details tsd
    join public.training_sessions ts on ts.id = tsd.session_id
    where tsd.id = session_detail_id and ts.created_by = auth.uid() and public.is_coach()
  )
  and public.member_is_active(member_id)
);

create policy "Admins manage all set times"
on public.training_set_times for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
