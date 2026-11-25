-- VTIARA Training Academy — Storage buckets and policies
-- Path conventions:  course-*/{course_id}/…   learner-documents/{user_id}/…   practical-evidence/{learner_id}/…
--                    certificates/{learner_id}/…   trainer-resources/…

insert into storage.buckets (id, name, public) values
  ('course-thumbnails', 'course-thumbnails', true),     -- marketing images only
  ('course-videos', 'course-videos', false),
  ('course-resources', 'course-resources', false),
  ('learner-documents', 'learner-documents', false),    -- profile photos, nursing registration documents
  ('certificates', 'certificates', false),
  ('practical-evidence', 'practical-evidence', false),
  ('trainer-resources', 'trainer-resources', false)
on conflict (id) do update set public = excluded.public;

create or replace function public.path_uuid(p_name text, p_index int default 1) returns uuid
language plpgsql immutable set search_path = '' as $$
begin
  return ((storage.foldername(p_name))[p_index])::uuid;
exception when others then return null;
end $$;

-- course thumbnails: public read, admin write
create policy thumbs_admin_write on storage.objects for all to authenticated
  using (bucket_id = 'course-thumbnails' and public.is_admin()) with check (bucket_id = 'course-thumbnails' and public.is_admin());

-- videos & handouts: enrolled learners (folder = course id) and staff read; admin write
create policy course_media_read on storage.objects for select to authenticated
  using (bucket_id in ('course-videos','course-resources') and public.is_enrolled_in(public.path_uuid(name)));
create policy course_media_admin_write on storage.objects for all to authenticated
  using (bucket_id in ('course-videos','course-resources') and public.is_admin())
  with check (bucket_id in ('course-videos','course-resources') and public.is_admin());

-- learner documents: owner read/write own folder; admins and trainers read (nursing registration verification)
create policy learner_docs_owner on storage.objects for all to authenticated
  using (bucket_id = 'learner-documents' and public.path_uuid(name) = auth.uid())
  with check (bucket_id = 'learner-documents' and public.path_uuid(name) = auth.uid());
create policy learner_docs_staff_read on storage.objects for select to authenticated
  using (bucket_id = 'learner-documents' and (public.is_admin() or public.has_role('trainer')));

-- practical evidence: staff upload & read; the learner can read their own
create policy evidence_staff on storage.objects for all to authenticated
  using (bucket_id = 'practical-evidence' and public.is_staff())
  with check (bucket_id = 'practical-evidence' and public.is_staff());
create policy evidence_owner_read on storage.objects for select to authenticated
  using (bucket_id = 'practical-evidence' and public.path_uuid(name) = auth.uid());

-- certificates (generated PDFs): owner read; admin all
create policy certs_owner_read on storage.objects for select to authenticated
  using (bucket_id = 'certificates' and public.path_uuid(name) = auth.uid());
create policy certs_admin on storage.objects for all to authenticated
  using (bucket_id = 'certificates' and public.is_admin()) with check (bucket_id = 'certificates' and public.is_admin());

-- trainer resources: staff read, admin write
create policy trainer_res_read on storage.objects for select to authenticated
  using (bucket_id = 'trainer-resources' and public.is_staff());
create policy trainer_res_admin on storage.objects for all to authenticated
  using (bucket_id = 'trainer-resources' and public.is_admin()) with check (bucket_id = 'trainer-resources' and public.is_admin());
