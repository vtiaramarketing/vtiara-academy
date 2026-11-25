-- VTIARA Training Academy — helper functions, triggers and server-side business rules
-- All grading, enrolment status and certificate issuing happens here so the browser can never fake it.

-- ───────────────────────── role helpers ─────────────────────────
create or replace function public.has_role(p_role text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role_key = p_role)
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles
                 where user_id = auth.uid() and role_key in ('super_admin','academy_admin'))
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles
                 where user_id = auth.uid()
                   and role_key in ('super_admin','academy_admin','trainer','assessor'))
$$;

-- Trainer: learners booked into batches assigned to them.  Assessor: learners who have reached practical stage.
create or replace function public.is_my_learner(p_learner uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin()
    or p_learner = auth.uid()
    or (public.has_role('trainer') and exists (
          select 1 from public.batch_bookings bb join public.batches b on b.id = bb.batch_id
          where bb.user_id = p_learner and b.trainer_id = auth.uid()))
    or (public.has_role('assessor') and exists (
          select 1 from public.course_enrolments ce
          where ce.user_id = p_learner
            and ce.status in ('assessment_unlocked','awaiting_approval','needs_retake','session_booked')))
$$;

create or replace function public.is_enrolled_in(p_course uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_staff() or exists (
    select 1 from public.course_enrolments where user_id = auth.uid() and course_id = p_course)
$$;

-- ───────────────────────── internal utilities ─────────────────────────
create or replace function public.notify(p_user uuid, p_title text, p_body text, p_link text default null)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, title, body, link) values (p_user, p_title, p_body, p_link)
$$;

create or replace function public.write_audit(p_action text, p_entity text, p_entity_id text, p_details jsonb default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_logs (actor_id, actor_name, action, entity, entity_id, details)
  values (auth.uid(), (select full_name from public.profiles where id = auth.uid()),
          p_action, p_entity, p_entity_id, p_details);
end $$;

create or replace function public.audit_row() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_row jsonb := to_jsonb(coalesce(new, old)); v_id text;
begin
  v_id := coalesce(v_row->>'id', v_row->>'user_id');
  perform public.write_audit(lower(tg_op), tg_table_name, v_id,
    case when tg_op = 'DELETE' then null else jsonb_build_object('status', v_row->>'status') end);
  return coalesce(new, old);
end $$;

-- ───────────────────────── new-user trigger ─────────────────────────
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, email, full_name, mobile, city, preferred_language, learner_code,
                               job_role, branch_id, nursing_reg_no, consent_privacy, consent_comms, consented_at)
  values (new.id, new.email, coalesce(m->>'full_name',''), coalesce(m->>'mobile', new.phone), m->>'city',
          coalesce(m->>'preferred_language','English'), m->>'learner_code', m->>'job_role',
          nullif(m->>'branch_id','')::uuid, m->>'nursing_reg_no',
          coalesce((m->>'consent_privacy')::boolean,false), coalesce((m->>'consent_comms')::boolean,false), now())
  on conflict (id) do nothing;
  -- Everyone starts as a learner. Elevated roles are only ever granted by an admin.
  insert into public.user_roles (user_id, role_key) values (new.id, 'learner') on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── certificate issuing ─────────────────────────
create or replace function public.issue_certificate_internal(p_enrolment uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  e public.course_enrolments%rowtype; c public.courses%rowtype; p public.profiles%rowtype;
  v_no text; v_status text; v_id uuid;
begin
  select * into e from public.course_enrolments where id = p_enrolment;
  select * into c from public.courses where id = e.course_id;
  select * into p from public.profiles where id = e.user_id;
  v_no := 'VTA-' || c.code || '-' || to_char(current_date,'YYYY') || '-'
          || lpad(nextval('public.certificate_seq')::text, 4, '0') || '-'
          || upper(substr(replace(gen_random_uuid()::text,'-',''),1,4));
  v_status := case when coalesce((c.pass_rules->>'admin_approval')::boolean,false)
                   then 'awaiting_approval' else 'valid' end;
  insert into public.certificates (cert_no, enrolment_id, learner_id, course_id, learner_name, course_title,
                                   role_label, certificate_title, status, issued_on, valid_until)
  values (v_no, e.id, e.user_id, c.id, p.full_name, c.title, c.role_label, c.certificate_title, v_status,
          case when v_status = 'valid' then current_date end,
          case when v_status = 'valid' and c.certificate_validity_months is not null
               then (current_date + make_interval(months => c.certificate_validity_months))::date end)
  returning id into v_id;
  if v_status = 'valid' then
    perform public.notify(e.user_id, 'Certificate issued',
      'Your ' || c.certificate_title || ' certificate (' || v_no || ') is ready in your wallet.', '/app/certificates');
  end if;
  return v_id;
end $$;

-- ───────────────────────── the rules engine ─────────────────────────
-- Recomputes progress + status for one enrolment and issues the certificate only when EVERY condition is met.
create or replace function public.recompute_enrolment(p_enrolment uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  e public.course_enrolments%rowtype; c public.courses%rowtype; v_cert public.certificates%rowtype;
  v_total int; v_done int; v_progress int; v_checks int; v_passed int; v_approved int;
  v_lessons_ok boolean; v_att_ok boolean; v_assess_ok boolean; v_prac_ok boolean; v_appr_ok boolean;
  v_failed boolean; v_booked boolean; v_status text;
begin
  select * into e from public.course_enrolments where id = p_enrolment;
  if not found then return null; end if;
  select * into c from public.courses where id = e.course_id;

  select count(*) into v_total from public.lessons where course_id = c.id;
  select count(*) into v_done from public.lesson_progress where user_id = e.user_id and course_id = c.id;
  v_progress := case when v_total = 0 then 0 else round(100.0 * v_done / v_total)::int end;
  v_lessons_ok := e.mode = 'academy' or v_total = 0 or v_done >= v_total;

  v_att_ok := (not c.requires_attendance) or exists (
    select 1 from public.batch_bookings bb join public.batches b on b.id = bb.batch_id
    where bb.user_id = e.user_id and b.course_id = c.id and bb.status = 'attended');

  v_assess_ok := exists (
    select 1 from public.assessment_attempts a join public.assessments s on s.id = a.assessment_id
    where a.user_id = e.user_id and s.course_id = c.id and a.status = 'submitted' and coalesce(a.passed,false));

  select count(*) into v_checks from public.practical_checklists where course_id = c.id;
  select count(*) filter (where pa.result = 'passed'), count(*) filter (where pa.approval_status = 'approved')
    into v_passed, v_approved
    from public.practical_assessments pa join public.practical_checklists pc on pc.id = pa.checklist_id
    where pa.enrolment_id = e.id and pc.course_id = c.id;
  v_prac_ok := (not c.requires_practical) or v_checks = 0 or v_passed >= v_checks;
  v_appr_ok := (not c.requires_trainer_approval) or v_checks = 0 or v_approved >= v_checks;

  select * into v_cert from public.certificates
    where enrolment_id = e.id and status in ('valid','expired','awaiting_approval')
    order by created_at desc limit 1;

  v_failed := (not v_assess_ok and exists (
      select 1 from public.assessment_attempts a join public.assessments s on s.id = a.assessment_id
      where a.user_id = e.user_id and s.course_id = c.id and a.status = 'submitted' and not coalesce(a.passed,false)))
    or exists (select 1 from public.practical_assessments pa join public.practical_checklists pc on pc.id = pa.checklist_id
               where pa.enrolment_id = e.id and pc.course_id = c.id and pa.result = 'failed');
  v_booked := exists (select 1 from public.batch_bookings bb join public.batches b on b.id = bb.batch_id
                      where bb.user_id = e.user_id and b.course_id = c.id and bb.status = 'booked');

  if v_cert.id is not null and v_cert.status = 'valid' then v_status := 'certified';
  elsif v_cert.id is not null and v_cert.status = 'expired' then v_status := 'expired';
  elsif v_cert.id is not null then v_status := 'awaiting_approval';
  elsif v_lessons_ok and v_att_ok and v_assess_ok and v_prac_ok and v_appr_ok then
    if exists (select 1 from public.certificates where enrolment_id = e.id and status = 'revoked') then
      v_status := 'awaiting_approval';      -- a revoked certificate is never silently re-issued
    else
      perform public.issue_certificate_internal(e.id);
      v_status := 'certified';
    end if;
  elsif v_assess_ok then v_status := 'awaiting_approval';
  elsif v_failed then v_status := 'needs_retake';
  elsif v_lessons_ok and v_att_ok and (v_total > 0 or c.requires_attendance) then v_status := 'assessment_unlocked';
  elsif v_booked then v_status := 'session_booked';
  elsif v_progress > 0 then v_status := 'in_progress';
  else v_status := 'not_started';
  end if;

  if v_status = 'assessment_unlocked' and e.status <> 'assessment_unlocked' then
    perform public.notify(e.user_id, 'Assessment unlocked', 'You can now take the ' || c.title || ' knowledge test.', '/app/courses/' || c.slug);
  end if;

  update public.course_enrolments
     set status = v_status, progress_pct = v_progress,
         completed_at = case when v_status = 'certified' then coalesce(completed_at, now()) else completed_at end
   where id = e.id;
  return v_status;
end $$;

create or replace function public.sync_certificate_statuses() returns void
language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  for r in update public.certificates set status = 'expired'
           where status = 'valid' and valid_until is not null and valid_until < current_date
           returning enrolment_id loop
    if r.enrolment_id is not null then perform public.recompute_enrolment(r.enrolment_id); end if;
  end loop;
end $$;

-- ───────────────────────── learner actions ─────────────────────────
create or replace function public.enrol_in_course(p_course uuid, p_mode text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare c public.courses%rowtype; v_id uuid;
begin
  if auth.uid() is null then raise exception 'Please sign in to enrol'; end if;
  select * into c from public.courses where id = p_course and status = 'published';
  if not found then raise exception 'This course is not open for enrolment'; end if;
  if not (p_mode = any (c.learning_modes)) then raise exception 'This course is not offered in % mode', p_mode; end if;
  insert into public.course_enrolments (user_id, course_id, mode) values (auth.uid(), p_course, p_mode)
    on conflict (user_id, course_id) do update set mode = excluded.mode
    returning id into v_id;
  perform public.recompute_enrolment(v_id);
  perform public.notify(auth.uid(), 'Enrolment confirmed', 'You are enrolled in ' || c.title || '.', '/app/courses/' || c.slug);
  return v_id;
end $$;

create or replace function public.complete_lesson(p_lesson uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare l public.lessons%rowtype; v_enrol uuid; v_status text; v_pct int;
begin
  select * into l from public.lessons where id = p_lesson;
  if not found then raise exception 'Lesson not found'; end if;
  select id into v_enrol from public.course_enrolments where user_id = auth.uid() and course_id = l.course_id;
  if v_enrol is null then raise exception 'Enrol in this course to track lessons'; end if;
  insert into public.lesson_progress (user_id, lesson_id, course_id) values (auth.uid(), p_lesson, l.course_id)
    on conflict do nothing;
  v_status := public.recompute_enrolment(v_enrol);
  select progress_pct into v_pct from public.course_enrolments where id = v_enrol;
  return v_pct;
end $$;

create or replace function public.book_batch(p_batch uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare b public.batches%rowtype; v_enrol uuid; v_taken int; v_status text;
begin
  if auth.uid() is null then raise exception 'Please sign in'; end if;
  select * into b from public.batches where id = p_batch and status in ('open','full');
  if not found then raise exception 'This batch is not available'; end if;
  if b.starts_on < current_date then raise exception 'This batch has already started'; end if;
  select id into v_enrol from public.course_enrolments where user_id = auth.uid() and course_id = b.course_id;
  if v_enrol is null then raise exception 'Enrol in the course before booking a batch'; end if;
  if exists (select 1 from public.batch_bookings where batch_id = p_batch and user_id = auth.uid()
             and status in ('booked','waitlist','attended')) then
    raise exception 'You already have a booking in this batch';
  end if;
  select count(*) into v_taken from public.batch_bookings where batch_id = p_batch and status in ('booked','attended');
  v_status := case when v_taken >= b.capacity then 'waitlist' else 'booked' end;
  insert into public.batch_bookings (batch_id, user_id, enrolment_id, status)
    values (p_batch, auth.uid(), v_enrol, v_status)
    on conflict (batch_id, user_id) do update set status = excluded.status, enrolment_id = excluded.enrolment_id;
  perform public.recompute_enrolment(v_enrol);
  perform public.notify(auth.uid(),
    case when v_status = 'booked' then 'Academy session booked' else 'Added to waitlist' end,
    b.title || ' on ' || to_char(b.starts_on,'DD Mon YYYY'), '/app/bookings');
  return v_status;
end $$;

create or replace function public.cancel_booking(p_batch uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_enrol uuid; v_next record; b public.batches%rowtype;
begin
  select * into b from public.batches where id = p_batch;
  update public.batch_bookings set status = 'cancelled'
    where batch_id = p_batch and user_id = auth.uid() and status in ('booked','waitlist')
    returning enrolment_id into v_enrol;
  if v_enrol is not null then perform public.recompute_enrolment(v_enrol); end if;
  select * into v_next from public.batch_bookings where batch_id = p_batch and status = 'waitlist'
    order by created_at limit 1;
  if v_next.id is not null and (select count(*) from public.batch_bookings
        where batch_id = p_batch and status in ('booked','attended')) < b.capacity then
    update public.batch_bookings set status = 'booked' where id = v_next.id;
    perform public.notify(v_next.user_id, 'A seat opened up', 'You have been moved from the waitlist to ' || b.title, '/app/bookings');
    if v_next.enrolment_id is not null then perform public.recompute_enrolment(v_next.enrolment_id); end if;
  end if;
end $$;

-- Question text/options WITHOUT answers or explanations (answers are only returned after submission)
create or replace view public.v_assessment_questions as
  select q.id, q.assessment_id, q.category, q.prompt, q.position
  from public.assessment_questions q
  join public.assessments a on a.id = q.assessment_id and a.status = 'published';

create or replace view public.v_assessment_options as
  select o.id, o.question_id, o.label, o.position
  from public.assessment_options o
  join public.assessment_questions q on q.id = o.question_id
  join public.assessments a on a.id = q.assessment_id and a.status = 'published';

create or replace function public.start_attempt(p_assessment uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  a public.assessments%rowtype; e public.course_enrolments%rowtype; v_open uuid; v_last timestamptz; v_id uuid;
begin
  select * into a from public.assessments where id = p_assessment and status = 'published';
  if not found then raise exception 'Assessment not available'; end if;
  select * into e from public.course_enrolments where user_id = auth.uid() and course_id = a.course_id;
  if not found then raise exception 'Enrol in this course first'; end if;
  perform public.recompute_enrolment(e.id);
  select * into e from public.course_enrolments where id = e.id;
  if e.status not in ('assessment_unlocked','needs_retake') then
    raise exception 'The assessment is not unlocked yet. Complete lessons and required academy attendance first.';
  end if;
  -- resume an open attempt that is still within time
  select id into v_open from public.assessment_attempts
    where assessment_id = p_assessment and user_id = auth.uid() and status = 'in_progress'
      and started_at + make_interval(mins => a.time_limit_min) > now() limit 1;
  if v_open is not null then return v_open; end if;
  update public.assessment_attempts set status = 'expired'
    where assessment_id = p_assessment and user_id = auth.uid() and status = 'in_progress';
  select max(submitted_at) into v_last from public.assessment_attempts
    where assessment_id = p_assessment and user_id = auth.uid() and status = 'submitted' and not coalesce(passed,false);
  if v_last is not null and a.retake_after_days > 0 and v_last + make_interval(days => a.retake_after_days) > now() then
    raise exception 'You can retake this assessment on %', to_char(v_last + make_interval(days => a.retake_after_days), 'DD Mon YYYY');
  end if;
  insert into public.assessment_attempts (assessment_id, user_id, enrolment_id) values (p_assessment, auth.uid(), e.id)
    returning id into v_id;
  return v_id;
end $$;

create or replace function public.save_answer(p_attempt uuid, p_question uuid, p_option uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.assessment_attempts where id = p_attempt and user_id = auth.uid() and status = 'in_progress') then
    raise exception 'Attempt is not open';
  end if;
  insert into public.assessment_answers (attempt_id, question_id, option_id) values (p_attempt, p_question, p_option)
    on conflict (attempt_id, question_id) do update set option_id = excluded.option_id;
end $$;

create or replace function public.attempt_review(p_attempt uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare at public.assessment_attempts%rowtype; v jsonb;
begin
  select * into at from public.assessment_attempts where id = p_attempt;
  if not found or at.status <> 'submitted' then raise exception 'Review is available after submission'; end if;
  if at.user_id <> auth.uid() and not public.is_my_learner(at.user_id) then raise exception 'Not allowed'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'question_id', q.id, 'category', q.category, 'prompt', q.prompt, 'explanation', q.explanation,
      'selected_option_id', ans.option_id,
      'correct_option_id', (select o.id from public.assessment_options o where o.question_id = q.id and o.is_correct limit 1),
      'is_correct', coalesce(ans.is_correct,false)) order by q.position), '[]'::jsonb)
    into v
    from public.assessment_questions q
    left join public.assessment_answers ans on ans.question_id = q.id and ans.attempt_id = p_attempt
    where q.assessment_id = at.assessment_id;
  return jsonb_build_object('attempt_id', at.id, 'score_pct', at.score_pct, 'passed', at.passed,
                            'section_scores', at.section_scores, 'review', v);
end $$;

create or replace function public.submit_attempt(p_attempt uuid, p_answers jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  at public.assessment_attempts%rowtype; a public.assessments%rowtype;
  q record; v_opt uuid; v_ok boolean; v_total int := 0; v_correct int := 0; v_sections jsonb := '{}'::jsonb;
  v_cat text; v_score numeric; v_passed boolean; v_sec_ok boolean := true; k text; sec jsonb;
begin
  select * into at from public.assessment_attempts where id = p_attempt and user_id = auth.uid();
  if not found then raise exception 'Attempt not found'; end if;
  if at.status <> 'in_progress' then raise exception 'This attempt was already submitted'; end if;
  select * into a from public.assessments where id = at.assessment_id;

  for q in select id, coalesce(category,'General') as category from public.assessment_questions where assessment_id = a.id loop
    v_total := v_total + 1;
    v_opt := nullif(p_answers ->> q.id::text, '')::uuid;
    v_ok := false;
    if v_opt is not null then
      select o.is_correct into v_ok from public.assessment_options o where o.id = v_opt and o.question_id = q.id;
      v_ok := coalesce(v_ok, false);
    end if;
    insert into public.assessment_answers (attempt_id, question_id, option_id, is_correct)
      values (p_attempt, q.id, v_opt, v_ok)
      on conflict (attempt_id, question_id) do update set option_id = excluded.option_id, is_correct = excluded.is_correct;
    if v_ok then v_correct := v_correct + 1; end if;
    v_sections := jsonb_set(v_sections, array[q.category],
      jsonb_build_object('correct', coalesce((v_sections->q.category->>'correct')::int,0) + case when v_ok then 1 else 0 end,
                         'total',   coalesce((v_sections->q.category->>'total')::int,0) + 1));
  end loop;

  v_score := case when v_total = 0 then 0 else round(100.0 * v_correct / v_total, 2) end;
  if a.compulsory_category is not null and v_sections ? a.compulsory_category then
    sec := v_sections -> a.compulsory_category;
    v_sec_ok := (100.0 * (sec->>'correct')::int / greatest((sec->>'total')::int,1)) >= a.pass_mark;
  end if;
  v_passed := v_total > 0 and v_score >= a.pass_mark and v_sec_ok;

  update public.assessment_attempts
     set status = 'submitted', submitted_at = now(), score_pct = v_score, passed = v_passed, section_scores = v_sections
   where id = p_attempt;
  if at.enrolment_id is not null then perform public.recompute_enrolment(at.enrolment_id); end if;
  perform public.notify(auth.uid(),
    case when v_passed then 'Assessment passed' else 'Assessment result: retake needed' end,
    a.title || ' — ' || v_score || '%', '/app/results/' || p_attempt);
  return public.attempt_review(p_attempt);
end $$;

-- ───────────────────────── staff actions ─────────────────────────
create or replace function public.mark_attendance(p_batch uuid, p_user uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare b public.batches%rowtype; v_enrol uuid;
begin
  select * into b from public.batches where id = p_batch;
  if not found then raise exception 'Batch not found'; end if;
  if not (public.is_admin() or (public.has_role('trainer') and b.trainer_id = auth.uid())) then
    raise exception 'Only the assigned trainer or an admin can mark attendance';
  end if;
  if p_status not in ('present','absent','no_show') then raise exception 'Invalid status'; end if;
  insert into public.attendance (batch_id, user_id, session_date, status, marked_by)
    values (p_batch, p_user, b.starts_on, p_status, auth.uid())
    on conflict (batch_id, user_id, session_date) do update set status = excluded.status, marked_by = excluded.marked_by, marked_at = now();
  update public.batch_bookings set status = case when p_status = 'present' then 'attended' else 'no_show' end
    where batch_id = p_batch and user_id = p_user and status in ('booked','attended','no_show')
    returning enrolment_id into v_enrol;
  if v_enrol is not null then perform public.recompute_enrolment(v_enrol); end if;
  perform public.write_audit('mark_attendance', 'attendance', p_batch::text, jsonb_build_object('user', p_user, 'status', p_status));
end $$;

create or replace function public.set_booking_status(p_batch uuid, p_user uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare b public.batches%rowtype; v_enrol uuid;
begin
  select * into b from public.batches where id = p_batch;
  if not (public.is_admin() or (public.has_role('trainer') and b.trainer_id = auth.uid())) then
    raise exception 'Only the assigned trainer or an admin can manage the roster';
  end if;
  if p_status not in ('booked','waitlist','cancelled') then raise exception 'Invalid status'; end if;
  update public.batch_bookings set status = p_status where batch_id = p_batch and user_id = p_user
    returning enrolment_id into v_enrol;
  if v_enrol is not null then perform public.recompute_enrolment(v_enrol); end if;
  if p_status = 'booked' then
    perform public.notify(p_user, 'Seat confirmed', 'You now have a seat in ' || b.title, '/app/bookings');
  end if;
end $$;

create or replace function public.save_practical(
  p_enrolment uuid, p_checklist uuid, p_item_results jsonb, p_score numeric,
  p_trainer_notes text, p_learner_feedback text, p_evidence text[], p_retake_reason text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  cl public.practical_checklists%rowtype; e public.course_enrolments%rowtype;
  v_all_pass boolean; v_result text; v_id uuid; v_name text;
begin
  if not public.is_staff() then raise exception 'Only trainers and assessors can record practical results'; end if;
  select * into e from public.course_enrolments where id = p_enrolment;
  if not found then raise exception 'Enrolment not found'; end if;
  if not public.is_my_learner(e.user_id) then raise exception 'This learner is not assigned to you'; end if;
  select * into cl from public.practical_checklists where id = p_checklist;
  select full_name into v_name from public.profiles where id = auth.uid();

  select coalesce(bool_and((r->>'pass')::boolean), false) into v_all_pass from jsonb_array_elements(p_item_results) r;
  if cl.min_score_pct is not null and coalesce(p_score,0) < cl.min_score_pct then v_all_pass := false; end if;
  v_result := case when v_all_pass then 'passed' else 'failed' end;
  if v_result = 'failed' and coalesce(trim(p_retake_reason),'') = '' then
    raise exception 'A retake reason is required when any item is not passed';
  end if;
  if v_result = 'passed' and cl.requires_evidence and coalesce(cardinality(p_evidence),0) = 0 then
    raise exception 'Evidence upload is required for this practical';
  end if;

  insert into public.practical_assessments (enrolment_id, checklist_id, learner_id, assessor_id, assessor_name, item_results,
      score_pct, result, trainer_notes, learner_feedback, evidence_paths, retake_reason, completed_on, approval_status)
  values (p_enrolment, p_checklist, e.user_id, auth.uid(), v_name, p_item_results, p_score, v_result, p_trainer_notes,
      p_learner_feedback, coalesce(p_evidence,'{}'), p_retake_reason, current_date, 'pending')
  on conflict (enrolment_id, checklist_id) do update set
      assessor_id = excluded.assessor_id, assessor_name = excluded.assessor_name, item_results = excluded.item_results,
      score_pct = excluded.score_pct, result = excluded.result, trainer_notes = excluded.trainer_notes,
      learner_feedback = excluded.learner_feedback, evidence_paths = excluded.evidence_paths,
      retake_reason = excluded.retake_reason, completed_on = excluded.completed_on,
      approval_status = 'pending', approved_by = null, approved_at = null
  returning id into v_id;

  if coalesce(trim(p_learner_feedback),'') <> '' then
    insert into public.trainer_feedback (enrolment_id, learner_id, trainer_id, trainer_name, message)
      values (p_enrolment, e.user_id, auth.uid(), v_name, p_learner_feedback);
  end if;
  perform public.recompute_enrolment(p_enrolment);
  perform public.notify(e.user_id,
    case when v_result = 'passed' then 'Practical recorded: passed' else 'Practical recorded: retake needed' end,
    cl.title || case when v_result = 'passed' then ' — awaiting trainer approval.' else ' — see feedback.' end, '/app/dashboard');
  perform public.write_audit('save_practical', 'practical_assessments', v_id::text, jsonb_build_object('result', v_result));
  return v_id;
end $$;

-- Digital trainer approval. Assessors can record results but only trainers/admins can approve.
create or replace function public.approve_practical(p_practical uuid, p_approve boolean, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare pa public.practical_assessments%rowtype;
begin
  if not (public.is_admin() or public.has_role('trainer')) then raise exception 'Only trainers or admins can approve'; end if;
  select * into pa from public.practical_assessments where id = p_practical;
  if not found then raise exception 'Practical not found'; end if;
  if not public.is_my_learner(pa.learner_id) then raise exception 'This learner is not assigned to you'; end if;
  if p_approve and pa.result <> 'passed' then raise exception 'Only passed practicals can be approved'; end if;
  if not p_approve and coalesce(trim(p_note),'') = '' then raise exception 'A reason is required to reject'; end if;
  update public.practical_assessments set
      approval_status = case when p_approve then 'approved' else 'rejected' end,
      approved_by = auth.uid(), approved_at = now(),
      result = case when p_approve then result else 'failed' end,
      retake_reason = case when p_approve then retake_reason else p_note end
    where id = p_practical;
  perform public.recompute_enrolment(pa.enrolment_id);
  perform public.write_audit(case when p_approve then 'approve_practical' else 'reject_practical' end,
                             'practical_assessments', p_practical::text, jsonb_build_object('note', p_note));
end $$;

-- ───────────────────────── admin actions ─────────────────────────
create or replace function public.admin_certificate_action(p_cert uuid, p_action text, p_reason text default null, p_months int default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare cert public.certificates%rowtype; c public.courses%rowtype; v_new uuid; v_no text;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into cert from public.certificates where id = p_cert;
  if not found then raise exception 'Certificate not found'; end if;
  select * into c from public.courses where id = cert.course_id;

  if p_action = 'approve' then
    update public.certificates set status = 'valid', issued_on = current_date, approved_by = auth.uid(),
        valid_until = case when c.certificate_validity_months is not null
                           then (current_date + make_interval(months => c.certificate_validity_months))::date end
      where id = p_cert;
    perform public.notify(cert.learner_id, 'Certificate issued', cert.certificate_title || ' (' || cert.cert_no || ') is ready.', '/app/certificates');
  elsif p_action = 'revoke' then
    if coalesce(trim(p_reason),'') = '' then raise exception 'A reason is required to revoke'; end if;
    update public.certificates set status = 'revoked', revoked_reason = p_reason where id = p_cert;
    perform public.notify(cert.learner_id, 'Certificate revoked', cert.cert_no || ': ' || p_reason, '/app/certificates');
  elsif p_action = 'extend' then
    update public.certificates set valid_until = coalesce(valid_until, current_date) + make_interval(months => coalesce(p_months, 12)),
        status = 'valid' where id = p_cert;
  elsif p_action = 'reissue' then
    v_no := 'VTA-' || c.code || '-' || to_char(current_date,'YYYY') || '-' || lpad(nextval('public.certificate_seq')::text,4,'0')
            || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,4));
    update public.certificates set status = 'revoked', revoked_reason = 'Reissued as ' || v_no where id = p_cert and status <> 'revoked';
    insert into public.certificates (cert_no, enrolment_id, learner_id, course_id, learner_name, course_title, role_label,
        certificate_title, status, issued_on, valid_until, approved_by)
      select v_no, cert.enrolment_id, cert.learner_id, cert.course_id, p.full_name, cert.course_title, cert.role_label,
             cert.certificate_title, 'valid', current_date,
             case when c.certificate_validity_months is not null then (current_date + make_interval(months => c.certificate_validity_months))::date end,
             auth.uid()
      from public.profiles p where p.id = cert.learner_id
      returning id into v_new;
    if cert.enrolment_id is not null then perform public.recompute_enrolment(cert.enrolment_id); end if;
    perform public.write_audit('certificate_reissue', 'certificates', p_cert::text, jsonb_build_object('new', v_no));
    return v_new;
  else
    raise exception 'Unknown action';
  end if;
  if cert.enrolment_id is not null then perform public.recompute_enrolment(cert.enrolment_id); end if;
  perform public.write_audit('certificate_' || p_action, 'certificates', p_cert::text, jsonb_build_object('reason', p_reason));
  return p_cert;
end $$;

create or replace function public.admin_update_profile(
  p_user uuid, p_full_name text, p_mobile text, p_city text, p_branch uuid, p_job_role text, p_learner_code text, p_is_active boolean
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  update public.profiles set full_name = coalesce(p_full_name, full_name), mobile = coalesce(p_mobile, mobile),
      city = coalesce(p_city, city), branch_id = coalesce(p_branch, branch_id), job_role = coalesce(p_job_role, job_role),
      learner_code = coalesce(p_learner_code, learner_code), is_active = coalesce(p_is_active, is_active)
    where id = p_user;
  perform public.write_audit('admin_update_profile', 'profiles', p_user::text, jsonb_build_object('is_active', p_is_active));
end $$;

-- Nurse credentials: only the owner, admins and trainers may read them.
create or replace function public.get_nursing_credentials(p_user uuid default null)
returns table (nursing_reg_no text, nursing_doc_path text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_user is null or p_user = auth.uid() then
    return query select p.nursing_reg_no, p.nursing_doc_path from public.profiles p where p.id = auth.uid();
  elsif public.is_admin() or public.has_role('trainer') then
    return query select p.nursing_reg_no, p.nursing_doc_path from public.profiles p where p.id = p_user;
  else
    raise exception 'Not allowed';
  end if;
end $$;

-- ───────────────────────── public certificate verification ─────────────────────────
-- Returns ONLY name, course, dates and status. No scores, mobile numbers, documents or other private data.
create or replace function public.verify_certificate(p_cert_no text)
returns table (cert_no text, learner_name text, course_title text, certificate_title text,
               issued_on date, valid_until date, status text)
language plpgsql security definer set search_path = '' as $$
declare r public.certificates%rowtype; v_found boolean; v_key text := upper(trim(p_cert_no));
begin
  select * into r from public.certificates c where upper(c.cert_no) = v_key;
  v_found := found;
  insert into public.certificate_verifications (cert_no, found) values (left(coalesce(v_key,''), 40), v_found);
  if not v_found then return; end if;
  return query select r.cert_no, r.learner_name, r.course_title, r.certificate_title, r.issued_on, r.valid_until,
    case when r.status = 'valid' and r.valid_until is not null and r.valid_until < current_date then 'expired' else r.status end;
end $$;

-- ───────────────────────── public views ─────────────────────────
create or replace view public.v_lesson_outline as
  select l.id, l.module_id, l.course_id, l.title, l.description, l.duration_min, l.position
  from public.lessons l join public.courses c on c.id = l.course_id and c.status in ('published','coming_soon');

create or replace view public.v_batch_availability as
  select b.*, br.name as branch_name, tr.full_name as trainer_name,
         (select count(*) from public.batch_bookings bb where bb.batch_id = b.id and bb.status in ('booked','attended'))::int as seats_taken,
         (select count(*) from public.batch_bookings bb where bb.batch_id = b.id and bb.status = 'waitlist')::int as waitlist_count
  from public.batches b
  left join public.branches br on br.id = b.branch_id
  left join public.profiles tr on tr.id = b.trainer_id
  where b.status <> 'cancelled';

create or replace view public.v_my_practicals as
  select id, enrolment_id, checklist_id, learner_id, assessor_name, item_results, score_pct, result, learner_feedback,
         retake_reason, completed_on, approval_status, approved_at
  from public.practical_assessments where learner_id = auth.uid();

-- ───────────────────────── audit triggers ─────────────────────────
create trigger trg_audit_user_roles after insert or delete on public.user_roles
  for each row execute function public.audit_row();
create trigger trg_audit_courses after insert or update or delete on public.courses
  for each row execute function public.audit_row();
create trigger trg_audit_batches after insert or update or delete on public.batches
  for each row execute function public.audit_row();
create trigger trg_audit_assessments after insert or update or delete on public.assessments
  for each row execute function public.audit_row();

-- ───────────────────────── execute grants ─────────────────────────
revoke execute on function public.recompute_enrolment(uuid), public.issue_certificate_internal(uuid),
  public.notify(uuid,text,text,text), public.write_audit(text,text,text,jsonb), public.audit_row()
  from public, anon, authenticated;
revoke execute on function public.enrol_in_course(uuid,text), public.complete_lesson(uuid), public.book_batch(uuid),
  public.cancel_booking(uuid), public.start_attempt(uuid), public.save_answer(uuid,uuid,uuid),
  public.attempt_review(uuid), public.submit_attempt(uuid,jsonb), public.mark_attendance(uuid,uuid,text),
  public.set_booking_status(uuid,uuid,text), public.save_practical(uuid,uuid,jsonb,numeric,text,text,text[],text),
  public.approve_practical(uuid,boolean,text), public.admin_certificate_action(uuid,text,text,int),
  public.admin_update_profile(uuid,text,text,text,uuid,text,text,boolean), public.get_nursing_credentials(uuid),
  public.sync_certificate_statuses() from public, anon;
grant execute on function public.enrol_in_course(uuid,text), public.complete_lesson(uuid), public.book_batch(uuid),
  public.cancel_booking(uuid), public.start_attempt(uuid), public.save_answer(uuid,uuid,uuid),
  public.attempt_review(uuid), public.submit_attempt(uuid,jsonb), public.mark_attendance(uuid,uuid,text),
  public.set_booking_status(uuid,uuid,text), public.save_practical(uuid,uuid,jsonb,numeric,text,text,text[],text),
  public.approve_practical(uuid,boolean,text), public.admin_certificate_action(uuid,text,text,int),
  public.admin_update_profile(uuid,text,text,text,uuid,text,text,boolean), public.get_nursing_credentials(uuid),
  public.sync_certificate_statuses() to authenticated;
grant execute on function public.verify_certificate(text) to anon, authenticated;
grant select on public.v_lesson_outline, public.v_batch_availability to anon, authenticated;
grant select on public.v_assessment_questions, public.v_assessment_options, public.v_my_practicals to authenticated;
