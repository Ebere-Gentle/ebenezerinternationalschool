-- JAMB CBT Preparation module
-- Students register once per academic session with exactly four subjects.
-- Mathematics and English Language are compulsory; two additional subjects are selected.

create extension if not exists pgcrypto;

create table if not exists public.jamb_subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text,
  is_compulsory boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.jamb_registrations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  academic_session_id uuid null references public.academic_sessions(id) on delete set null,
  session_name text not null,
  status text not null default 'active' check (status in ('active','cancelled','completed')),
  registered_at timestamptz not null default now(),
  locked_at timestamptz null,
  created_at timestamptz not null default now(),
  unique(student_id, session_name)
);

create table if not exists public.jamb_registration_subjects (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.jamb_registrations(id) on delete cascade,
  subject_id uuid not null references public.jamb_subjects(id) on delete restrict,
  is_compulsory boolean not null default false,
  created_at timestamptz not null default now(),
  unique(registration_id, subject_id)
);

create table if not exists public.jamb_questions (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.jamb_subjects(id) on delete cascade,
  question_text text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_option char(1) not null check (upper(correct_option) in ('A','B','C','D')),
  explanation text,
  topic text,
  year integer,
  source text,
  difficulty text not null default 'medium' check (difficulty in ('easy','medium','hard')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_jamb_questions_subject on public.jamb_questions(subject_id, is_active, year);

create table if not exists public.jamb_attempts (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.jamb_registrations(id) on delete cascade,
  subject_id uuid not null references public.jamb_subjects(id) on delete restrict,
  question_count integer not null default 0,
  correct_count integer not null default 0,
  wrong_count integer not null default 0,
  unanswered_count integer not null default 0,
  score numeric(5,2) not null default 0,
  duration_seconds integer not null default 0,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  status text not null default 'in_progress' check (status in ('in_progress','submitted','abandoned')),
  created_at timestamptz not null default now()
);

create index if not exists idx_jamb_attempts_registration on public.jamb_attempts(registration_id, created_at desc);

create table if not exists public.jamb_attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.jamb_attempts(id) on delete cascade,
  question_id uuid not null references public.jamb_questions(id) on delete restrict,
  selected_option char(1),
  is_correct boolean not null default false,
  answered_at timestamptz not null default now(),
  unique(attempt_id, question_id)
);

create table if not exists public.jamb_notifications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  attempt_id uuid null references public.jamb_attempts(id) on delete cascade,
  recipient_user_id uuid null references public.users(id) on delete cascade,
  recipient_role text null,
  title text not null,
  message text not null,
  score numeric(5,2),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_jamb_notifications_recipient on public.jamb_notifications(recipient_user_id, is_read, created_at desc);

insert into public.jamb_subjects (name, code, is_compulsory, sort_order) values
('English Language','ENG',true,1),
('Mathematics','MAT',true,2),
('Physics','PHY',false,3),
('Chemistry','CHE',false,4),
('Biology','BIO',false,5),
('Economics','ECO',false,6),
('Government','GOV',false,7),
('Literature in English','LIT',false,8),
('Geography','GEO',false,9),
('Commerce','COM',false,10),
('Accounting','ACC',false,11),
('Civic Education','CIV',false,12),
('Christian Religious Studies','CRS',false,13),
('Islamic Religious Studies','IRS',false,14)
on conflict (name) do update set is_compulsory = excluded.is_compulsory, sort_order = excluded.sort_order;

create or replace function public.jamb_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and lower(coalesce(u.role,'')) in ('admin','branch_admin','director','super_admin','principal','record_keeper','teacher')
  );
$$;

create or replace function public.jamb_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and lower(coalesce(u.role,'')) in ('admin','branch_admin','director','super_admin','principal','record_keeper')
  );
$$;

create or replace function public.jamb_student_id_for_user()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.id from public.students s where s.user_id = auth.uid() limit 1;
$$;

