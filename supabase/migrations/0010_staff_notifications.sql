-- Trainers get notified about activity in their own batches, so the bell is useful in the tutor view too.
create or replace function public.trg_notify_trainer_booking() returns trigger
language plpgsql security definer set search_path = '' as $$
declare b public.batches%rowtype; v_name text;
begin
  if new.status not in ('booked','waitlist') then return new; end if;
  if tg_op = 'UPDATE' and old.status = new.status then return new; end if;
  select * into b from public.batches where id = new.batch_id;
  if b.trainer_id is null then return new; end if;
  select full_name into v_name from public.profiles where id = new.user_id;
  perform public.notify(b.trainer_id,
    case when new.status = 'booked' then 'New booking in your batch' else 'New waitlist entry in your batch' end,
    coalesce(v_name, 'A learner') || ' · ' || b.title || ' on ' || to_char(b.starts_on, 'DD Mon YYYY'), '/tutor/batches');
  return new;
end $$;
drop trigger if exists notify_trainer_booking on public.batch_bookings;
create trigger notify_trainer_booking after insert or update of status on public.batch_bookings
  for each row execute function public.trg_notify_trainer_booking();

create or replace function public.trg_notify_trainer_ready() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r record; v_name text; v_title text;
begin
  if new.status <> 'awaiting_approval' or old.status = 'awaiting_approval' then return new; end if;
  select full_name into v_name from public.profiles where id = new.user_id;
  select title into v_title from public.courses where id = new.course_id;
  for r in select distinct b.trainer_id from public.batch_bookings bb
             join public.batches b on b.id = bb.batch_id
            where bb.user_id = new.user_id and b.course_id = new.course_id and b.trainer_id is not null loop
    perform public.notify(r.trainer_id, 'Learner ready for practical sign-off',
      coalesce(v_name, 'A learner') || ' passed the knowledge test for ' || v_title || '.', '/tutor/practicals/' || new.id);
  end loop;
  return new;
end $$;
drop trigger if exists notify_trainer_ready on public.course_enrolments;
create trigger notify_trainer_ready after update of status on public.course_enrolments
  for each row execute function public.trg_notify_trainer_ready();
