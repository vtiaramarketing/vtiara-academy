-- 0005 · Enrolment requests, access workflow, lesson types and publishing.
-- Idempotent and non-destructive: existing enrolments keep working (they are back-filled as 'active').
-- Run after 0001-0004. Safe to re-run.

-- ───────────────────────── enrolment access workflow ─────────────────────────
-- course_enrolments.status stays the LEARNING state (lessons → booking → assessment → certificate).
-- access_status is the ADMIN-CONTROLLED request state: pending → approved → active → completed, or cancelled.
alter table public.course_enrolments add column if not exists access_status text not null default 'active';
alter table public.course_enrolments add column if not exists request_note text;
alter table public.course_enrolments add column if not exists access_changed_by uuid references public.profiles(id) on delete set null;
alter table public.course_enrolments add column if not exists access_changed_at timestamptz;
alter table public.course_enrolments drop constraint if exists course_enrolments_access_status_check;
alter table public.course_enrolments add constraint course_enrolments_access_status_check
  check (access_status in ('pending','approved','active','completed','cancelled'));
alter table public.course_enrolments alter column access_status set default 'pending';  -- after back-fill above
create index if not exists idx_enrol_access on public.course_enrolments (access_status);
create index if not exists idx_enrol_user on public.course_enrolments (user_id);

