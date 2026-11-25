-- VTIARA Training Academy — Row Level Security
-- Principle: tables are closed by default. Learners can only read their own rows.
-- Anything that changes learning state (enrol, progress, grading, certificates) goes through the
-- SECURITY DEFINER functions in 0002_functions.sql, never through direct table writes.

alter table public.roles enable row level security;
alter table public.branches enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_resources enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.lesson_questions enable row level security;
alter table public.course_enrolments enable row level security;
alter table public.batches enable row level security;
alter table public.batch_bookings enable row level security;
alter table public.attendance enable row level security;
alter table public.assessments enable row level security;
alter table public.assessment_questions enable row level security;
alter table public.assessment_options enable row level security;
alter table public.assessment_attempts enable row level security;
alter table public.assessment_answers enable row level security;
alter table public.practical_checklists enable row level security;
alter table public.practical_checklist_items enable row level security;
alter table public.practical_assessments enable row level security;
alter table public.trainer_feedback enable row level security;
alter table public.certificates enable row level security;
alter table public.certificate_verifications enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

-- ───────────── roles / branches ─────────────
create policy roles_read on public.roles for select to authenticated using (true);
create policy branches_public_read on public.branches for select to anon, authenticated using (is_active or public.is_admin());
create policy branches_admin_write on public.branches for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ───────────── profiles ─────────────
-- Column-level privileges keep nursing registration data out of ordinary reads; see get_nursing_credentials().
revoke all on public.profiles from anon, authenticated;
grant select (id, full_name, email, mobile, city, preferred_language, learner_code, job_role, branch_id,
              avatar_path, consent_privacy, consent_comms, is_active, created_at, updated_at)
  on public.profiles to authenticated;
grant update (full_name, mobile, city, preferred_language, learner_code, job_role, branch_id, avatar_path,
              nursing_reg_no, nursing_doc_path, consent_privacy, consent_comms)
  on public.profiles to authenticated;

create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_my_learner(id) or public.is_admin());
-- (trainer names shown on batches come from v_batch_availability, which exposes full_name only)
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ───────────── user_roles ─────────────
create policy user_roles_read on public.user_roles for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy user_roles_admin_insert on public.user_roles for insert to authenticated
  with check (public.is_admin() and (role_key not in ('super_admin','academy_admin') or public.has_role('super_admin')));
create policy user_roles_admin_delete on public.user_roles for delete to authenticated
  using (public.is_admin() and (role_key not in ('super_admin','academy_admin') or public.has_role('super_admin')));

-- ───────────── courses & content ─────────────
create policy courses_public_read on public.courses for select to anon, authenticated
  using (status in ('published','coming_soon') or public.is_staff());
create policy courses_admin_write on public.courses for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy modules_public_read on public.course_modules for select to anon, authenticated
  using (exists (select 1 from public.courses c where c.id = course_id and (c.status in ('published','coming_soon') or public.is_staff())));
create policy modules_admin_write on public.course_modules for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- full lesson rows (transcripts, video paths) only for enrolled learners and staff; outline is public via v_lesson_outline
create policy lessons_enrolled_read on public.lessons for select to authenticated using (public.is_enrolled_in(course_id));
create policy lessons_admin_write on public.lessons for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy resources_enrolled_read on public.lesson_resources for select to authenticated
  using (exists (select 1 from public.lessons l where l.id = lesson_id and public.is_enrolled_in(l.course_id)));
create policy resources_admin_write on public.lesson_resources for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy progress_read on public.lesson_progress for select to authenticated
  using (user_id = auth.uid() or public.is_my_learner(user_id));

create policy lq_read on public.lesson_questions for select to authenticated using (user_id = auth.uid() or public.is_staff());
create policy lq_insert on public.lesson_questions for insert to authenticated
  with check (user_id = auth.uid() and answer is null and answered_by is null);
create policy lq_staff_answer on public.lesson_questions for update to authenticated using (public.is_staff()) with check (public.is_staff());

