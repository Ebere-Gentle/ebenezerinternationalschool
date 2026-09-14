create or replace function public.jamb_is_staff() returns boolean language sql stable security definer set search_path=public as $$ select exists (select 1 from public.users u where u.id=auth.uid() and u.role::text in ('admin','admin_asst','branch_admin','director','super_admin','principal','record_keeper','teacher')); $$;

drop policy if exists jamb_questions_staff_select on public.jamb_questions;
create policy jamb_questions_staff_select on public.jamb_questions for select to authenticated using (public.jamb_is_staff() or exists (select 1 from public.jamb_registration_subjects rs join public.jamb_registrations r on r.id=rs.registration_id join public.students s on s.id=r.student_id where rs.subject_id=jamb_questions.subject_id and s.user_id=auth.uid()));

drop policy if exists jamb_questions_staff_insert on public.jamb_questions;
create policy jamb_questions_staff_insert on public.jamb_questions for insert to authenticated with check (public.jamb_is_staff());

drop policy if exists jamb_questions_staff_update on public.jamb_questions;
create policy jamb_questions_staff_update on public.jamb_questions for update to authenticated using (public.jamb_is_staff()) with check (public.jamb_is_staff());

drop policy if exists jamb_questions_staff_delete on public.jamb_questions;
create policy jamb_questions_staff_delete on public.jamb_questions for delete to authenticated using (public.jamb_is_staff());

create index if not exists idx_jamb_questions_subject_active_year on public.jamb_questions(subject_id,is_active,year);
create index if not exists idx_jamb_questions_topic on public.jamb_questions(topic);

alter table public.jamb_questions drop constraint if exists jamb_questions_correct_option_check;
alter table public.jamb_questions add constraint jamb_questions_correct_option_check check (correct_option in ('A','B','C','D'));
alter table public.jamb_questions drop constraint if exists jamb_questions_difficulty_check;
alter table public.jamb_questions add constraint jamb_questions_difficulty_check check (difficulty in ('easy','medium','hard'));
