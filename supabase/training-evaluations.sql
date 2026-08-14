-- Run once in the Supabase SQL Editor.
-- This migration extends member roles and creates the coach-managed training data model.

do $$
declare
  role_constraint record;
begin
  for role_constraint in
    select conname
    from pg_constraint
    where conrelid = 'public.members'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%role%'
  loop
    execute format('alter table public.members drop constraint %I', role_constraint.conname);
  end loop;
end $$;

alter table public.members
  alter column role drop default,
  alter column role type text using role::text,
  alter column role set default 'member',
  add constraint members_role_check
  check (role in ('member', 'coach', 'admin'));

update public.members
set role = 'coach'
where email = 'ghftl136@snu.ac.kr';

-- These SECURITY DEFINER helpers keep policies from querying members directly,
-- avoiding RLS recursion. They expose only the caller's own role or member id.
create or replace function public.current_member_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select m.role
  from public.members m
  where m.email = (auth.jwt() ->> 'email')
  limit 1;
$$;

create or replace function public.current_member_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.id
  from public.members m
  where m.email = (auth.jwt() ->> 'email')
  limit 1;
$$;

create or replace function public.is_coach()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_member_role() = 'coach';
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_member_role() = 'admin';
$$;

revoke all on function public.current_member_role() from public;
revoke all on function public.current_member_id() from public;
revoke all on function public.is_coach() from public;
revoke all on function public.is_admin() from public;
grant execute on function public.current_member_role() to authenticated;
grant execute on function public.current_member_id() to authenticated;
grant execute on function public.is_coach() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- Coaches need member ids and names to create evaluations, but must not receive
-- private member columns such as student_id or contact.
create or replace function public.coach_member_directory()
returns table (id uuid, name text)
language sql
stable
security definer
set search_path = public
as $$
  select m.id, m.name
  from public.members m
  where public.is_coach() or public.is_admin()
  order by m.name;
$$;

revoke all on function public.coach_member_directory() from public;
grant execute on function public.coach_member_directory() to authenticated;

create table if not exists public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  day text not null check (day in ('월', '화', '수', '목', '금', '토', '일')),
  total_distance integer check (total_distance is null or total_distance >= 0),
  warmup text,
  mainset text,
  events text,
  cooldown text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.training_evaluations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.training_sessions(id) on delete cascade,
  member_id uuid not null references public.members(id),
  score numeric,
  comment text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint training_evaluations_session_member_key unique (session_id, member_id)
);

create index if not exists training_sessions_date_idx
  on public.training_sessions (date);
create index if not exists training_evaluations_member_id_idx
  on public.training_evaluations (member_id);
create index if not exists training_evaluations_session_id_idx
  on public.training_evaluations (session_id);

alter table public.training_sessions enable row level security;
alter table public.training_evaluations enable row level security;

-- Session content is public because the homepage renders the latest sessions.
create policy "Anyone can read training sessions"
on public.training_sessions for select
to anon, authenticated
using (true);

create policy "Coaches create their own training sessions"
on public.training_sessions for insert
to authenticated
with check (public.is_coach() and created_by = auth.uid());

create policy "Coaches update their own training sessions"
on public.training_sessions for update
to authenticated
using (public.is_coach() and created_by = auth.uid())
with check (public.is_coach() and created_by = auth.uid());

create policy "Coaches delete their own training sessions"
on public.training_sessions for delete
to authenticated
using (public.is_coach() and created_by = auth.uid());

create policy "Admins manage all training sessions"
on public.training_sessions for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Members read their own evaluations"
on public.training_evaluations for select
to authenticated
using (member_id = public.current_member_id());

create policy "Coaches read their own evaluations"
on public.training_evaluations for select
to authenticated
using (public.is_coach() and created_by = auth.uid());

create policy "Coaches create their own evaluations"
on public.training_evaluations for insert
to authenticated
with check (public.is_coach() and created_by = auth.uid());

create policy "Coaches update their own evaluations"
on public.training_evaluations for update
to authenticated
using (public.is_coach() and created_by = auth.uid())
with check (public.is_coach() and created_by = auth.uid());

create policy "Coaches delete their own evaluations"
on public.training_evaluations for delete
to authenticated
using (public.is_coach() and created_by = auth.uid());

create policy "Admins manage all training evaluations"
on public.training_evaluations for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
