// Runs the migrations + seed in an in-memory Postgres (PGlite) with a stubbed Supabase auth/storage layer,
// then exercises the full learner journey and the security rules. Usage: node scripts/test-sql.mjs
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(resolve(root, f), 'utf8');
const db = new PGlite({ extensions: { pgcrypto } });

await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth; create schema storage;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, phone text, raw_user_meta_data jsonb);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create table storage.buckets (id text primary key, name text, public boolean);
  create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name, '/') $$;
  grant usage on schema public, auth, storage to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
`);
for (const f of ['0001_schema', '0002_functions', '0003_rls', '0004_storage', '0005_enrolment_access_and_lessons', '0007_production_content']) {
  await db.exec(read(`supabase/migrations/${f}.sql`));
  console.log('✓ migration', f);
}
await db.exec(read('supabase/seed.sql'));
console.log('✓ seed');

const mk = async (email, name, role) => {
  const r = await db.query(`insert into auth.users (email, raw_user_meta_data) values ($1, $2::jsonb) returning id`, [email, JSON.stringify({ full_name: name })]);
  const id = r.rows[0].id;
  if (role !== 'learner') await db.query(`insert into public.user_roles (user_id, role_key) values ($1, $2)`, [id, role]);
  return id;
};
const admin = await mk('admin@t', 'Admin', 'academy_admin');
const trainer = await mk('trainer@t', 'Trainer T', 'trainer');
const learner = await mk('l1@t', 'Divya P', 'learner');
const other = await mk('l2@t', 'Other L', 'learner');
await db.query(`update public.batches set trainer_id = $1`, [trainer]);

const as = async (uid, fn) => {
  await db.exec(`set role ${uid ? 'authenticated' : 'anon'}; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false);`);
  try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); }
};
const q = (sql, p) => db.query(sql, p).then((r) => r.rows);
const fails = async (fn, msg) => { try { await fn(); } catch (e) { return e.message; } assert.fail('expected failure: ' + msg); };

const cc = (await q(`select id from public.courses where slug='common-core'`))[0].id;
const asmt = (await q(`select id from public.assessments where course_id=$1`, [cc]))[0].id;
const batch = (await q(`select id from public.batches where course_id=$1 order by starts_on limit 1`, [cc]))[0].id;

// 1 enrol + lessons
const enrol = await as(learner, async () => (await q(`select public.enrol_in_course($1,'blended') id`, [cc]))[0].id);
const lessons = await q(`select id from public.lessons where course_id=$1`, [cc]);
assert.equal(lessons.length, 8);

// 1a enrolment is a REQUEST: no lesson access until an admin activates it
assert.equal((await q(`select access_status from public.course_enrolments where id=$1`, [enrol]))[0].access_status, 'pending');
await as(learner, async () => {
  assert.equal((await q(`select id from public.lessons`)).length, 0);
  assert.match(await fails(() => q(`select public.complete_lesson($1)`, [lessons[0].id]), 'pending cannot learn'), /not active/);
  assert.match(await fails(() => q(`select public.book_batch($1)`, [batch]), 'pending cannot book'), /active/);
  assert.match(await fails(() => q(`select public.set_enrolment_access($1,'active',null)`, [enrol]), 'self-approve'), /Only admins/);
  assert.match(await fails(() => q(`update public.course_enrolments set access_status='active'`), 'direct update'), /permission denied/);
  assert.match(await fails(() => q(`select public.enrol_in_course($1,'blended')`, [cc]), 'duplicate request'), /already have/);
});
await as(other, async () => assert.match(await fails(() => q(`select public.set_enrolment_access($1,'active',null)`, [enrol]), 'other learner'), /Only admins/));
await as(admin, async () => {
  assert.match(await fails(() => q(`select public.set_enrolment_access($1,'completed',null)`, [enrol]), 'bad transition'), /Cannot change/);
  await q(`select public.set_enrolment_access($1,'approved','ok')`, [enrol]);
  await q(`select public.set_enrolment_access($1,'active',null)`, [enrol]);
  await q(`select public.set_enrolment_access($1,'approved','paused')`, [enrol]);   // deactivate
  assert.equal((await q(`select id from public.lessons where course_id=$1`, [cc])).length, 8);  // admins always see content
  await q(`select public.set_enrolment_access($1,'active',null)`, [enrol]);
});
const hist = await q(`select from_status, to_status, changed_by_name from public.enrolment_status_history where enrolment_id=$1 order by created_at, id`, [enrol]);
assert.equal(hist.length, 5);
assert.deepEqual(hist.map((h) => h.to_status), ['pending','approved','active','approved','active']);
assert.ok(hist.every((h) => h.changed_by_name));
await as(learner, async () => assert.equal((await q(`select id from public.enrolment_status_history`)).length, 5));
await as(other, async () => assert.equal((await q(`select id from public.enrolment_status_history`)).length, 0));
await as(learner, () => assert.rejects(() => q(`insert into public.enrolment_status_history (enrolment_id,to_status) values ($1,'active')`, [enrol])));
// unpublished lessons are hidden from learners but visible to admins
const hidden = lessons[7].id;
await as(admin, () => q(`update public.lessons set is_published=false where id=$1`, [hidden]));
await as(learner, async () => {
  assert.equal((await q(`select id from public.lessons`)).length, 7);
  assert.match(await fails(() => q(`select public.complete_lesson($1)`, [hidden]), 'unpublished'), /not available/);
});
assert.equal((await as(null, () => q(`select id from public.v_lesson_outline where course_id=$1`, [cc]))).length, 7);
await as(admin, () => q(`update public.lessons set is_published=true where id=$1`, [hidden]));
await as(learner, async () => assert.equal((await q(`select id from public.lessons`)).length, 8));
await as(admin, async () => assert.match(await fails(() => q(`update public.lessons set external_url='http://x.com' where id=$1`, [hidden]), 'http url'), /check/));
console.log('✓ enrolment request → admin approve/activate/deactivate, history recorded, lesson access gated, unpublished hidden');
for (const l of lessons) await as(learner, () => q(`select public.complete_lesson($1)`, [l.id]));
let st = (await q(`select status, progress_pct from public.course_enrolments where id=$1`, [enrol]))[0];
assert.deepEqual([st.status, st.progress_pct], ['in_progress', 100]);
console.log('✓ lessons complete → 100%, still in_progress (attendance outstanding)');

// assessment locked before attendance
assert.match(await as(learner, () => fails(() => q(`select public.start_attempt($1)`, [asmt]), 'locked')), /not unlocked/);
console.log('✓ MCQ is locked until attendance');

// 2 book + attendance
assert.equal(await as(learner, async () => (await q(`select public.book_batch($1) s`, [batch]))[0].s), 'booked');
st = (await q(`select status from public.course_enrolments where id=$1`, [enrol]))[0];
assert.equal(st.status, 'session_booked');
assert.match(await as(learner, () => fails(() => q(`select public.mark_attendance($1,$2,'present')`, [batch, learner]), 'learner marking own attendance')), /assigned trainer/);
await as(trainer, () => q(`select public.mark_attendance($1,$2,'present')`, [batch, learner]));
st = (await q(`select status from public.course_enrolments where id=$1`, [enrol]))[0];
assert.equal(st.status, 'assessment_unlocked');
console.log('✓ book batch → session_booked → trainer marks present → assessment_unlocked');

// 3 learner cannot read the answer key
const leaked = await as(learner, async () => [await q(`select * from public.assessment_options`), await q(`select explanation from public.assessment_questions`)]);
assert.equal(leaked[0].length + leaked[1].length, 0);
const pub = await as(learner, () => q(`select * from public.v_assessment_options`));
assert.ok(pub.length >= 80 && !('is_correct' in pub[0]));
console.log('✓ answer key hidden from learners; public views expose no is_correct/explanation');

// 4 take test (all correct)
const attempt = await as(learner, async () => (await q(`select public.start_attempt($1) id`, [asmt]))[0].id);
const key = await q(`select q.id qid, o.id oid from public.assessment_questions q join public.assessment_options o on o.question_id=q.id and o.is_correct where q.assessment_id=$1`, [asmt]);
const answers = Object.fromEntries(key.map((k) => [k.qid, k.oid]));
// first attempt: deliberately fail by answering only 10
const part = Object.fromEntries(Object.entries(answers).slice(0, 10));
const res1 = await as(learner, async () => (await q(`select public.submit_attempt($1,$2::jsonb) r`, [attempt, JSON.stringify(part)]))[0].r);
assert.equal(res1.passed, false); assert.equal(Number(res1.score_pct), 50);
assert.equal((await q(`select status from public.course_enrolments where id=$1`, [enrol]))[0].status, 'needs_retake');
assert.match(await as(learner, () => fails(() => q(`select public.start_attempt($1)`, [asmt]), 'retake wait')), /retake this assessment on/);
console.log('✓ 50% → failed, needs_retake, 3-day retake rule enforced');
// simulate 3 days passing, then pass
await db.query(`update public.assessment_attempts set submitted_at = now() - interval '4 days'`);
const attempt2 = await as(learner, async () => (await q(`select public.start_attempt($1) id`, [asmt]))[0].id);
const res2 = await as(learner, async () => (await q(`select public.submit_attempt($1,$2::jsonb) r`, [attempt2, JSON.stringify(answers)]))[0].r);
assert.equal(res2.passed, true); assert.equal(Number(res2.score_pct), 100);
assert.equal((await q(`select status from public.course_enrolments where id=$1`, [enrol]))[0].status, 'awaiting_approval');
assert.equal((await q(`select count(*)::int c from public.certificates`))[0].c, 0);
console.log('✓ pass MCQ → "Passed — awaiting trainer approval", NO certificate yet');

// 5 practical + approval
const cl = (await q(`select id from public.practical_checklists where course_id=$1`, [cc]))[0].id;
const items = await q(`select id from public.practical_checklist_items where checklist_id=$1`, [cl]);
const failing = items.map((i, n) => ({ item_id: i.id, pass: n !== 2, note: '' }));
assert.match(await as(trainer, () => fails(() => q(`select public.save_practical($1,$2,$3::jsonb,null,'n','f',null,'')`, [enrol, cl, JSON.stringify(failing)]), 'fail w/o reason')), /retake reason/);
const passing = items.map((i) => ({ item_id: i.id, pass: true, note: '' }));
const pid = await as(trainer, async () => (await q(`select public.save_practical($1,$2,$3::jsonb,null,'Good technique','Well done',null,null) id`, [enrol, cl, JSON.stringify(passing)]))[0].id);
assert.equal((await q(`select count(*)::int c from public.certificates`))[0].c, 0);
assert.match(await as(learner, () => fails(() => q(`select public.approve_practical($1,true,'')`, [pid]), 'learner approving')), /Only trainers/);
await as(trainer, () => q(`select public.approve_practical($1,true,'')`, [pid]));
const cert = (await q(`select * from public.certificates`))[0];
assert.ok(cert && cert.status === 'valid' && /^VTA-CC-\d{4}-\d{4}-[0-9A-F]{4}$/.test(cert.cert_no), JSON.stringify(cert));
assert.equal((await q(`select status from public.course_enrolments where id=$1`, [enrol]))[0].status, 'certified');
console.log('✓ trainer approval → certificate', cert.cert_no, 'valid until', cert.valid_until?.toISOString?.().slice(0, 10) ?? 'not set');

// 6 public verification exposes only safe fields
const ver = await as(null, () => q(`select * from public.verify_certificate($1)`, [cert.cert_no.toLowerCase()]));
assert.deepEqual(Object.keys(ver[0]).sort(), ['cert_no','certificate_title','issued_on','learner_name','status','course_title','valid_until'].sort());
assert.equal(ver[0].status, 'valid');
assert.equal((await as(null, () => q(`select * from public.verify_certificate('NOPE')`))).length, 0);
assert.equal((await as(null, () => q(`select * from public.certificates`))).length, 0); // RLS: anon sees nothing
console.log('✓ anon can verify by ID only; direct table read denied');

// 7 isolation between learners
await as(other, async () => {
  assert.equal((await q(`select * from public.course_enrolments`)).length, 0);
  assert.equal((await q(`select * from public.certificates`)).length, 0);
  assert.equal((await q(`select * from public.assessment_attempts`)).length, 0);
  assert.equal((await q(`select id from public.profiles where id <> '${other}'`)).length, 0);
  assert.equal((await q(`select * from public.v_my_practicals`)).length, 0);
});
await as(learner, async () => {
  assert.equal((await q(`select * from public.v_my_practicals`)).length, 1);
  assert.equal((await q(`select trainer_notes from public.practical_assessments`)).length, 0); // trainer notes are staff-only
  assert.match(await fails(() => q(`select nursing_reg_no from public.profiles`), 'nursing col'), /permission denied/);
  assert.match(await fails(() => q(`insert into public.certificates (cert_no, learner_id, course_id, learner_name, course_title) values ('X', $1, $2, 'a','b')`, [learner, cc]), 'forging'), /permission denied/);
  assert.match(await fails(() => q(`update public.profiles set is_active = true`), 'is_active'), /permission denied/);
  assert.match(await fails(() => q(`insert into public.user_roles (user_id, role_key) values ($1,'super_admin')`, [learner]), 'self escalate'), /row-level security|permission denied/);
});
console.log('✓ learner isolation, no forging certificates, no role escalation, nursing columns protected');

// 7b production content, enquiries, governance (0007)
{
  // settings: public read, admin-only write
  assert.equal((await as(null, () => q(`select clinic_phone from public.academy_settings`)))[0].clinic_phone, '+91 63613 47722');
  assert.equal((await as(learner, () => q(`update public.academy_settings set academy_phone='1' returning id`))).length, 0);
  await as(admin, () => q(`update public.academy_settings set academy_phone='+91 90000 00000' where id=1`));
  assert.equal((await q(`select academy_phone from public.academy_settings`))[0].academy_phone, '+91 90000 00000');
  await assert.rejects(() => as(admin, () => q(`update public.academy_settings set clinic_website='http://x.com' where id=1`)), /check/);

  // enquiries: anyone can submit through the RPC only; only admins can read/manage
  const enq = await as(null, async () => (await q(`select public.submit_enquiry('Asha K','98450 12345','asha@example.com',$1,'whatsapp','course','Interested in the weekend batch',true) id`, [cc]))[0].id);
  assert.match(await as(null, () => fails(() => q(`select public.submit_enquiry('A','98450 12345',null,null,'phone','general','x',true)`), 'short name')), /name/);
  assert.match(await as(null, () => fails(() => q(`select public.submit_enquiry('Asha K','123',null,null,'phone','general','x',true)`), 'bad phone')), /phone/);
  assert.match(await as(null, () => fails(() => q(`select public.submit_enquiry('Asha K','9845012345',null,null,'phone','general','x',false)`), 'no consent')), /agree/);
  assert.match(await as(null, () => fails(() => q(`select public.submit_enquiry('Asha K','9845012345',null,null,'email','general','x',true)`), 'email contact without email')), /email/);
  await as(null, () => assert.rejects(() => q(`insert into public.enquiries (name, phone) values ('Direct','9999999999')`), /permission denied/));
  await as(null, async () => assert.equal((await q(`select * from public.enquiries`)).length, 0));  // RLS: anon sees nothing
  await as(learner, async () => assert.equal((await q(`select * from public.enquiries`)).length, 0));
  await as(null, () => q(`select public.submit_enquiry('Asha K','98450 12345',null,null,'phone','general','2',true)`));
  await as(null, () => q(`select public.submit_enquiry('Asha K','98450 12345',null,null,'phone','general','3',true)`));
  assert.match(await as(null, () => fails(() => q(`select public.submit_enquiry('Asha K','98450 12345',null,null,'phone','general','4',true)`), 'rate limit')), /recent/);
  await as(admin, async () => {
    assert.equal((await q(`select id from public.enquiries`)).length, 3);
    await q(`update public.enquiries set status='contacted', admin_notes='Called' where id=$1`, [enq]);
  });
  const er = (await q(`select status, contacted_at from public.enquiries where id=$1`, [enq]))[0];
  assert.equal(er.status, 'contacted'); assert.ok(er.contacted_at);
  assert.ok((await q(`select 1 from public.notifications where title='New academy enquiry'`)).length >= 1);

  // trainer profiles + testimonials visibility
  assert.equal((await as(null, () => q(`select full_name from public.trainer_profiles`))).length, 1);
  await q(`insert into public.trainer_profiles (full_name) values ('Hidden draft')`);
  assert.equal((await as(null, () => q(`select id from public.trainer_profiles`))).length, 1);
  assert.equal((await as(admin, () => q(`select id from public.trainer_profiles`))).length, 2);
  await as(learner, () => assert.rejects(() => q(`insert into public.trainer_profiles (full_name) values ('x')`), /row-level security/));
  await assert.rejects(() => q(`insert into public.testimonials (author_name, quote, is_published) values ('A','A long enough quote here',true)`), /check/);
  await q(`insert into public.testimonials (author_name, quote, is_published, consent_confirmed) values ('A','A long enough quote here',true,true), ('B','Another unpublished quote',false,false)`);
  assert.equal((await as(null, () => q(`select id from public.testimonials`))).length, 1);

  // Common Core prerequisite is enforced on the server
  const st2 = (await q(`select id from public.courses where slug='skin-therapist'`))[0].id;
  const pre = (await q(`select prerequisite_course_id p from public.courses where id=$1`, [st2]))[0].p;
  assert.equal(pre, cc);
  assert.match(await as(other, () => fails(() => q(`select public.enrol_in_course($1,'blended')`, [st2]), 'no common core')), /Complete .*Common Core/);
  await as(learner, () => q(`select public.enrol_in_course($1,'blended')`, [st2]));
  await as(admin, () => q(`update public.courses set prerequisite_course_id = null where id=$1`, [st2]));
  await as(other, () => q(`select public.enrol_in_course($1,'blended')`, [st2]));
  await as(admin, () => q(`update public.courses set prerequisite_course_id = $1 where id=$2`, [cc, st2]));

  // lesson draft / published / review_required stays in step with is_published
  const L = lessons[0].id;
  await as(admin, () => q(`update public.lessons set content_status='draft' where id=$1`, [L]));
  assert.deepEqual((await q(`select is_published, content_status from public.lessons where id=$1`, [L]))[0], { is_published: false, content_status: 'draft' });
  await as(learner, async () => assert.equal((await q(`select id from public.lessons where id=$1`, [L])).length, 0));
  await as(admin, () => q(`update public.lessons set content_status='review_required', content_version=2, reviewed_by='Dr. X', reviewed_on=current_date, next_review_on=current_date+180 where id=$1`, [L]));
  assert.deepEqual((await q(`select is_published, content_status from public.lessons where id=$1`, [L]))[0], { is_published: true, content_status: 'review_required' });
  await as(admin, () => q(`update public.lessons set is_published=false where id=$1`, [L]));
  assert.equal((await q(`select content_status from public.lessons where id=$1`, [L]))[0].content_status, 'draft');
  await as(admin, () => q(`update public.lessons set is_published=true where id=$1`, [L]));
  assert.equal((await q(`select content_status from public.lessons where id=$1`, [L]))[0].content_status, 'published');
  const nl = (await q(`insert into public.lessons (module_id, course_id, title, position, is_published) select module_id, course_id, 'New', 99, false from public.lessons where id=$1 returning content_status, is_published`, [L]))[0];
  assert.deepEqual(nl, { content_status: 'draft', is_published: false });

  // certificate expiry reminders go out once, per course reminder window
  await q(`update public.certificates set valid_until = current_date + 10, status='valid' where id=$1`, [cert.id]);
  assert.match(await as(learner, () => fails(() => q(`select public.send_certificate_expiry_reminders()`), 'learner')), /Admins only/);
  assert.equal(await as(admin, async () => (await q(`select public.send_certificate_expiry_reminders() n`))[0].n), 1);
  assert.equal(await as(admin, async () => (await q(`select public.send_certificate_expiry_reminders() n`))[0].n), 0);
  assert.ok((await q(`select 1 from public.notifications where user_id=$1 and title='Your certificate is expiring soon'`, [learner])).length === 1);
  await q(`update public.certificates set valid_until = null where id=$1`, [cert.id]);
  console.log('✓ settings, enquiries (RPC-only, rate-limited, admin-managed), trainers, testimonials, Common Core gate, content status sync, expiry reminders');
}

// 8 admin revoke
await as(admin, () => q(`select public.admin_certificate_action($1,'revoke','Test revoke',null)`, [cert.id]));
const ver2 = await as(null, () => q(`select status from public.verify_certificate($1)`, [cert.cert_no]));
assert.equal(ver2[0].status, 'revoked');
console.log('✓ admin revoke reflected in public verification');
console.log('\nALL SQL CHECKS PASSED');
