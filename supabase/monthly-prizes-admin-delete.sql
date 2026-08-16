-- Run after self-report-group-participants.sql.

create policy "Admins delete monthly prizes"
on public.monthly_prizes for delete
to authenticated
using (public.is_admin());
