-- VTIARA Training Academy — core schema
-- Run in order: 0001_schema → 0002_functions → 0003_rls → 0004_storage → seed.sql

-- ───────────────────────── reference tables ─────────────────────────
create table public.roles (
  key text primary key,
  label text not null
);
insert into public.roles (key, label) values
  ('super_admin','Super Admin'), ('academy_admin','Academy Admin'),
  ('trainer','Trainer'), ('assessor','Assessor'), ('learner','Learner');

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  mobile text,
  city text,
  preferred_language text default 'English',
  learner_code text,                       -- employee ID or learner ID
  job_role text,                           -- role the person is training for
  branch_id uuid references public.branches(id),
  avatar_path text,                        -- storage path (learner-documents bucket, private)
  nursing_reg_no text,                     -- nurses only; visible to admins/trainers via RLS
  nursing_doc_path text,
  consent_privacy boolean not null default false,
  consent_comms boolean not null default false,
  consented_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_key text not null references public.roles(key),
  assigned_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (user_id, role_key)
);

-- ───────────────────────── courses ─────────────────────────
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  code text not null,                       -- used in certificate IDs
  category text not null check (category in ('Clinical and Support','Front Office and Management')),
  role_key text,
  role_label text,
  status text not null default 'draft' check (status in ('draft','published','coming_soon','archived')),
  sort_order int not null default 100,
  duration_hours int not null default 0,
  duration_label text,
  level text not null default 'Foundation' check (level in ('Foundation','Intermediate','Advanced')),
  languages text[] not null default '{English}',
  learning_modes text[] not null default '{online}',
  certificate_title text,
  certificate_validity_months int,          -- null = certificate does not expire
  requires_attendance boolean not null default false,
  requires_practical boolean not null default false,
  requires_trainer_approval boolean not null default false,
  short_description text,
  overview text,
  audience text,
  eligibility text[] not null default '{}',
  learning_outcomes text[] not null default '{}',
  requirements_text text[] not null default '{}',
  pass_rules jsonb not null default '{}',
  faq jsonb not null default '[]',
  image_path text,                          -- course-thumbnails bucket
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  position int not null default 0
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  video_path text,                          -- course-videos bucket
  duration_min int not null default 10,
  transcript text,
  position int not null default 0
);

create table public.lesson_resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  title text not null,
  kind text not null default 'pdf',
  file_path text not null                   -- course-resources bucket
);

create table public.lesson_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table public.lesson_questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  question text not null,
  answer text,
  answered_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ───────────────────────── enrolments ─────────────────────────
create table public.course_enrolments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  mode text not null default 'blended' check (mode in ('online','academy','blended')),
  status text not null default 'not_started' check (status in (
    'not_started','in_progress','session_booked','assessment_unlocked',
    'awaiting_approval','certified','needs_retake','expired')),
  progress_pct int not null default 0 check (progress_pct between 0 and 100),
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, course_id)
);

-- ───────────────────────── batches ─────────────────────────
create table public.batches (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  branch_id uuid references public.branches(id),
  trainer_id uuid references public.profiles(id),
  title text not null,
  starts_on date not null,
  start_time time not null default '10:00',
  end_time time not null default '17:00',
  capacity int not null default 15 check (capacity > 0),
  mode text not null default 'academy' check (mode in ('online','academy','blended')),
  location text,
  what_to_bring text default 'Government photo ID, notebook and pen, closed-toe shoes, clinic uniform if issued.',
  practical_requirements text,
  status text not null default 'open' check (status in ('open','full','in_progress','completed','cancelled')),
  created_at timestamptz not null default now()
);

create table public.batch_bookings (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  enrolment_id uuid references public.course_enrolments(id) on delete set null,
  status text not null default 'booked' check (status in ('booked','waitlist','cancelled','attended','no_show')),
  created_at timestamptz not null default now(),
  unique (batch_id, user_id)
);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_date date not null,
  status text not null check (status in ('present','absent','no_show')),
  marked_by uuid references public.profiles(id),
  marked_at timestamptz not null default now(),
  unique (batch_id, user_id, session_date)
);

