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
    return jsonb_build_object(
      'attempt_id',v_attempt.id,
      'score',v_attempt.score,
      'correct',v_attempt.correct_count,
      'wrong',v_attempt.wrong_count,
      'unanswered',v_attempt.unanswered_count,
      'question_count',v_attempt.question_count
    );
  end if;

  v_question_count := greatest(coalesce(v_attempt.question_count,0),0);

  delete from public.jamb_attempt_answers where attempt_id = v_attempt.id;

  for v_answer in select * from jsonb_array_elements(coalesce(p_answers,'[]'::jsonb)) loop
    v_qid := (v_answer->>'question_id')::uuid;
    v_selected := nullif(upper(v_answer->>'selected_option'),'')::char(1);

    select upper(q.correct_option)
    into v_correct_option
    from public.jamb_questions q
    where q.id = v_qid
      and q.subject_id = v_attempt.subject_id
      and q.is_active = true;

    if v_correct_option is null then
      continue;
    end if;

    insert into public.jamb_attempt_answers(attempt_id,question_id,selected_option,is_correct)
    values(v_attempt.id,v_qid,v_selected,(v_selected is not null and v_selected = v_correct_option));
  end loop;

  select count(*) filter (where is_correct)
  into v_correct
  from public.jamb_attempt_answers
  where attempt_id = v_attempt.id;

  select count(*) filter (where selected_option is not null and not is_correct)
  into v_wrong
  from public.jamb_attempt_answers
  where attempt_id = v_attempt.id;

  v_unanswered := greatest(v_question_count - v_correct - v_wrong,0);
  v_score := case
    when v_question_count > 0 then round((v_correct::numeric / v_question_count::numeric) * 100,2)
    else 0
  end;

  update public.jamb_attempts
  set question_count=v_question_count,
      correct_count=v_correct,
      wrong_count=v_wrong,
      unanswered_count=v_unanswered,
      score=v_score,
      duration_seconds=greatest(0,coalesce(p_duration_seconds,0)),
      submitted_at=now(),
      status='submitted'
  where id=v_attempt.id;

  if v_student_id is not null then
    insert into public.jamb_notifications(student_id,attempt_id,recipient_user_id,recipient_role,title,message,score)
    values(
      v_student_id,
      v_attempt.id,
      null,
      'director',
      'JAMB CBT result ready',
      format('A student completed a %s JAMB CBT practice with a score of %s%%.',(select name from public.jamb_subjects where id=v_attempt.subject_id),v_score),
      v_score
    );

    insert into public.jamb_notifications(student_id,attempt_id,recipient_user_id,recipient_role,title,message,score)
    select
      v_student_id,
      v_attempt.id,
      p.user_id,
      'parent',
      'JAMB CBT result ready',
      format('%s completed %s JAMB CBT practice with a score of %s%%.',coalesce(s.first_name,'Student'),(select name from public.jamb_subjects where id=v_attempt.subject_id),v_score),
      v_score
    from public.parents p
    join public.students s on s.parent_id=p.id
    where s.id=v_student_id and p.user_id is not null;
  end if;

  return jsonb_build_object(
    'attempt_id',v_attempt.id,
    'score',v_score,
    'correct',v_correct,
    'wrong',v_wrong,
    'unanswered',v_unanswered,
    'question_count',v_question_count
  );
end;
$$;

grant execute on function public.submit_jamb_attempt(uuid,jsonb,integer) to authenticated;
