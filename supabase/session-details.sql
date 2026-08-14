-- Run after supabase/training-evaluations.sql (defines is_coach()/is_admin()).
-- Adds an optional theme to training_sessions and a child table for the structured
-- stroke/distance/sets/pace breakdown shown in the session detail modal. This is purely
-- additive — the existing warmup/mainset/events/cooldown free-text fields on
-- training_sessions are unchanged and keep rendering alongside this breakdown.

alter table public.training_sessions
  add column if not exists theme text;

create table if not exists public.training_session_details (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.training_sessions(id) on delete cascade,
  stroke text not null check (stroke in ('freestyle', 'backstroke', 'breaststroke', 'butterfly', 'drill')),
  distance integer not null check (distance > 0),
  sets integer not null check (sets > 0),
  -- "x:xx" (mm:ss); nullable because not every set has a pace target.
  pace text check (pace is null or pace ~ '^[0-9]{1,2}:[0-5][0-9]$'),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists training_session_details_session_id_idx
  on public.training_session_details (session_id);

alter table public.training_session_details enable row level security;

-- Same ownership model as training_sessions: public read (homepage/TRAINING cards render
-- the modal without login), coach CRUD scoped to sessions they created, admin manages all.
create policy "Anyone can read session details"
on public.training_session_details for select
to anon, authenticated
using (true);

create policy "Coaches manage details for their own sessions"
on public.training_session_details for all
to authenticated
using (
  exists (
    select 1 from public.training_sessions ts
    where ts.id = session_id and ts.created_by = auth.uid() and public.is_coach()
  )
)
with check (
  exists (
    select 1 from public.training_sessions ts
    where ts.id = session_id and ts.created_by = auth.uid() and public.is_coach()
  )
);

create policy "Admins manage all session details"
on public.training_session_details for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