-- ───────────────────────── assessments ─────────────────────────
create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  time_limit_min int not null default 30,
  pass_mark int not null default 80 check (pass_mark between 0 and 100),
  num_questions int not null default 20,     -- target size of the full question bank
  retake_after_days int not null default 0,
  compulsory_category text,                   -- section that must also be passed (e.g. Compliance)
  status text not null default 'published' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now()
);

create table public.assessment_questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  category text,
  prompt text not null,
  explanation text,
  position int not null default 0
);

create table public.assessment_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.assessment_questions(id) on delete cascade,
  label text not null,
  is_correct boolean not null default false,
  position int not null default 0
);

create table public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  enrolment_id uuid references public.course_enrolments(id) on delete set null,
  status text not null default 'in_progress' check (status in ('in_progress','submitted','expired')),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score_pct numeric(5,2),
  passed boolean,
  section_scores jsonb
);

create table public.assessment_answers (
  attempt_id uuid not null references public.assessment_attempts(id) on delete cascade,
  question_id uuid not null references public.assessment_questions(id) on delete cascade,
  option_id uuid references public.assessment_options(id),
  is_correct boolean,
  primary key (attempt_id, question_id)
);

-- ───────────────────────── practicals ─────────────────────────
create table public.practical_checklists (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  requires_evidence boolean not null default false,
  min_score_pct int                          -- e.g. 85 for telecaller mock calls
);

create table public.practical_checklist_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.practical_checklists(id) on delete cascade,
  label text not null,
  is_critical boolean not null default false,
  position int not null default 0
);

create table public.practical_assessments (
  id uuid primary key default gen_random_uuid(),
  enrolment_id uuid not null references public.course_enrolments(id) on delete cascade,
  checklist_id uuid not null references public.practical_checklists(id) on delete cascade,
  learner_id uuid not null references public.profiles(id) on delete cascade,
  assessor_id uuid references public.profiles(id),
  assessor_name text,
  item_results jsonb not null default '[]',   -- [{item_id, pass, note}]
  score_pct numeric(5,2),
  result text not null default 'pending' check (result in ('pending','passed','failed')),
  trainer_notes text,
  learner_feedback text,
  evidence_paths text[] not null default '{}',
  retake_reason text,
  completed_on date,
  approval_status text not null default 'pending' check (approval_status in ('pending','approved','rejected')),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (enrolment_id, checklist_id)
);

create table public.trainer_feedback (
  id uuid primary key default gen_random_uuid(),
  enrolment_id uuid references public.course_enrolments(id) on delete cascade,
  learner_id uuid not null references public.profiles(id) on delete cascade,
  trainer_id uuid references public.profiles(id),
  trainer_name text,
  message text not null,
  created_at timestamptz not null default now()
);

-- ───────────────────────── certificates ─────────────────────────
create sequence public.certificate_seq start 1;

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  cert_no text not null unique,
  enrolment_id uuid references public.course_enrolments(id) on delete set null,
  learner_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id),
  learner_name text not null,                 -- snapshot at issue
  course_title text not null,
  role_label text,
  certificate_title text,
  status text not null default 'awaiting_approval' check (status in ('awaiting_approval','valid','expired','revoked')),
  issued_on date,
  valid_until date,
  approved_by uuid references public.profiles(id),
  revoked_reason text,
  created_at timestamptz not null default now()
);

create table public.certificate_verifications (
  id uuid primary key default gen_random_uuid(),
  cert_no text not null,
  found boolean not null,
  verified_at timestamptz not null default now()
);

-- ───────────────────────── ops ─────────────────────────
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_name text,
  action text not null,
  entity text,
  entity_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

-- ───────────────────────── indexes ─────────────────────────
create index on public.lessons (course_id, position);
create index on public.course_modules (course_id, position);
create index on public.course_enrolments (user_id);
create index on public.batch_bookings (user_id);
create index on public.batch_bookings (batch_id);
create index on public.attendance (user_id);
create index on public.assessment_attempts (user_id, assessment_id);
create index on public.assessment_questions (assessment_id);
create index on public.assessment_options (question_id);
create index on public.practical_assessments (learner_id);
create index on public.certificates (learner_id);
create index on public.notifications (user_id, is_read);
create index on public.audit_logs (created_at desc);
create index on public.user_roles (role_key);

-- updated_at helper
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

create trigger trg_profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger trg_courses_touch before update on public.courses
  for each row execute function public.touch_updated_at();
