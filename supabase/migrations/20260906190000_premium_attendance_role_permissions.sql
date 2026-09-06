-- Premium attendance: role-scoped access, audit history, alert queue and daily-session integrity.
-- This migration is intentionally idempotent so it can be applied to fresh environments.

alter table public.teachers add column if not exists user_id uuid references auth.users(id) on delete set null;
create unique index if not exists teachers_user_id_uidx on public.teachers(user_id) where user_id is not null;
update public.teachers t set user_id=u.id from public.users u where t.user_id is null and t.email is not null and u.email is not null and lower(trim(t.email))=lower(trim(u.email)) and u.role='teacher';
create index if not exists attendance_sessions_teacher_date_idx on public.attendance_sessions(teacher_id,attendance_date desc);
create index if not exists attendance_records_student_session_idx on public.attendance_records(student_id,session_id);
create index if not exists students_user_id_idx on public.students(user_id);
create unique index if not exists attendance_daily_session_uidx on public.attendance_sessions(branch_id,class_id,attendance_date) where session_type='daily' and class_id is not null;

create table if not exists public.attendance_audit_logs (
 id uuid primary key default gen_random_uuid(),
 branch_id uuid not null references public.branches(id) on delete cascade,
 session_id uuid references public.attendance_sessions(id) on delete set null,
 record_id uuid references public.attendance_records(id) on delete set null,
 student_id uuid references public.students(id) on delete set null,
 action text not null check(action in ('created','updated','deleted','submitted','locked','unlocked')),
 old_status text,
 new_status text,
 old_remarks text,
 new_remarks text,
 actor_id uuid references public.users(id) on delete set null,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index if not exists attendance_audit_branch_created_idx on public.attendance_audit_logs(branch_id,created_at desc);
create index if not exists attendance_audit_student_created_idx on public.attendance_audit_logs(student_id,created_at desc);

create table if not exists public.attendance_alerts (
 id uuid primary key default gen_random_uuid(),
 branch_id uuid not null references public.branches(id) on delete cascade,
 session_id uuid not null references public.attendance_sessions(id) on delete cascade,
 student_id uuid not null references public.students(id) on delete cascade,
 attendance_record_id uuid references public.attendance_records(id) on delete set null,
 channel text not null check(channel in ('in_app','sms','email','whatsapp')),
 recipient_user_id uuid references public.users(id) on delete set null,
 recipient_phone text,
 status text not null default 'queued' check(status in ('queued','sent','delivered','failed','cancelled')),
 message text not null,
 provider text,
 provider_message_id text,
 sent_at timestamptz,
 delivered_at timestamptz,
 failure_reason text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists attendance_alerts_branch_created_idx on public.attendance_alerts(branch_id,created_at desc);
create index if not exists attendance_alerts_student_idx on public.attendance_alerts(student_id,created_at desc);
create unique index if not exists attendance_alerts_record_channel_uidx on public.attendance_alerts(attendance_record_id,channel) where attendance_record_id is not null;

create schema if not exists private;
create or replace function private.attendance_user_can_manage() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.users u where u.id=(select auth.uid()) and u.is_active=true and u.role::text=any(array['super_admin','branch_admin','director','principal','admin','record_keeper','accountant','finance'])); $$;
create or replace function private.attendance_user_is_class_teacher(p_class_id uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.classes c join public.teachers t on t.id=c.class_teacher_id join public.users u on u.id=(select auth.uid()) where c.id=p_class_id and c.branch_id=u.branch_id and u.is_active=true and u.role::text='teacher' and (t.user_id=u.id or (t.user_id is null and lower(coalesce(t.email,''))=lower(coalesce(u.email,''))))); $$;
create or replace function private.attendance_user_is_student(p_student_id uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.students s join public.users u on u.id=(select auth.uid()) where s.id=p_student_id and s.branch_id=u.branch_id and s.user_id=u.id and u.is_active=true and u.role::text='student'); $$;
revoke all on function private.attendance_user_can_manage() from public,anon,authenticated;
revoke all on function private.attendance_user_is_class_teacher(uuid) from public,anon,authenticated;
revoke all on function private.attendance_user_is_student(uuid) from public,anon,authenticated;

alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;
alter table public.attendance_audit_logs enable row level security;
alter table public.attendance_alerts enable row level security;

drop policy if exists premium_attendance_manage on public.attendance_sessions;
drop policy if exists premium_attendance_select on public.attendance_sessions;
drop policy if exists premium_attendance_records_manage on public.attendance_records;
drop policy if exists premium_attendance_records_select on public.attendance_records;
drop policy if exists attendance_sessions_admin_select on public.attendance_sessions;
drop policy if exists attendance_sessions_teacher_select on public.attendance_sessions;
drop policy if exists attendance_sessions_student_select on public.attendance_sessions;
drop policy if exists attendance_sessions_admin_insert on public.attendance_sessions;
drop policy if exists attendance_sessions_teacher_insert on public.attendance_sessions;
drop policy if exists attendance_sessions_admin_update on public.attendance_sessions;
drop policy if exists attendance_sessions_teacher_update on public.attendance_sessions;
drop policy if exists attendance_records_admin_select on public.attendance_records;
drop policy if exists attendance_records_teacher_select on public.attendance_records;
drop policy if exists attendance_records_student_select on public.attendance_records;
drop policy if exists attendance_records_admin_insert on public.attendance_records;
drop policy if exists attendance_records_teacher_insert on public.attendance_records;
drop policy if exists attendance_records_admin_update on public.attendance_records;
drop policy if exists attendance_records_teacher_update on public.attendance_records;
drop policy if exists attendance_audit_admin_select on public.attendance_audit_logs;
drop policy if exists attendance_alerts_admin_select on public.attendance_alerts;

create policy attendance_sessions_admin_select on public.attendance_sessions for select to authenticated using(branch_id=(select public.current_user_branch_id()) and (select private.attendance_user_can_manage()));
create policy attendance_sessions_teacher_select on public.attendance_sessions for select to authenticated using(branch_id=(select public.current_user_branch_id()) and (select private.attendance_user_is_class_teacher(class_id)));
create policy attendance_sessions_student_select on public.attendance_sessions for select to authenticated using(exists(select 1 from public.attendance_records r where r.session_id=attendance_sessions.id and (select private.attendance_user_is_student(r.student_id))));
create policy attendance_sessions_admin_insert on public.attendance_sessions for insert to authenticated with check(branch_id=(select public.current_user_branch_id()) and (select private.attendance_user_can_manage()));
create policy attendance_sessions_teacher_insert on public.attendance_sessions for insert to authenticated with check(branch_id=(select public.current_user_branch_id()) and (select private.attendance_user_is_class_teacher(class_id)) and status<>'locked');
create policy attendance_sessions_admin_update on public.attendance_sessions for update to authenticated using(branch_id=(select public.current_user_branch_id()) and (select private.attendance_user_can_manage())) with check(branch_id=(select public.current_user_branch_id()) and (select private.attendance_user_can_manage()));
create policy attendance_sessions_teacher_update on public.attendance_sessions for update to authenticated using(branch_id=(select public.current_user_branch_id()) and (select private.attendance_user_is_class_teacher(class_id)) and status<>'locked') with check(branch_id=(select public.current_user_branch_id()) and (select private.attendance_user_is_class_teacher(class_id)));

create policy attendance_records_admin_select on public.attendance_records for select to authenticated using(exists(select 1 from public.attendance_sessions s where s.id=attendance_records.session_id and s.branch_id=(select public.current_user_branch_id())) and (select private.attendance_user_can_manage()));
create policy attendance_records_teacher_select on public.attendance_records for select to authenticated using(exists(select 1 from public.attendance_sessions s where s.id=attendance_records.session_id and (select private.attendance_user_is_class_teacher(s.class_id))));
create policy attendance_records_student_select on public.attendance_records for select to authenticated using((select private.attendance_user_is_student(student_id)));
create policy attendance_records_admin_insert on public.attendance_records for insert to authenticated with check(exists(select 1 from public.attendance_sessions s where s.id=session_id and s.branch_id=(select public.current_user_branch_id())) and (select private.attendance_user_can_manage()));
create policy attendance_records_teacher_insert on public.attendance_records for insert to authenticated with check(exists(select 1 from public.attendance_sessions s where s.id=session_id and (select private.attendance_user_is_class_teacher(s.class_id)) and s.status<>'locked'));
create policy attendance_records_admin_update on public.attendance_records for update to authenticated using(exists(select 1 from public.attendance_sessions s where s.id=session_id and s.branch_id=(select public.current_user_branch_id())) and (select private.attendance_user_can_manage())) with check(exists(select 1 from public.attendance_sessions s where s.id=session_id and s.branch_id=(select public.current_user_branch_id())) and (select private.attendance_user_can_manage()));
create policy attendance_records_teacher_update on public.attendance_records for update to authenticated using(exists(select 1 from public.attendance_sessions s where s.id=session_id and (select private.attendance_user_is_class_teacher(s.class_id)) and s.status<>'locked')) with check(exists(select 1 from public.attendance_sessions s where s.id=session_id and (select private.attendance_user_is_class_teacher(s.class_id))));
create policy attendance_audit_admin_select on public.attendance_audit_logs for select to authenticated using(branch_id=(select public.current_user_branch_id()) and (select private.attendance_user_can_manage()));
create policy attendance_alerts_admin_select on public.attendance_alerts for select to authenticated using(branch_id=(select public.current_user_branch_id()) and (select private.attendance_user_can_manage()));

revoke all on table public.attendance_audit_logs from anon,authenticated;
revoke all on table public.attendance_alerts from anon,authenticated;
grant select on table public.attendance_audit_logs to authenticated;
grant select on table public.attendance_alerts to authenticated;

create or replace function private.audit_attendance_record_change() returns trigger language plpgsql security definer set search_path='' as $$ begin insert into public.attendance_audit_logs(branch_id,session_id,record_id,student_id,action,old_status,new_status,old_remarks,new_remarks,actor_id) select s.branch_id,coalesce(new.session_id,old.session_id),coalesce(new.id,old.id),coalesce(new.student_id,old.student_id),case when tg_op='INSERT' then 'created' when tg_op='UPDATE' then 'updated' else 'deleted' end,old.status,new.status,old.remarks,new.remarks,(select auth.uid()) from public.attendance_sessions s where s.id=coalesce(new.session_id,old.session_id); return coalesce(new,old); end; $$;
revoke all on function private.audit_attendance_record_change() from public,anon,authenticated;
drop trigger if exists trg_attendance_record_audit on public.attendance_records;
create trigger trg_attendance_record_audit after insert or update or delete on public.attendance_records for each row execute function private.audit_attendance_record_change();
