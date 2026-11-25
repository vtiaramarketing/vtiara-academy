// Runs the demo backend (browser-local mode) through the whole learner journey in Node.
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const out = path.join(root, 'node_modules/.cache/demo-test.mjs');
await build({ entryPoints: [path.join(root, 'src/lib/demoBackend.ts')], bundle: true, format: 'esm', platform: 'node', outfile: out, alias: { '@': path.join(root, 'src') }, loader: { '.json': 'json' }, logLevel: 'error' });
const store = new Map();
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
globalThis.window = globalThis; globalThis.location = { origin: 'http://localhost' };
const m = await import(out);
const b = m.createDemoBackend();
let n = 0; const ok = (c, msg) => { if (!c) { console.error('✗', msg); process.exit(1); } console.log('✓', msg); n++; };
const fails = async (fn) => { try { await fn(); return false; } catch { return true; } };

await b.auth.signIn('learner@vtiara.demo', m.DEMO_PASSWORD);
const me = (await b.auth.getUser()).id;
const [course] = await b.select('courses', { eq: { slug: 'common-core' } });
await b.rpc('enrol_in_course', { p_course: course.id, p_mode: 'blended' });
let [en] = await b.select('course_enrolments', { eq: { user_id: me, course_id: course.id } });
ok(en && en.access_status === 'pending', 'enrolment request is pending');
ok((await b.select('lessons', { eq: { course_id: course.id } })).length === 0, 'no lesson access while pending');
await b.auth.signOut(); await b.auth.signIn('admin@vtiara.demo', m.DEMO_PASSWORD);
await b.rpc('set_enrolment_access', { p_enrolment: en.id, p_status: 'active', p_note: null });
await b.auth.signOut(); await b.auth.signIn('learner@vtiara.demo', m.DEMO_PASSWORD);
const lessons = await b.select('lessons', { eq: { course_id: course.id } });
ok(lessons.length === 8, 'admin activation unlocks 8 lessons');
for (const l of lessons) await b.rpc('complete_lesson', { p_lesson: l.id });
[en] = await b.select('course_enrolments', { eq: { id: en.id } });
ok(en.progress_pct === 100, `all ${lessons.length} lessons complete (${en.status})`);
const [asm] = await b.select('assessments', { eq: { course_id: course.id } });
ok(await fails(() => b.rpc('start_attempt', { p_assessment: asm.id })), 'MCQ locked until the academy session is attended');

const batches = await b.select('v_batch_availability', { eq: { course_id: course.id } });
await b.rpc('book_batch', { p_batch: batches[0].id });
[en] = await b.select('course_enrolments', { eq: { id: en.id } });
ok(en.status === 'session_booked', 'batch booked → ' + en.status);

await b.auth.signOut(); await b.auth.signIn('trainer@vtiara.demo', m.DEMO_PASSWORD);
await b.rpc('mark_attendance', { p_batch: batches[0].id, p_user: me, p_status: 'present' });
await b.auth.signOut(); await b.auth.signIn('learner@vtiara.demo', m.DEMO_PASSWORD);
[en] = await b.select('course_enrolments', { eq: { id: en.id } });
ok(en.status === 'assessment_unlocked', 'attendance unlocks the MCQ');

const qs = await b.select('v_assessment_questions', { eq: { assessment_id: asm.id } });
const opts = await b.select('v_assessment_options', { in: { question_id: qs.map((q) => q.id) } });
ok(!('is_correct' in opts[0]), 'answer key hidden from learner');
const attempt = await b.rpc('start_attempt', { p_assessment: asm.id });
const attId = typeof attempt === 'string' ? attempt : attempt.id;
const wrong = Object.fromEntries(qs.map((q) => [q.id, opts.find((o) => o.question_id === q.id).id]));
let res = await b.rpc('submit_attempt', { p_attempt: attId, p_answers: {} });
ok(!res.passed && res.score_pct === 0, 'blank submit fails');
[en] = await b.select('course_enrolments', { eq: { id: en.id } });
ok(en.status === 'needs_retake', 'needs_retake after fail');
ok(await fails(() => b.rpc('start_attempt', { p_assessment: asm.id })), '3-day retake wait enforced');
m.demoFastForward(4);
const a2 = await b.rpc('start_attempt', { p_assessment: asm.id });
const a2id = typeof a2 === 'string' ? a2 : a2.id;

