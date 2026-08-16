-- Run after attendance-rewards.sql.

-- A 3인훈련 source report keeps the complete participant list. Rows credited to
-- other participants point back to that source report and intentionally have no list.
alter table public.self_reported_activities
  drop constraint if exists self_reported_activities_participants_check;

alter table public.self_reported_activities
  drop column if exists participants,
  add column if not exists participant_ids uuid[],
  add column if not exists source_report_id uuid references public.self_reported_activities(id);

alter table public.self_reported_activities
  add constraint self_reported_activities_participant_ids_check
  check (
    activity_type <> '3인훈련'
    or (source_report_id is null and participant_ids is not null and array_length(participant_ids, 1) >= 3)
    or (source_report_id is not null and participant_ids is null)
  );

create index self_reported_activities_source_report_id_idx
  on public.self_reported_activities (source_report_id)
  where source_report_id is not null;

-- Active members may read only IDs and names through this SECURITY DEFINER
-- function; no private member columns are exposed.
create or replace function public.active_member_directory()
returns table (id uuid, name text)
language sql
stable
security definer
set search_path = public
as $$
  select m.id, m.name
  from public.members m
  where m.status = 'active'
  order by m.name;
$$;

revoke all on function public.active_member_directory() from public;
grant execute on function public.active_member_directory() to authenticated;

-- The existing admin UPDATE policy remains available for direct edits. This
-- SECURITY DEFINER function intentionally bypasses RLS to atomically approve
-- or reject a source report and credit its other 3인훈련 participants.
create or replace function public.approve_self_report(p_id uuid, p_action text)
returns table (status text, credited_member_ids uuid[], skipped_member_ids uuid[])
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report public.self_reported_activities%rowtype;
  v_participant_id uuid;
  v_credited_member_ids uuid[] := array[]::uuid[];
  v_skipped_member_ids uuid[] := array[]::uuid[];
begin
  if not public.is_admin() then
    raise exception 'Only administrators can review self-reported activities.';
  end if;

  if p_action not in ('approved', 'rejected') then
    raise exception 'Unsupported self-report action: %', p_action;
  end if;

  select *
  into v_report
  from public.self_reported_activities sra
  where sra.id = p_id
  for update;

  if not found then
    raise exception 'Self-reported activity not found.';
  end if;

  if v_report.status <> 'pending' then
    raise exception 'Self-reported activity has already been reviewed.';
  end if;

  update public.self_reported_activities
  set status = p_action,
      approved_by = auth.uid(),
      approved_at = now()
  where id = p_id;

  if p_action = 'approved' and v_report.activity_type = '3인훈련' then
    for v_participant_id in
      select participant_id
      from unnest(v_report.participant_ids) as participants(participant_id)
      where participant_id <> v_report.member_id
    loop
      begin
        insert into public.self_reported_activities (
          member_id,
          activity_type,
          date,
          status,
          approved_by,
          approved_at,
          source_report_id
        )
        values (
          v_participant_id,
          '3인훈련',
          v_report.date,
          'approved',
          auth.uid(),
          now(),
          p_id
        );
        v_credited_member_ids := array_append(v_credited_member_ids, v_participant_id);
      exception when unique_violation or foreign_key_violation then
        v_skipped_member_ids := array_append(v_skipped_member_ids, v_participant_id);
      end;
    end loop;
  end if;

  return query select p_action, v_credited_member_ids, v_skipped_member_ids;
end;
$$;

revoke all on function public.approve_self_report(uuid, text) from public;
grant execute on function public.approve_self_report(uuid, text) to authenticated;
