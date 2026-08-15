-- Run after supabase/training-evaluations.sql, which defines public.is_admin().
-- Proposal only — review and run this yourself in the Supabase SQL Editor.
--
-- Whitelist of admin-registered (email, name) pairs allowed to self-register a member
-- account (worker/self-register.js). Nothing here is ever exposed to anon or to a
-- non-admin authenticated client: the self-registration Worker reads and claims rows
-- with the service-role key, which bypasses RLS entirely, so no policy on this table
-- needs to (or should) grant public/authenticated access. Admins manage it directly from
-- the browser using their own authenticated session, gated by is_admin() below.

create table if not exists public.invited_members (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text not null,
  used boolean not null default false,
  member_id uuid references public.members(id),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  used_at timestamptz,
  constraint invited_members_name_not_blank check (btrim(name) <> '')
);

-- Both writers (the admin bulk-register UI and worker/self-register.js) are expected to
-- store/query email already lowercased and trimmed; this index is the DB-level backstop
-- against a duplicate whitelist entry that only differs by case.
create unique index if not exists invited_members_email_key
  on public.invited_members (lower(email));

create index if not exists invited_members_used_idx
  on public.invited_members (used);

alter table public.invited_members enable row level security;

create policy "Admins manage invite whitelist"
on public.invited_members for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
