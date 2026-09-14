create or replace function public.submit_jamb_attempt(p_attempt_id uuid, p_answers jsonb, p_duration_seconds integer default 0) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_student uuid:=public.jamb_student_id_for_user(); v_attempt public.jamb_attempts%rowtype; v_q integer:=0; v_c integer:=0; v_w integer:=0; v_u integer:=0; v_score numeric(5,2):=0; a jsonb; qid uuid; sel char(1); corr char(1); student_parent uuid; parent_user uuid; begin
select a.* into v_attempt from public.jamb_attempts a join public.jamb_registrations r on r.id=a.registration_id where a.id=p_attempt_id and (r.student_id=v_student or public.jamb_is_staff());
if v_attempt.id is null then raise exception 'Attempt not found or access denied'; end if;
if v_attempt.status='submitted' then return jsonb_build_object('attempt_id',v_attempt.id,'score',v_attempt.score,'correct',v_attempt.correct_count,'wrong',v_attempt.wrong_count,'unanswered',v_attempt.unanswered_count,'question_count',v_attempt.question_count); end if;
delete from public.jamb_attempt_answers where attempt_id=v_attempt.id;
for a in select * from jsonb_array_elements(coalesce(p_answers,'[]'::jsonb)) loop
  begin qid:=(a->>'question_id')::uuid; exception when others then continue; end;
  sel:=nullif(upper(a->>'selected_option'),'')::char(1);
  if sel is not null and sel not in ('A','B','C','D') then sel:=null; end if;
  select upper(correct_option) into corr from public.jamb_questions where id=qid and subject_id=v_attempt.subject_id and is_active=true;
  if corr is not null and not exists(select 1 from public.jamb_attempt_answers aa where aa.attempt_id=v_attempt.id and aa.question_id=qid) then insert into public.jamb_attempt_answers(attempt_id,question_id,selected_option,is_correct) values(v_attempt.id,qid,sel,sel is not null and sel=corr); end if;
end loop;
select greatest(coalesce(v_attempt.question_count,0),count(*)) into v_q from public.jamb_attempt_answers where attempt_id=v_attempt.id;
select count(*) filter(where is_correct),count(*) filter(where selected_option is not null and not is_correct) into v_c,v_w from public.jamb_attempt_answers where attempt_id=v_attempt.id;
v_u:=greatest(v_q-v_c-v_w,0); v_score:=case when v_q>0 then round(v_c::numeric/v_q::numeric*100,2) else 0 end;
update public.jamb_attempts set question_count=v_q,correct_count=v_c,wrong_count=v_w,unanswered_count=v_u,score=v_score,duration_seconds=greatest(0,coalesce(p_duration_seconds,0)),submitted_at=now(),status='submitted' where id=v_attempt.id;
select s.parent_id,p.user_id into student_parent,parent_user from public.students s left join public.parents p on p.id=s.parent_id where s.id=v_student;
if parent_user is not null then insert into public.jamb_notifications(student_id,attempt_id,recipient_user_id,recipient_role,title,message,score) values(v_student,v_attempt.id,parent_user,'parent','JAMB CBT result ready',format('Your child completed %s JAMB CBT practice with a score of %s%%.',(select name from public.jamb_subjects where id=v_attempt.subject_id),v_score),v_score); end if;
insert into public.jamb_notifications(student_id,attempt_id,recipient_user_id,recipient_role,title,message,score) select v_student,v_attempt.id,u.id,u.role::text,'JAMB CBT result ready',format('A student completed %s JAMB CBT practice with a score of %s%%.',(select name from public.jamb_subjects where id=v_attempt.subject_id),v_score),v_score from public.users u where lower(coalesce(u.role::text,'')) in ('director','admin','super_admin','teacher') and u.is_active=true;
return jsonb_build_object('attempt_id',v_attempt.id,'score',v_score,'correct',v_c,'wrong',v_w,'unanswered',v_u,'question_count',v_q); end; $$;