// staff-side key lookup to answer correctly
await b.auth.signOut(); await b.auth.signIn('trainer@vtiara.demo', m.DEMO_PASSWORD);
const allOpts = await b.select('assessment_options', { in: { question_id: qs.map((q) => q.id) } });
const key = Object.fromEntries(qs.map((q) => [q.id, allOpts.find((o) => o.question_id === q.id && o.is_correct).id]));
await b.auth.signOut(); await b.auth.signIn('learner@vtiara.demo', m.DEMO_PASSWORD);
res = await b.rpc('submit_attempt', { p_attempt: a2id, p_answers: key });
ok(res.passed && res.score_pct === 100, 'perfect score passes');
[en] = await b.select('course_enrolments', { eq: { id: en.id } });
let certs = await b.select('certificates', { eq: { learner_id: me } });
ok(en.status === 'awaiting_approval' && certs.filter((c) => c.status === 'valid').length === 0, 'awaiting approval; NO certificate yet');

await b.auth.signOut(); await b.auth.signIn('trainer@vtiara.demo', m.DEMO_PASSWORD);
const cls = await b.select('practical_checklists', { eq: { course_id: course.id } });
if (cls.length) {
  const items = await b.select('practical_checklist_items', { in: { checklist_id: cls.map((c) => c.id) } });
  for (const cl of cls) {
    const its = items.filter((i) => i.checklist_id === cl.id);
    const id = await b.rpc('save_practical', { p_enrolment: en.id, p_checklist: cl.id, p_item_results: its.map((i) => ({ item_id: i.id, pass: true, note: '' })), p_score: 100, p_trainer_notes: 'ok', p_learner_feedback: 'Well done', p_evidence: ['x'], p_retake_reason: '' });
    await b.rpc('approve_practical', { p_practical: id, p_approve: true });
  }
}
await b.auth.signOut(); await b.auth.signIn('learner@vtiara.demo', m.DEMO_PASSWORD);
[en] = await b.select('course_enrolments', { eq: { id: en.id } });
certs = await b.select('certificates', { eq: { learner_id: me } });
const cert = certs.find((c) => c.status === 'valid');
ok(en.status === 'certified' && cert, 'trainer approval issues certificate ' + cert?.cert_no);
await b.auth.signOut();
const v = await b.rpc('verify_certificate', { p_cert_no: cert.cert_no });
const row = Array.isArray(v) ? v[0] : v;
ok(row?.status === 'valid' && !('email' in row), 'public verification works, exposes no contact details');

// ── production-content rules ──
const roleCourse = (await b.select('courses', {})).find((c) => c.prerequisite_course_id && c.status === 'published');
ok(roleCourse, 'a published role course requires Common Core');
await b.auth.signUp({ email: 'newbie@example.com', password: 'Passw0rd!x', meta: { full_name: 'New Learner', consent_privacy: true } });
ok(await fails(() => b.rpc('enrol_in_course', { p_course: roleCourse.id, p_mode: roleCourse.learning_modes[0] })), 'role course enrolment blocked until Common Core is certified');
await b.auth.signOut();
await b.auth.signIn('learner@vtiara.demo', m.DEMO_PASSWORD);
await b.rpc('enrol_in_course', { p_course: roleCourse.id, p_mode: roleCourse.learning_modes[0] });
ok(true, 'certified learner can enrol in the role course');
await b.auth.signOut();
ok(await fails(() => b.rpc('submit_enquiry', { p_name: 'A', p_phone: '12', p_consent: true })), 'enquiry validates name and phone');
ok(await fails(() => b.rpc('submit_enquiry', { p_name: 'Asha Rao', p_phone: '9845012345', p_consent: false })), 'enquiry needs consent');
await b.rpc('submit_enquiry', { p_name: 'Asha Rao', p_phone: '9845012345', p_email: null, p_course: roleCourse.id, p_contact: 'whatsapp', p_type: 'course', p_message: 'Fees?', p_consent: true });
ok((await b.select('enquiries', {})).length === 0, 'anonymous visitors cannot read enquiries');
ok((await b.select('academy_settings', {})).length === 1, 'academy settings are publicly readable');
ok((await b.select('testimonials', {})).length === 0, 'no testimonials shown until published with consent');
await b.auth.signIn('admin@vtiara.demo', m.DEMO_PASSWORD);
const enq = await b.select('enquiries', {});
ok(enq.length === 1 && enq[0].status === 'new', 'admin sees the new enquiry');
await b.update('enquiries', { id: enq[0].id }, { status: 'contacted' });
ok((await b.select('enquiries', { eq: { id: enq[0].id } }))[0].contacted_at, 'contacted_at is set when status changes');
await b.auth.signOut();
console.log(`\nDEMO JOURNEY PASSED (${n} checks)`);
