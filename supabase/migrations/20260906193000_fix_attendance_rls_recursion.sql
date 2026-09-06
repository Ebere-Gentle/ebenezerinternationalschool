-- Fix the attendance_sessions <-> attendance_records RLS cycle.
-- Student session visibility is evaluated by a private SECURITY DEFINER helper
-- instead of a policy subquery against attendance_records under RLS.

begin;

create or replace function private.attendance_student_can_view_session(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select exists (
    select 1
    from public.attendance_records ar
    join public.students s on s.id = ar.student_id
    where ar.session_id = p_session_id
      and s.user_id = auth.uid()
      and s.branch_id = public.current_user_branch_id()
  );
$$;

revoke all on function private.attendance_student_can_view_session(uuid) from public;
revoke all on function private.attendance_student_can_view_session(uuid) from anon;
revoke all on function private.attendance_student_can_view_session(uuid) from authenticated;

drop policy if exists attendance_sessions_student_select on public.attendance_sessions;
create policy attendance_sessions_student_select
on public.attendance_sessions
for select
to authenticated
using (private.attendance_student_can_view_session(id));

commit;
