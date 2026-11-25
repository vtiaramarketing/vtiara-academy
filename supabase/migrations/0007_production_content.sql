-- 0007 · Production content, enquiries, governance.
-- Idempotent and non-destructive. Run after 0001-0006. Safe to re-run.
-- Public facts below (clinic contact details, hours, social links, Dr. Madan Kumar BJ's published profile) come from
-- https://vtiaraclinic.com. Anything the clinic site does not publish for the ACADEMY stays empty and is listed in
-- academy_settings.needs_confirmation until the academy confirms it in Admin → Academy settings.

-- ───────────────────────── academy settings (single row) ─────────────────────────
create table if not exists public.academy_settings (
  id int primary key default 1 check (id = 1),
  -- academy-specific (kept separate from clinic details so they can change independently)
  academy_name text not null default 'VTIARA Training Academy',
  tagline text,
  academy_address text,
  academy_maps_url text,
  academy_phone text,
  academy_whatsapp text,
  academy_email text,
  academy_hours text,
  -- clinic details (from vtiaraclinic.com)
  clinic_name text not null default 'VTIARA Hair & Skin Clinic',
  clinic_website text,
  clinic_address text,
  clinic_maps_url text,
  clinic_phone text,
  clinic_whatsapp text,
  clinic_email text,
  clinic_hours text,
  instagram_url text,
  facebook_url text,
  youtube_url text,
  linkedin_url text,
  whatsapp_message text,
  needs_confirmation text[] not null default '{}',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  constraint settings_urls_https check (
    coalesce(academy_maps_url,'https://') ~* '^https://' and coalesce(clinic_maps_url,'https://') ~* '^https://'
    and coalesce(clinic_website,'https://') ~* '^https://' and coalesce(instagram_url,'https://') ~* '^https://'
    and coalesce(facebook_url,'https://') ~* '^https://' and coalesce(youtube_url,'https://') ~* '^https://'
    and coalesce(linkedin_url,'https://') ~* '^https://')
);
insert into public.academy_settings (
  id, tagline, clinic_website, clinic_address, clinic_maps_url, clinic_phone, clinic_whatsapp, clinic_email, clinic_hours,
  instagram_url, facebook_url, youtube_url, linkedin_url, whatsapp_message, needs_confirmation)
values (
  1,
  'Structured online, academy and supervised training for safe, consistent VTIARA care.',
  'https://vtiaraclinic.com',
  '1st Floor, Chinmaya Mission Hospital Road, near Indiranagar Metro Station, Hoysala Nagar, Indiranagar, Bangalore, Karnataka 560 038',
  'https://maps.app.goo.gl/kJQtHceQpqWjZetQ9',
  '+91 63613 47722', '+91 63613 47722', 'manager@vtiaraclinic.com',
  'Monday to Sunday, 10:00 AM to 7:30 PM',
  'https://www.instagram.com/vtiaraclinic', 'https://www.facebook.com/profile.php?id=61552901284322',
  'https://www.youtube.com/@vtiarahairskinclinic850', 'https://www.linkedin.com/company/vtiara-hair-skin-clinic/',
  'Hi VTIARA Training Academy! I would like to know more about your courses.',
  array['academy_address','academy_phone','academy_whatsapp','academy_email','academy_hours','clinic_address','academy_venue'])
on conflict (id) do nothing;

alter table public.academy_settings enable row level security;
drop policy if exists settings_public_read on public.academy_settings;
create policy settings_public_read on public.academy_settings for select to anon, authenticated using (true);
drop policy if exists settings_admin_write on public.academy_settings;
create policy settings_admin_write on public.academy_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ───────────────────────── branches: real clinic locations ─────────────────────────
alter table public.branches add column if not exists maps_url text;
alter table public.branches add column if not exists phone text;
alter table public.branches add column if not exists hours text;
alter table public.branches drop constraint if exists branches_maps_https;
alter table public.branches add constraint branches_maps_https check (maps_url is null or maps_url ~* '^https://');

-- Replace the placeholder branches created by the first seed (matched by their old names).
update public.branches set
  name = 'VTIARA Indiranagar', city = 'Bangalore',
  address = '1st Floor, Chinmaya Mission Hospital Road, near Indiranagar Metro Station, Hoysala Nagar, Indiranagar, Bangalore 560 038',
  maps_url = 'https://maps.app.goo.gl/kJQtHceQpqWjZetQ9', phone = '+91 63613 47722', hours = 'Monday to Sunday, 10:00 AM to 7:30 PM'
where name like 'VTIARA Bangalore – Main Clinic%';
update public.branches set
  name = 'VTIARA New BEL Road', city = 'Bangalore', address = 'New BEL Road, Bangalore 560 094',
  maps_url = 'https://maps.app.goo.gl/E9fSJ2oELxkVfB5c9', phone = '+91 63613 47722', hours = 'Monday to Sunday, 10:00 AM to 7:30 PM'
where name like 'VTIARA Bangalore – Branch 2%';
update public.branches set maps_url = 'https://maps.app.goo.gl/kJQtHceQpqWjZetQ9', phone = '+91 63613 47722', hours = 'Monday to Sunday, 10:00 AM to 7:30 PM'
where name = 'VTIARA Indiranagar' and maps_url is null;
update public.branches set maps_url = 'https://maps.app.goo.gl/E9fSJ2oELxkVfB5c9', phone = '+91 63613 47722', hours = 'Monday to Sunday, 10:00 AM to 7:30 PM'
where name = 'VTIARA New BEL Road' and maps_url is null;
update public.batches b set location = br.name || ' — ' || coalesce(br.address, '')
from public.branches br
where br.id = b.branch_id and (b.location like '%to be updated%' or b.location like '%Sample branch%' or b.location like 'VTIARA Bangalore –%');

-- ───────────────────────── trainer / medical-advisor profiles ─────────────────────────
create table if not exists public.trainer_profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  title text,
  qualification text,
  specialisation text,
  bio text,
  photo_url text check (photo_url is null or photo_url ~* '^https://'),   -- publicly published photo (external)
  photo_path text,                                                       -- or an upload in the trainer-photos bucket
  source_url text check (source_url is null or source_url ~* '^https://'),
  is_medical_advisor boolean not null default false,
  sort_order int not null default 100,
  is_published boolean not null default false,
  needs_confirmation boolean not null default true,
  user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.trainer_profiles enable row level security;
drop policy if exists trainers_public_read on public.trainer_profiles;
create policy trainers_public_read on public.trainer_profiles for select to anon, authenticated using (is_published or public.is_admin());
drop policy if exists trainers_admin_write on public.trainer_profiles;
create policy trainers_admin_write on public.trainer_profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.trainer_profiles (id, full_name, title, qualification, specialisation, bio, photo_url, source_url, sort_order, is_published, needs_confirmation)
values ('5c1d0c1e-7a41-4f55-9a3b-0d6f6c1a0001', 'Dr. Madan Kumar BJ', 'MD & Co-Founder, VTIARA Hair & Skin Clinic', 'MD',
  'Aesthetic dermatology, trichology and hair restoration',
  'Consultant dermatologist and hair transplant surgeon, and co-founder of VTIARA Hair & Skin Clinic. The clinic website cites over 15 years of experience and a Times Health Excellence 2025 certificate in hair transplantation, aesthetic and dermatology.',
  'https://vtiaraclinic.com/images/specialist.jpg', 'https://vtiaraclinic.com/our-doctors/', 10, true, true)
on conflict (id) do nothing;

-- ───────────────────────── enquiries ─────────────────────────
create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  phone text not null check (char_length(phone) between 7 and 20),
  email text check (email is null or (char_length(email) <= 200 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  course_id uuid references public.courses(id) on delete set null,
  course_label text check (course_label is null or char_length(course_label) <= 200),
  preferred_contact text not null default 'whatsapp' check (preferred_contact in ('whatsapp','phone','email')),
  enquiry_type text not null default 'general' check (enquiry_type in ('general','counselling_call','course')),
  message text check (message is null or char_length(message) <= 2000),
  consent boolean not null default false,
  status text not null default 'new' check (status in ('new','contacted','counselling_scheduled','enrolled','not_interested','closed')),
  admin_notes text check (admin_notes is null or char_length(admin_notes) <= 4000),
  contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_enquiries_status on public.enquiries (status, created_at desc);
create index if not exists idx_enquiries_phone on public.enquiries (phone, created_at desc);
alter table public.enquiries enable row level security;
drop policy if exists enquiries_admin_read on public.enquiries;
create policy enquiries_admin_read on public.enquiries for select to authenticated using (public.is_admin());
drop policy if exists enquiries_admin_update on public.enquiries;
create policy enquiries_admin_update on public.enquiries for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists enquiries_admin_delete on public.enquiries;
create policy enquiries_admin_delete on public.enquiries for delete to authenticated using (public.is_admin());
revoke insert on public.enquiries from anon, authenticated;   -- public submissions go through submit_enquiry() only

create or replace function public.enquiries_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' and old.status = 'new' and new.status <> 'new' and new.contacted_at is null then new.contacted_at := now(); end if;
  return new;
end $$;
drop trigger if exists trg_enquiries_touch on public.enquiries;
create trigger trg_enquiries_touch before update on public.enquiries for each row execute function public.enquiries_touch();
drop trigger if exists trg_enquiries_audit on public.enquiries;
create trigger trg_enquiries_audit after update or delete on public.enquiries for each row execute function public.audit_row();

create or replace function public.submit_enquiry(
  p_name text, p_phone text, p_email text, p_course uuid, p_contact text, p_type text, p_message text, p_consent boolean
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_phone text := regexp_replace(coalesce(p_phone,''), '[^0-9+]', '', 'g'); v_label text; a record;
begin
  if char_length(trim(coalesce(p_name,''))) < 2 then raise exception 'Please enter your name'; end if;
  if char_length(regexp_replace(v_phone, '\D', '', 'g')) < 10 then raise exception 'Please enter a valid phone number'; end if;
  if coalesce(p_email,'') <> '' and p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Please enter a valid email address'; end if;
  if not coalesce(p_consent, false) then raise exception 'Please agree to be contacted about your enquiry'; end if;
  if coalesce(p_contact,'whatsapp') not in ('whatsapp','phone','email') then raise exception 'Choose how you would like to be contacted'; end if;
  if coalesce(p_contact,'whatsapp') = 'email' and coalesce(p_email,'') = '' then raise exception 'Add your email address so we can reply by email'; end if;
  if (select count(*) from public.enquiries where phone = v_phone and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'We already have your recent enquiries. We will contact you shortly.';
  end if;
  if p_course is not null then select title into v_label from public.courses where id = p_course and status in ('published','coming_soon'); end if;
  insert into public.enquiries (name, phone, email, course_id, course_label, preferred_contact, enquiry_type, message, consent)
  values (trim(p_name), v_phone, nullif(trim(coalesce(p_email,'')),''), case when v_label is null then null else p_course end, v_label,
          coalesce(p_contact,'whatsapp'), case when coalesce(p_type,'general') in ('general','counselling_call','course') then coalesce(p_type,'general') else 'general' end,
          nullif(left(trim(coalesce(p_message,'')), 2000),''), true)
  returning id into v_id;
  for a in select user_id from public.user_roles where role_key in ('academy_admin','super_admin') loop
    perform public.notify(a.user_id, 'New academy enquiry', trim(p_name) || coalesce(' · ' || v_label, ''), '/admin/enquiries');
  end loop;
  return v_id;
end $$;
revoke execute on function public.submit_enquiry(text,text,text,uuid,text,text,text,boolean) from public;
grant execute on function public.submit_enquiry(text,text,text,uuid,text,text,text,boolean) to anon, authenticated;

-- ───────────────────────── testimonials (managed later; nothing is pre-filled) ─────────────────────────
create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  author_name text not null,
  author_role text,
  course_id uuid references public.courses(id) on delete set null,
  quote text not null check (char_length(quote) between 10 and 600),
  photo_path text,
  consent_confirmed boolean not null default false,   -- written permission from the person quoted
  is_published boolean not null default false,
  sort_order int not null default 100,
  created_at timestamptz not null default now(),
  constraint testimonials_publish_needs_consent check (not is_published or consent_confirmed)
);
alter table public.testimonials enable row level security;
drop policy if exists testimonials_public_read on public.testimonials;
create policy testimonials_public_read on public.testimonials for select to anon, authenticated using (is_published or public.is_admin());
drop policy if exists testimonials_admin_write on public.testimonials;
create policy testimonials_admin_write on public.testimonials for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ───────────────────────── courses: fees, validity policy, prerequisite ─────────────────────────
alter table public.courses add column if not exists fee_amount numeric(10,2) check (fee_amount is null or fee_amount >= 0);
alter table public.courses add column if not exists fee_currency text not null default 'INR';
alter table public.courses add column if not exists fee_inclusions text[] not null default '{}';
alter table public.courses add column if not exists fee_note text;
alter table public.courses add column if not exists payment_status text not null default 'contact_us';
alter table public.courses drop constraint if exists courses_payment_status_check;
alter table public.courses add constraint courses_payment_status_check check (payment_status in ('contact_us','coming_soon'));
alter table public.courses add column if not exists validity_policy text;
alter table public.courses add column if not exists expiry_reminder_days int not null default 30;
alter table public.courses drop constraint if exists courses_reminder_days_check;
alter table public.courses add constraint courses_reminder_days_check check (expiry_reminder_days between 1 and 365);
alter table public.courses add column if not exists prerequisite_course_id uuid references public.courses(id) on delete set null;
alter table public.courses drop constraint if exists courses_prereq_not_self;
alter table public.courses add constraint courses_prereq_not_self check (prerequisite_course_id is null or prerequisite_course_id <> id);

-- Role-specific courses require Common Core. (Edit or clear prerequisite_course_id per course to change this.)
update public.courses c set prerequisite_course_id = cc.id
from public.courses cc
where cc.slug = 'common-core' and c.slug <> 'common-core' and c.role_key is not null and c.role_key <> 'all'
  and c.prerequisite_course_id is null;

-- Enrolment now enforces the prerequisite on the server (the UI only explains it).
create or replace function public.enrol_in_course(p_course uuid, p_mode text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare c public.courses%rowtype; pre public.courses%rowtype; v_id uuid; v_old text; v_name text; a record;
begin
  if auth.uid() is null then raise exception 'Please sign in to request enrolment'; end if;
  select * into c from public.courses where id = p_course and status = 'published';
  if not found then raise exception 'This course is not open for enrolment'; end if;
  if not (p_mode = any (c.learning_modes)) then raise exception 'This course is not offered in % mode', p_mode; end if;
  if c.prerequisite_course_id is not null then
    select * into pre from public.courses where id = c.prerequisite_course_id;
    if found and not exists (
         select 1 from public.course_enrolments e where e.user_id = auth.uid() and e.course_id = pre.id and e.status = 'certified')
       and not exists (
         select 1 from public.certificates ce where ce.learner_id = auth.uid() and ce.course_id = pre.id and ce.status = 'valid') then
      raise exception 'Complete % and earn its certificate before enrolling in %.', pre.title, c.title;
    end if;
  end if;
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
revoke execute on function public.enrol_in_course(uuid,text) from public, anon;
grant execute on function public.enrol_in_course(uuid,text) to authenticated;

-- ───────────────────────── certificate expiry reminders ─────────────────────────
alter table public.certificates add column if not exists expiry_reminded_at timestamptz;
-- Notifies each learner once, expiry_reminder_days (per course) before the certificate expires.
-- Admins can run it from the dashboard; schedule it with pg_cron for hands-off reminders (see README).
create or replace function public.send_certificate_expiry_reminders() returns int
language plpgsql security definer set search_path = '' as $$
declare r record; n int := 0;
begin
  if auth.uid() is not null and not public.is_admin() then raise exception 'Admins only'; end if;
  perform public.sync_certificate_statuses();
  for r in
    select ce.id, ce.learner_id, ce.valid_until, ce.course_title
    from public.certificates ce join public.courses co on co.id = ce.course_id
    where ce.status = 'valid' and ce.valid_until is not null and ce.expiry_reminded_at is null
      and ce.valid_until between current_date and current_date + co.expiry_reminder_days
  loop
    perform public.notify(r.learner_id, 'Your certificate is expiring soon',
      r.course_title || ' expires on ' || to_char(r.valid_until, 'DD Mon YYYY') || '. Contact the academy to renew.', '/app/certificates');
    update public.certificates set expiry_reminded_at = now() where id = r.id;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function public.send_certificate_expiry_reminders() from public, anon;
grant execute on function public.send_certificate_expiry_reminders() to authenticated;

-- ───────────────────────── lesson review metadata + draft / published / review-required ─────────────────────────
-- draft            hidden from learners
-- published        visible
-- review_required  still visible to enrolled learners but flagged to admins for re-review
alter table public.lessons add column if not exists content_status text not null default 'draft';
alter table public.lessons add column if not exists content_version int not null default 1;
alter table public.lessons add column if not exists reviewed_by text;
alter table public.lessons add column if not exists reviewed_on date;
alter table public.lessons add column if not exists next_review_on date;
alter table public.lessons drop constraint if exists lessons_content_status_check;
alter table public.lessons add constraint lessons_content_status_check check (content_status in ('draft','published','review_required'));
alter table public.lessons drop constraint if exists lessons_version_check;
alter table public.lessons add constraint lessons_version_check check (content_version >= 1);
update public.lessons set content_status = case when is_published then 'published' else 'draft' end
where content_status = 'draft' and is_published;

create or replace function public.lessons_sync_status() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.content_status = 'draft' and new.is_published then new.content_status := 'published'; end if;
    new.is_published := new.content_status in ('published','review_required');
  elsif new.content_status is distinct from old.content_status then
    new.is_published := new.content_status in ('published','review_required');
  elsif new.is_published is distinct from old.is_published then
    new.content_status := case when new.is_published then 'published' else 'draft' end;
  end if;
  return new;
end $$;
drop trigger if exists trg_lessons_sync_status on public.lessons;
create trigger trg_lessons_sync_status before insert or update on public.lessons for each row execute function public.lessons_sync_status();

-- ───────────────────────── assessment medical-approval metadata ─────────────────────────
alter table public.assessments add column if not exists approved_by text;
alter table public.assessments add column if not exists approved_on date;
alter table public.assessments add column if not exists last_reviewed_on date;

-- ───────────────────────── storage: trainer photos (public read, admin write) ─────────────────────────
insert into storage.buckets (id, name, public) values ('trainer-photos', 'trainer-photos', true)
on conflict (id) do update set public = excluded.public;
drop policy if exists trainer_photos_admin_write on storage.objects;
create policy trainer_photos_admin_write on storage.objects for all to authenticated
  using (bucket_id = 'trainer-photos' and public.is_admin()) with check (bucket_id = 'trainer-photos' and public.is_admin());

-- trigger functions are never called directly
revoke execute on function public.lessons_sync_status(), public.enquiries_touch() from public, anon, authenticated;