-- ───────────── enrolments ─────────────
create policy enrol_read on public.course_enrolments for select to authenticated
  using (user_id = auth.uid() or public.is_my_learner(user_id));
create policy enrol_admin_write on public.course_enrolments for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ───────────── batches ─────────────
create policy batches_public_read on public.batches for select to anon, authenticated using (status <> 'cancelled' or public.is_staff());
create policy batches_admin_write on public.batches for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy batches_trainer_insert on public.batches for insert to authenticated
  with check (public.has_role('trainer') and trainer_id = auth.uid());
create policy batches_trainer_update on public.batches for update to authenticated
  using (public.has_role('trainer') and trainer_id = auth.uid()) with check (public.has_role('trainer') and trainer_id = auth.uid());

create policy bookings_read on public.batch_bookings for select to authenticated
  using (user_id = auth.uid() or public.is_admin()
         or exists (select 1 from public.batches b where b.id = batch_id and b.trainer_id = auth.uid()));
create policy attendance_read on public.attendance for select to authenticated
  using (user_id = auth.uid() or public.is_admin()
         or exists (select 1 from public.batches b where b.id = batch_id and b.trainer_id = auth.uid()));

-- ───────────── assessments (answers never reach learners) ─────────────
create policy assessments_read on public.assessments for select to anon, authenticated using (status = 'published' or public.is_staff());
create policy assessments_admin_write on public.assessments for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- questions & options contain the answer key and explanations → staff only. Learners use v_assessment_* views.
create policy aq_staff_read on public.assessment_questions for select to authenticated using (public.is_staff());
create policy aq_admin_write on public.assessment_questions for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy ao_staff_read on public.assessment_options for select to authenticated using (public.is_staff());
create policy ao_admin_write on public.assessment_options for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy attempts_read on public.assessment_attempts for select to authenticated
  using (user_id = auth.uid() or public.is_my_learner(user_id));
create policy answers_read on public.assessment_answers for select to authenticated
  using (exists (select 1 from public.assessment_attempts a where a.id = attempt_id
                 and (a.user_id = auth.uid() or public.is_my_learner(a.user_id))));

-- ───────────── practicals ─────────────
create policy pc_read on public.practical_checklists for select to anon, authenticated using (true);
create policy pc_admin_write on public.practical_checklists for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy pci_read on public.practical_checklist_items for select to anon, authenticated using (true);
create policy pci_admin_write on public.practical_checklist_items for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- trainer notes are internal: learners read their own result through v_my_practicals (no trainer_notes column)
create policy pa_staff_read on public.practical_assessments for select to authenticated
  using (public.is_staff() and public.is_my_learner(learner_id));

create policy feedback_read on public.trainer_feedback for select to authenticated
  using (learner_id = auth.uid() or (public.is_staff() and public.is_my_learner(learner_id)));
create policy feedback_staff_insert on public.trainer_feedback for insert to authenticated
  with check (public.is_staff() and trainer_id = auth.uid() and public.is_my_learner(learner_id));

-- ───────────── certificates ─────────────
create policy certs_read on public.certificates for select to authenticated
  using (learner_id = auth.uid() or (public.is_staff() and public.is_my_learner(learner_id)));
create policy cv_admin_read on public.certificate_verifications for select to authenticated using (public.is_admin());

-- ───────────── notifications & audit ─────────────
create policy notif_read on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notif_update on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy audit_admin_read on public.audit_logs for select to authenticated using (public.is_admin());

-- Table privileges: no direct DML beyond what the policies above allow.
revoke insert, update, delete on public.course_enrolments, public.lesson_progress, public.batch_bookings, public.attendance,
  public.assessment_attempts, public.assessment_answers, public.practical_assessments, public.certificates,
  public.certificate_verifications, public.audit_logs from anon, authenticated;
revoke all on public.practical_assessments, public.certificate_verifications from anon;
revoke update on public.course_enrolments from authenticated;
grant update (mode) on public.course_enrolments to authenticated;  -- admins only via policy
revoke insert, delete on public.notifications from anon, authenticated;
