-- Run after supabase/training-evaluations.sql, which defines public.is_admin().

create table if not exists public.popups (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('general', 'attendance_winner')),
  title text not null,
  body text not null,
  member_id uuid references public.members(id),
  image_url text,
  is_active boolean not null default true,
  starts_at date not null,
  ends_at date not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  constraint popups_date_range_check check (starts_at <= ends_at),
  constraint popups_type_member_check check (
    (type = 'general' and member_id is null)
    or (type = 'attendance_winner' and member_id is not null)
  ),
  constraint popups_type_image_check check (
    type = 'general' or image_url is null
  )
);

alter table public.popups enable row level security;

create policy "Anyone can read active current popups"
on public.popups for select
to anon, authenticated
using (is_active and current_date between starts_at and ends_at);

create policy "Admins manage all popups"
on public.popups for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Public popup rows need only the winner's name; this avoids exposing private
-- columns from members while still allowing attendance_winner rendering.
create or replace function public.active_popups()
returns table (
  id uuid,
  type text,
  title text,
  body text,
  member_id uuid,
  member_name text,
  image_url text,
  starts_at date,
  ends_at date
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.type, p.title, p.body, p.member_id, m.name, p.image_url, p.starts_at, p.ends_at
  from public.popups p
  left join public.members m on m.id = p.member_id
  where p.is_active
    and current_date between p.starts_at and p.ends_at;
$$;

revoke all on function public.active_popups() from public;
grant execute on function public.active_popups() to anon, authenticated;