create table if not exists public.enrolment_status_history (
  id uuid primary key default gen_random_uuid(),
  enrolment_id uuid not null references public.course_enrolments(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references public.profiles(id) on delete set null,
  changed_by_name text,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists idx_enrol_hist on public.enrolment_status_history (enrolment_id, created_at desc);
alter table public.enrolment_status_history enable row level security;
drop policy if exists enrol_hist_read on public.enrolment_status_history;
create policy enrol_hist_read on public.enrolment_status_history for select to authenticated
  using (public.is_admin() or exists (select 1 from public.course_enrolments e
         where e.id = enrolment_id and (e.user_id = auth.uid() or public.is_my_learner(e.user_id))));
revoke insert, update, delete on public.enrolment_status_history from anon, authenticated;

create or replace function public.has_active_access(p_enrolment uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.course_enrolments
                 where id = p_enrolment and access_status in ('active','completed'))
$$;

-- Learners (and staff previewing) can read lessons only for courses where the enrolment is active.
create or replace function public.is_enrolled_in(p_course uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_staff() or exists (
    select 1 from public.course_enrolments
    where user_id = auth.uid() and course_id = p_course and access_status in ('active','completed'))
$$;

-- ───────────────────────── lesson types and publishing ─────────────────────────
alter table public.course_modules add column if not exists is_published boolean not null default true;
alter table public.lessons add column if not exists lesson_type text not null default 'video';
alter table public.lessons add column if not exists body text;                 -- text lessons (plain text / markdown)
alter table public.lessons add column if not exists external_url text;         -- external link, or hosted PDF/resource URL
alter table public.lessons add column if not exists video_url text;            -- secure provider URL; never the video file itself
alter table public.lessons add column if not exists video_provider text;       -- e.g. vimeo, youtube-unlisted, mux
alter table public.lessons add column if not exists is_published boolean not null default true;
alter table public.lessons drop constraint if exists lessons_lesson_type_check;
alter table public.lessons add constraint lessons_lesson_type_check check (lesson_type in ('video','text','pdf','link'));
alter table public.lessons drop constraint if exists lessons_external_url_check;
alter table public.lessons add constraint lessons_external_url_check
  check (external_url is null or external_url ~* '^https://') not valid;
alter table public.lessons drop constraint if exists lessons_video_url_check;
alter table public.lessons add constraint lessons_video_url_check
  check (video_url is null or video_url ~* '^https://') not valid;
create index if not exists idx_lessons_module_pos on public.lessons (module_id, position);
create index if not exists idx_modules_course_pos on public.course_modules (course_id, position);

drop policy if exists modules_public_read on public.course_modules;
create policy modules_public_read on public.course_modules for select to anon, authenticated
  using (exists (select 1 from public.courses c where c.id = course_id and (c.status in ('published','coming_soon') or public.is_staff()))
         and (is_published or public.is_admin()));

drop policy if exists lessons_enrolled_read on public.lessons;
create policy lessons_enrolled_read on public.lessons for select to authenticated
  using (public.is_admin() or (is_published and public.is_enrolled_in(course_id)
         and exists (select 1 from public.course_modules m where m.id = module_id and m.is_published)));

drop policy if exists resources_enrolled_read on public.lesson_resources;
create policy resources_enrolled_read on public.lesson_resources for select to authenticated
  using (exists (select 1 from public.lessons l where l.id = lesson_id
         and (public.is_admin() or (l.is_published and public.is_enrolled_in(l.course_id)))));

create or replace view public.v_lesson_outline as
  select l.id, l.module_id, l.course_id, l.title, l.description, l.duration_min, l.position, l.lesson_type
  from public.lessons l
  join public.course_modules m on m.id = l.module_id and m.is_published
  join public.courses c on c.id = l.course_id and c.status in ('published','coming_soon')
  where l.is_published;
grant select on public.v_lesson_outline to anon, authenticated;

-- ───────────────────────── enrolment RPCs ─────────────────────────
create or replace function public.enrol_in_course(p_course uuid, p_mode text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare c public.courses%rowtype; v_id uuid; v_old text; v_name text; a record;
begin
  if auth.uid() is null then raise exception 'Please sign in to request enrolment'; end if;
  select * into c from public.courses where id = p_course and status = 'published';
  if not found then raise exception 'This course is not open for enrolment'; end if;
  if not (p_mode = any (c.learning_modes)) then raise exception 'This course is not offered in % mode', p_mode; end if;
  select id, access_status into v_id, v_old from public.course_enrolments where user_id = auth.uid() and course_id = p_course;
  if v_id is null then
    insert into public.course_enrolments (user_id, course_id, mode, access_status)
      values (auth.uid(), p_course, p_mode, 'pending') returning id into v_id;
  elsif v_old = 'cancelled' then
    update public.course_enrolments set access_status = 'pending', mode = p_mode,
           access_changed_by = auth.uid(), access_changed_at = now() where id = v_id;
  else
    raise exception 'You already have an enrolment for this course (%).', v_old;
  end if;
  select full_name into v_name from public.profiles where id = auth.uid();
  insert into public.enrolment_status_history (enrolment_id, from_status, to_status, changed_by, changed_by_name, note)
    values (v_id, v_old, 'pending', auth.uid(), v_name, 'Enrolment requested');
  perform public.notify(auth.uid(), 'Enrolment request received', 'Your request for ' || c.title || ' is awaiting approval.', '/app/courses/' || c.slug);
  for a in select user_id from public.user_roles where role_key in ('academy_admin','super_admin') loop
    perform public.notify(a.user_id, 'New enrolment request', coalesce(v_name,'A learner') || ' requested ' || c.title, '/admin/enrolments');
  end loop;
  return v_id;
end $$;

-- Admin-only: approve | activate | deactivate | complete | reject/cancel | reopen.
create or replace function public.set_enrolment_access(p_enrolment uuid, p_status text, p_note text default null) returns text
language plpgsql security definer set search_path = '' as $$
declare e public.course_enrolments%rowtype; c public.courses%rowtype; v_name text; ok boolean;
begin
  if not public.is_admin() then raise exception 'Only admins can change enrolment status'; end if;
  if p_status not in ('pending','approved','active','completed','cancelled') then raise exception 'Unknown status'; end if;
  select * into e from public.course_enrolments where id = p_enrolment for update;
  if not found then raise exception 'Enrolment not found'; end if;
  if e.access_status = p_status then raise exception 'Enrolment is already %', p_status; end if;
  ok := case e.access_status
    when 'pending'   then p_status in ('approved','active','cancelled')
    when 'approved'  then p_status in ('active','cancelled')
    when 'active'    then p_status in ('approved','completed','cancelled')   -- active → approved = deactivate (access paused)
    when 'completed' then p_status in ('active')
    when 'cancelled' then p_status in ('pending','approved')
    else false end;
  if not ok then raise exception 'Cannot change an enrolment from % to %', e.access_status, p_status; end if;
  if p_status = 'cancelled' and coalesce(btrim(p_note),'') = '' then raise exception 'A reason is required to reject or cancel'; end if;
  select * into c from public.courses where id = e.course_id;
  select full_name into v_name from public.profiles where id = auth.uid();
  update public.course_enrolments set access_status = p_status, access_changed_by = auth.uid(), access_changed_at = now() where id = p_enrolment;
  insert into public.enrolment_status_history (enrolment_id, from_status, to_status, changed_by, changed_by_name, note)
    values (p_enrolment, e.access_status, p_status, auth.uid(), v_name, nullif(btrim(coalesce(p_note,'')),''));
  perform public.notify(e.user_id, 'Enrolment ' || p_status, c.title || case when p_note is not null and btrim(p_note) <> '' then ': ' || p_note else '' end, '/app/courses/' || c.slug);
  perform public.write_audit('set_enrolment_access', 'course_enrolments', p_enrolment::text,
    jsonb_build_object('from', e.access_status, 'to', p_status, 'note', p_note));
  return p_status;
end $$;

-- Existing RPCs, now gated on active access (bodies unchanged otherwise).
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
  if not public.has_active_access(v_enrol) then raise exception 'Your enrolment must be active before you can book a batch'; end if;
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

create or replace function public.start_attempt(p_assessment uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  a public.assessments%rowtype; e public.course_enrolments%rowtype; v_open uuid; v_last timestamptz; v_id uuid;
begin
  select * into a from public.assessments where id = p_assessment and status = 'published';
  if not found then raise exception 'Assessment not available'; end if;
  select * into e from public.course_enrolments where user_id = auth.uid() and course_id = a.course_id;
  if not found then raise exception 'Enrol in this course first'; end if;
  if not public.has_active_access(e.id) then raise exception 'Your enrolment must be active to take the assessment'; end if;
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

create or replace function public.complete_lesson(p_lesson uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare l public.lessons%rowtype; v_enrol uuid; v_status text; v_pct int;
begin
  select * into l from public.lessons where id = p_lesson;
  if not found then raise exception 'Lesson not found'; end if;
  select id into v_enrol from public.course_enrolments where user_id = auth.uid() and course_id = l.course_id;
  if v_enrol is null then raise exception 'Enrol in this course to track lessons'; end if;
  if not public.has_active_access(v_enrol) then raise exception 'Your enrolment is not active'; end if;
  if not l.is_published then raise exception 'This lesson is not available'; end if;
  insert into public.lesson_progress (user_id, lesson_id, course_id) values (auth.uid(), p_lesson, l.course_id)
    on conflict do nothing;
  v_status := public.recompute_enrolment(v_enrol);
  select progress_pct into v_pct from public.course_enrolments where id = v_enrol;
  return v_pct;
end $$;

-- ───────────────────────── grants ─────────────────────────
revoke execute on function public.enrol_in_course(uuid,text), public.set_enrolment_access(uuid,text,text),
  public.complete_lesson(uuid), public.book_batch(uuid), public.start_attempt(uuid), public.has_active_access(uuid)
  from public, anon;
grant execute on function public.enrol_in_course(uuid,text), public.set_enrolment_access(uuid,text,text),
  public.complete_lesson(uuid), public.book_batch(uuid), public.start_attempt(uuid), public.has_active_access(uuid)
  to authenticated;