create or replace function public.get_jamb_questions(
  p_subject_id uuid,
  p_year integer default null,
  p_limit integer default 40
)
returns table (
  id uuid,
  question_text text,
  option_a text,
  option_b text,
  option_c text,
  option_d text,
  topic text,
  year integer,
  difficulty text,
  source text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_registered boolean;
  v_limit integer := greatest(1, least(coalesce(p_limit,40),100));
begin
  v_student_id := public.jamb_student_id_for_user();
  if v_student_id is null then
    raise exception 'Student profile not found';
  end if;

  select exists (
    select 1
    from public.jamb_registrations r
    join public.jamb_registration_subjects rs on rs.registration_id = r.id
    where r.student_id = v_student_id
      and r.status = 'active'
      and rs.subject_id = p_subject_id
  ) into v_registered;

  if not v_registered and not public.jamb_is_staff() then
    raise exception 'Subject is not registered for this student';
  end if;

  return query
  select q.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
         q.topic, q.year, q.difficulty, q.source
  from public.jamb_questions q
  where q.subject_id = p_subject_id
    and q.is_active = true
    and (p_year is null or q.year = p_year)
  order by random()
  limit v_limit;
end;
$$;

create or replace function public.submit_jamb_attempt(
  p_attempt_id uuid,
  p_answers jsonb,
  p_duration_seconds integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_attempt public.jamb_attempts%rowtype;
  v_question_count integer := 0;
  v_correct integer := 0;
  v_wrong integer := 0;
  v_unanswered integer := 0;
  v_score numeric(5,2) := 0;
  v_parent_user_id uuid;
  v_branch_id uuid;
  v_answer jsonb;
  v_qid uuid;
  v_selected char(1);
  v_correct_option char(1);
begin
  v_student_id := public.jamb_student_id_for_user();

  select a.* into v_attempt
  from public.jamb_attempts a
  join public.jamb_registrations r on r.id = a.registration_id
  where a.id = p_attempt_id
    and (r.student_id = v_student_id or public.jamb_is_staff());

  if v_attempt.id is null then
    raise exception 'Attempt not found or access denied';
  end if;

  if v_attempt.status = 'submitted' then
    return jsonb_build_object('attempt_id',v_attempt.id,'score',v_attempt.score,'correct',v_attempt.correct_count,'wrong',v_attempt.wrong_count,'unanswered',v_attempt.unanswered_count);
  end if;

  delete from public.jamb_attempt_answers where attempt_id = v_attempt.id;

  for v_answer in select * from jsonb_array_elements(coalesce(p_answers,'[]'::jsonb)) loop
    v_qid := (v_answer->>'question_id')::uuid;
    v_selected := nullif(upper(v_answer->>'selected_option'),'')::char(1);
    select upper(correct_option) into v_correct_option from public.jamb_questions where id = v_qid;
    if v_correct_option is null then continue; end if;
    insert into public.jamb_attempt_answers(attempt_id,question_id,selected_option,is_correct)
    values(v_attempt.id,v_qid,v_selected,(v_selected is not null and v_selected = v_correct_option));
  end loop;

  select count(*) into v_question_count from public.jamb_attempt_answers where attempt_id=v_attempt.id;
  select count(*) filter (where is_correct) into v_correct from public.jamb_attempt_answers where attempt_id=v_attempt.id;
  select count(*) filter (where selected_option is not null and not is_correct) into v_wrong from public.jamb_attempt_answers where attempt_id=v_attempt.id;
  v_unanswered := greatest(v_question_count - v_correct - v_wrong,0);
  v_score := case when v_question_count > 0 then round((v_correct::numeric / v_question_count::numeric) * 100,2) else 0 end;

  update public.jamb_attempts
  set question_count=v_question_count, correct_count=v_correct, wrong_count=v_wrong,
      unanswered_count=v_unanswered, score=v_score, duration_seconds=greatest(0,coalesce(p_duration_seconds,0)),
      submitted_at=now(), status='submitted'
  where id=v_attempt.id;

  select s.parent_id, s.branch_id into v_parent_user_id, v_branch_id
  from public.students s
  join public.jamb_registrations r on r.student_id=s.id
  where r.id=v_attempt.registration_id;

  if v_student_id is not null then
    insert into public.jamb_notifications(student_id,attempt_id,recipient_user_id,recipient_role,title,message,score)
    values(v_student_id,v_attempt.id,null,'director','JAMB CBT result ready',format('A student completed a %s JAMB CBT practice with a score of %s%%.',(select name from public.jamb_subjects where id=v_attempt.subject_id),v_score),v_score);
  end if;

  if v_parent_user_id is not null then
    insert into public.jamb_notifications(student_id,attempt_id,recipient_user_id,recipient_role,title,message,score)
    select v_student_id,v_attempt.id,p.user_id,'parent', 'JAMB CBT result ready', format('%s completed %s JAMB CBT practice with a score of %s%%.', coalesce(s.first_name,'Student'), (select name from public.jamb_subjects where id=v_attempt.subject_id), v_score),v_score
    from public.parents p join public.students s on s.parent_id=p.id where s.id=v_student_id and p.user_id is not null;
  end if;

  return jsonb_build_object('attempt_id',v_attempt.id,'score',v_score,'correct',v_correct,'wrong',v_wrong,'unanswered',v_unanswered,'question_count',v_question_count);
end;
$$;

alter table public.jamb_subjects enable row level security;
alter table public.jamb_registrations enable row level security;
alter table public.jamb_registration_subjects enable row level security;
alter table public.jamb_questions enable row level security;
alter table public.jamb_attempts enable row level security;
alter table public.jamb_attempt_answers enable row level security;
alter table public.jamb_notifications enable row level security;

drop policy if exists jamb_subjects_read on public.jamb_subjects;
create policy jamb_subjects_read on public.jamb_subjects for select to authenticated using (is_active = true or public.jamb_is_staff());

drop policy if exists jamb_questions_read on public.jamb_questions;
create policy jamb_questions_read on public.jamb_questions for select to authenticated using (is_active = true and (public.jamb_is_staff() or exists (select 1 from public.jamb_registration_subjects rs join public.jamb_registrations r on r.id=rs.registration_id where rs.subject_id=jamb_questions.subject_id and r.student_id=public.jamb_student_id_for_user() and r.status='active')));

drop policy if exists jamb_registration_select on public.jamb_registrations;
create policy jamb_registration_select on public.jamb_registrations for select to authenticated using (student_id=public.jamb_student_id_for_user() or public.jamb_is_staff() or exists (select 1 from public.students s join public.parents p on p.id=s.parent_id where s.id=jamb_registrations.student_id and p.user_id=auth.uid()));

drop policy if exists jamb_registration_insert on public.jamb_registrations;
create policy jamb_registration_insert on public.jamb_registrations for insert to authenticated with check (student_id=public.jamb_student_id_for_user() or public.jamb_is_staff());

drop policy if exists jamb_registration_update on public.jamb_registrations;
create policy jamb_registration_update on public.jamb_registrations for update to authenticated using (student_id=public.jamb_student_id_for_user() or public.jamb_is_staff()) with check (student_id=public.jamb_student_id_for_user() or public.jamb_is_staff());

drop policy if exists jamb_registration_subjects_select on public.jamb_registration_subjects;
create policy jamb_registration_subjects_select on public.jamb_registration_subjects for select to authenticated using (exists (select 1 from public.jamb_registrations r where r.id=registration_id and (r.student_id=public.jamb_student_id_for_user() or public.jamb_is_staff() or exists(select 1 from public.students s join public.parents p on p.id=s.parent_id where s.id=r.student_id and p.user_id=auth.uid()))));

drop policy if exists jamb_registration_subjects_insert on public.jamb_registration_subjects;
create policy jamb_registration_subjects_insert on public.jamb_registration_subjects for insert to authenticated with check (exists (select 1 from public.jamb_registrations r where r.id=registration_id and (r.student_id=public.jamb_student_id_for_user() or public.jamb_is_staff())));

drop policy if exists jamb_attempts_select on public.jamb_attempts;
create policy jamb_attempts_select on public.jamb_attempts for select to authenticated using (exists (select 1 from public.jamb_registrations r where r.id=registration_id and (r.student_id=public.jamb_student_id_for_user() or public.jamb_is_staff() or exists(select 1 from public.students s join public.parents p on p.id=s.parent_id where s.id=r.student_id and p.user_id=auth.uid()))));

drop policy if exists jamb_attempts_insert on public.jamb_attempts;
create policy jamb_attempts_insert on public.jamb_attempts for insert to authenticated with check (exists (select 1 from public.jamb_registrations r where r.id=registration_id and (r.student_id=public.jamb_student_id_for_user() or public.jamb_is_staff())));

drop policy if exists jamb_attempt_answers_select on public.jamb_attempt_answers;
create policy jamb_attempt_answers_select on public.jamb_attempt_answers for select to authenticated using (exists (select 1 from public.jamb_attempts a join public.jamb_registrations r on r.id=a.registration_id where a.id=attempt_id and (r.student_id=public.jamb_student_id_for_user() or public.jamb_is_staff() or exists(select 1 from public.students s join public.parents p on p.id=s.parent_id where s.id=r.student_id and p.user_id=auth.uid()))));

drop policy if exists jamb_notifications_select on public.jamb_notifications;
create policy jamb_notifications_select on public.jamb_notifications for select to authenticated using (recipient_user_id=auth.uid() or public.jamb_is_admin() or (recipient_role='teacher' and exists(select 1 from public.users u where u.id=auth.uid() and lower(coalesce(u.role,''))='teacher')));

grant execute on function public.get_jamb_questions(uuid,integer,integer) to authenticated;
grant execute on function public.submit_jamb_attempt(uuid,jsonb,integer) to authenticated;

comment on table public.jamb_registrations is 'One locked four-subject JAMB preparation registration per student per academic session.';
comment on table public.jamb_questions is 'JAMB preparation question bank. Only authorized question content should be imported.';
