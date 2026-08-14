-- Run once in the Supabase SQL Editor before enabling profile-photo uploads.
-- Public reads are required because approved photos are stored as public URLs in content/team.json.
insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do update set public = true;

create policy "Authenticated members upload profile photos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'profile-photos'
  and owner_id = (select auth.uid())
);

create policy "Members delete their own profile photos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'profile-photos'
  and owner_id = (select auth.uid())
);
