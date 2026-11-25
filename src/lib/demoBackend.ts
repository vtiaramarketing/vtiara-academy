/**
 * DEMO BACKEND — runs entirely in the browser (localStorage) when Supabase env vars are not set.
 * It mirrors the server-side rules in supabase/migrations/0002_functions.sql (the SQL is the source of truth and is
 * covered by scripts/test-sql.mjs). Demo passwords are stored in plain text: never use this mode for real data.
 */
import content from '../data/content.json';
import type { Backend, Query, SignUpInput } from './backend';
import { DEFAULT_SETTINGS } from './settingsDefaults';

type Row = Record<string, any>;
interface DemoState {
  t: Record<string, Row[]>;
  accounts: { id: string; email: string; mobile: string | null; password: string }[];
  session: string | null;
  files: Record<string, string>;
  certSeq: number;
}

export const DEMO_PASSWORD = 'Demo@1234';
export const DEMO_OTP = '123456';
const KEY = 'vtiara-demo-v4';
const listeners = new Set<() => void>();

// ───────────── helpers ─────────────
const uuid = () => (crypto?.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36));
const nowIso = () => new Date().toISOString();
const todayStr = () => new Date().toISOString().slice(0, 10);
const addDays = (d: number) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
const addMonthsStr = (m: number) => { const d = new Date(); d.setMonth(d.getMonth() + m); return d.toISOString().slice(0, 10); };
const rand4 = () => Math.random().toString(16).slice(2, 6).toUpperCase().padEnd(4, '0');

let S: DemoState;
function persist() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* quota */ } }
const T = (name: string) => (S.t[name] ??= []);
const notify = () => listeners.forEach((l) => l());

function buildSeed(): DemoState {
  const st: DemoState = { t: {}, accounts: [], session: null, files: {}, certSeq: 0 };
  S = st;
  const id = (k: string) => k;
  for (const r of ['super_admin', 'academy_admin', 'trainer', 'assessor', 'learner']) T('roles').push({ key: r, label: r });
  for (const b of content.branches) T('branches').push({ id: id('branch:' + b.key), name: b.name, city: b.city, address: b.address, maps_url: b.maps_url, phone: b.phone, hours: b.hours, is_active: true });

  for (const c of content.courses) {
    const cid = 'course:' + c.slug;
    T('courses').push({
      id: cid, slug: c.slug, title: c.title, code: c.code, category: c.category, role_key: c.role_key, role_label: c.role_label,
      status: c.status, sort_order: c.sort_order, duration_hours: c.duration_hours, duration_label: c.duration_label, level: c.level,
      languages: c.languages, learning_modes: c.learning_modes, certificate_title: c.certificate_title,
      certificate_validity_months: c.validity_months, requires_attendance: c.requires_attendance, requires_practical: c.requires_practical,
      requires_trainer_approval: c.requires_trainer_approval, short_description: c.short_description, overview: c.overview,
      audience: c.audience, eligibility: c.eligibility, learning_outcomes: c.outcomes, requirements_text: c.requirements_text,
      pass_rules: c.pass_rules, faq: [], image_path: null,
      fee_amount: null, fee_currency: 'INR', fee_inclusions: [], fee_note: null, payment_status: 'contact_us',
      validity_policy: null, expiry_reminder_days: 30, prerequisite_course_id: c.slug !== 'common-core' && c.role_key && c.role_key !== 'all' ? 'course:common-core' : null,
    });
    c.modules.forEach((m, mi) => {
      const mid = `module:${c.slug}:${mi}`;
      T('course_modules').push({ id: mid, course_id: cid, title: m.title, description: null, position: mi + 1, is_published: true });
      m.lessons.forEach((l: any, li: number) =>
        T('lessons').push({
          id: `lesson:${c.slug}:${mi}:${li}`, module_id: mid, course_id: cid, title: l.title, description: l.description,
          video_path: null, duration_min: l.minutes,
          transcript: l.transcript || `Transcript for "${l.title}" will appear here once the recorded class is uploaded.`, position: li + 1,
          lesson_type: 'video', body: null, external_url: null, video_url: null, video_provider: null, is_published: true,
          content_status: 'published', content_version: 1, reviewed_by: null, reviewed_on: null, next_review_on: null,
        }));
    });
    const a: any = (c as any).assessment;
    if (a) {
      const aid = 'assessment:' + c.slug;
      T('assessments').push({ id: aid, course_id: cid, title: a.title, time_limit_min: a.time_limit_min, pass_mark: a.pass_mark, num_questions: a.num_questions, retake_after_days: a.retake_after_days, compulsory_category: a.compulsory_category, status: 'published', approved_by: null, approved_on: null, last_reviewed_on: null });
      a.questions.forEach((q: any, qi: number) => {
        const qid = `question:${c.slug}:${qi}`;
        T('assessment_questions').push({ id: qid, assessment_id: aid, category: q.cat, prompt: q.q, explanation: q.e, position: qi + 1 });
        q.o.forEach((label: string, oi: number) => T('assessment_options').push({ id: `option:${c.slug}:${qi}:${oi}`, question_id: qid, label, is_correct: oi === q.c, position: oi + 1 }));
      });
    }
    const k: any = (c as any).checklist;
    if (k) {
      const kid = 'checklist:' + c.slug;
      T('practical_checklists').push({ id: kid, course_id: cid, title: k.title, description: k.description, requires_evidence: k.requires_evidence, min_score_pct: k.min_score ?? null });
      k.items.forEach((it: any, ii: number) => T('practical_checklist_items').push({ id: `item:${c.slug}:${ii}`, checklist_id: kid, label: it.label, is_critical: it.critical, position: ii + 1 }));
    }
  }

  T('academy_settings').push({ ...DEFAULT_SETTINGS });
  T('trainer_profiles').push({ id: 'trainer:madan', full_name: 'Dr. Madan Kumar BJ', title: 'MD & Co-Founder, VTIARA Hair & Skin Clinic', qualification: 'MD', specialisation: 'Aesthetic dermatology, trichology and hair restoration', bio: 'Consultant dermatologist and hair transplant surgeon, and co-founder of VTIARA Hair & Skin Clinic. The clinic website cites over 15 years of experience and a Times Health Excellence 2025 certificate in hair transplantation, aesthetic and dermatology.', photo_url: 'https://vtiaraclinic.com/images/specialist.jpg', photo_path: null, source_url: 'https://vtiaraclinic.com/our-doctors/', is_medical_advisor: false, sort_order: 10, is_published: true, needs_confirmation: true });

  // accounts
  for (const u of content.demoUsers) {
    const uid = 'user:' + u.key;
    st.accounts.push({ id: uid, email: u.email, mobile: u.mobile, password: DEMO_PASSWORD });
    T('profiles').push({ id: uid, full_name: u.name, email: u.email, mobile: u.mobile, city: 'Bangalore', preferred_language: 'English', learner_code: 'VT-' + u.key.toUpperCase().slice(0, 6), job_role: u.role === 'learner' ? 'Skin Therapist' : null, branch_id: 'branch:main', avatar_path: null, consent_privacy: true, consent_comms: true, is_active: true, created_at: nowIso() });
    T('user_roles').push({ user_id: uid, role_key: u.role });
  }
  // synthetic learners so the admin portal looks lived-in
  const extra = ['Sana Khan', 'Ravi Kumar', 'Lakshmi Narayan', 'Imran Pasha', 'Anjali Gowda', 'Mohan Das', 'Pooja Reddy', 'Suresh Babu'];
  extra.forEach((n, i) => {
    const uid = 'user:x' + i;
    T('profiles').push({ id: uid, full_name: n, email: n.toLowerCase().replace(/ /g, '.') + '@example.com', mobile: '98000000' + (10 + i), city: 'Bangalore', preferred_language: 'English', learner_code: 'LRN-' + (100 + i), job_role: ['Skin Therapist', 'Staff Nurse', 'Housekeeping', 'Telecaller'][i % 4], branch_id: i % 3 ? 'branch:main' : 'branch:second', avatar_path: null, consent_privacy: true, consent_comms: true, is_active: true, created_at: new Date(Date.now() - (30 - i * 3) * 864e5).toISOString() });
    T('user_roles').push({ user_id: uid, role_key: 'learner' });
  });

  // batches (trainer assigned)
  content.batches.forEach((b, i) =>
    T('batches').push({ id: 'batch:' + i, course_id: 'course:' + b.course, branch_id: 'branch:' + b.branch, trainer_id: 'user:trainer', title: b.title, starts_on: addDays(b.offset_days), start_time: b.start, end_time: b.end, capacity: b.capacity, mode: b.mode, location: content.branches.find((x) => x.key === b.branch)?.name + ' — ' + content.branches.find((x) => x.key === b.branch)?.address, what_to_bring: 'Government photo ID, notebook and pen, closed-toe shoes, clinic uniform if issued.', practical_requirements: 'Practical stations are assessed in person by the trainer.', status: 'open', created_at: nowIso() }));

  // helper to build a learner's history, then let the rules engine decide the status
  const enrol = (uid: string, slug: string, mode = 'blended') => {
    const e = { id: uuid(), user_id: uid, course_id: 'course:' + slug, mode, status: 'not_started', access_status: 'active', request_note: null, access_changed_by: null, access_changed_at: null, progress_pct: 0, enrolled_at: new Date(Date.now() - 12 * 864e5).toISOString(), completed_at: null };
    T('course_enrolments').push(e); return e;
  };
  const lessonsDone = (uid: string, slug: string, n = 99) =>
    T('lessons').filter((l) => l.course_id === 'course:' + slug).slice(0, n).forEach((l) => T('lesson_progress').push({ user_id: uid, lesson_id: l.id, course_id: l.course_id, completed_at: nowIso() }));
  const attend = (uid: string, e: Row, batchIdx: number, status = 'present') => {
    T('batch_bookings').push({ id: uuid(), batch_id: 'batch:' + batchIdx, user_id: uid, enrolment_id: e.id, status: status === 'present' ? 'attended' : 'booked', created_at: nowIso() });
  };
  const attempt = (uid: string, e: Row, slug: string, pct: number, daysAgo = 5) => {
    const a = T('assessments').find((x) => x.course_id === 'course:' + slug)!;
    T('assessment_attempts').push({ id: uuid(), assessment_id: a.id, user_id: uid, enrolment_id: e.id, status: 'submitted', started_at: new Date(Date.now() - daysAgo * 864e5).toISOString(), submitted_at: new Date(Date.now() - daysAgo * 864e5).toISOString(), score_pct: pct, passed: pct >= a.pass_mark, section_scores: null });
  };
  const practical = (uid: string, e: Row, slug: string, result: 'passed' | 'failed', approved: boolean) => {
    const cl = T('practical_checklists').find((x) => x.course_id === 'course:' + slug)!;
    const items = T('practical_checklist_items').filter((x) => x.checklist_id === cl.id);
    T('practical_assessments').push({ id: uuid(), enrolment_id: e.id, checklist_id: cl.id, learner_id: uid, assessor_id: 'user:trainer', assessor_name: 'Anita Rao (Trainer)', item_results: items.map((i) => ({ item_id: i.id, pass: result === 'passed', note: '' })), score_pct: null, result, trainer_notes: '', learner_feedback: result === 'passed' ? 'Consistent, careful technique.' : 'Review the five moments of hand hygiene.', evidence_paths: [], retake_reason: result === 'failed' ? 'Missed critical steps' : null, completed_on: todayStr(), approval_status: approved ? 'approved' : 'pending', approved_by: approved ? 'user:trainer' : null, approved_at: approved ? nowIso() : null, created_at: nowIso() });
  };

  { // Rohan (learner2): fully certified in Common Core → working verification sample
    const e = enrol('user:learner2', 'common-core'); lessonsDone('user:learner2', 'common-core'); attend('user:learner2', e, 0); attempt('user:learner2', e, 'common-core', 90); practical('user:learner2', e, 'common-core', 'passed', true); recompute(e.id);
  }
  { const e = enrol('user:x0', 'common-core'); lessonsDone('user:x0', 'common-core'); attend('user:x0', e, 0); attempt('user:x0', e, 'common-core', 85); practical('user:x0', e, 'common-core', 'passed', false); recompute(e.id); } // waiting for approval
  { const e = enrol('user:x1', 'common-core'); lessonsDone('user:x1', 'common-core'); attend('user:x1', e, 0); recompute(e.id); }               // assessment unlocked
  { const e = enrol('user:x2', 'common-core'); lessonsDone('user:x2', 'common-core', 5); T('batch_bookings').push({ id: uuid(), batch_id: 'batch:0', user_id: 'user:x2', enrolment_id: e.id, status: 'booked', created_at: nowIso() }); recompute(e.id); }
  { const e = enrol('user:x3', 'common-core'); lessonsDone('user:x3', 'common-core'); attend('user:x3', e, 0); attempt('user:x3', e, 'common-core', 60, 1); recompute(e.id); } // needs retake
  { const e = enrol('user:x4', 'housekeeping'); lessonsDone('user:x4', 'housekeeping'); attend('user:x4', e, 4); attempt('user:x4', e, 'housekeeping', 100); practical('user:x4', e, 'housekeeping', 'passed', true); recompute(e.id); }
  { const e = enrol('user:x5', 'skin-therapist'); lessonsDone('user:x5', 'skin-therapist', 4); recompute(e.id); }
  { const e = enrol('user:x6', 'staff-nurse'); lessonsDone('user:x6', 'staff-nurse', 2); T('batch_bookings').push({ id: uuid(), batch_id: 'batch:3', user_id: 'user:x6', enrolment_id: e.id, status: 'booked', created_at: nowIso() }); recompute(e.id); }
  { const e = enrol('user:x7', 'telecaller', 'online'); lessonsDone('user:x7', 'telecaller', 3); recompute(e.id); }
  { const e = enrol('user:x5', 'housekeeping'); e.access_status = 'pending'; T('enrolment_status_history').push({ id: uuid(), enrolment_id: e.id, from_status: null, to_status: 'pending', changed_by: 'user:x5', changed_by_name: name('user:x5'), note: 'Enrolment requested (demo data)', created_at: nowIso() }); } // pending request

  T('notifications').push({ id: uuid(), user_id: 'user:learner', title: 'Welcome to VTIARA Training Academy', body: 'Start with Common Core Training — the foundation for every role.', link: '/courses/common-core', is_read: false, created_at: nowIso() });
  return st;
}

function load() {
  try { const raw = localStorage.getItem(KEY); if (raw) { S = JSON.parse(raw); return; } } catch { /* ignore */ }
  buildSeed(); persist();
}
export function resetDemo() { localStorage.removeItem(KEY); buildSeed(); persist(); notify(); }
/** Demo-only: pretend 4 days have passed so a failed learner can retake (the real rule is enforced in SQL). */
export function demoFastForward(days = 4) {
  for (const a of T('assessment_attempts')) if (a.submitted_at) a.submitted_at = new Date(new Date(a.submitted_at).getTime() - days * 864e5).toISOString();
  persist(); notify();
}
export function demoLoginAs(key: string) {
  const acc = S.accounts.find((a) => a.id === 'user:' + key); if (!acc) return;
  S.session = acc.id; persist(); notify();
}

// ───────────── auth context in demo ─────────────
const uid = () => S.session;
const rolesOf = (u: string | null): string[] => (u ? T('user_roles').filter((r) => r.user_id === u).map((r) => r.role_key) : []);
const hasRole = (...r: string[]) => rolesOf(uid()).some((x) => r.includes(x));
const isAdmin = () => hasRole('super_admin', 'academy_admin');
const isStaff = () => hasRole('super_admin', 'academy_admin', 'trainer', 'assessor');
const name = (u: string | null) => T('profiles').find((p) => p.id === u)?.full_name ?? '';
const push = (user: string, title: string, body: string, link?: string) =>
  T('notifications').unshift({ id: uuid(), user_id: user, title, body, link: link ?? null, is_read: false, created_at: nowIso() });
const audit = (action: string, entity: string, entity_id: string, details?: unknown) =>
  T('audit_logs').unshift({ id: uuid(), actor_id: uid(), actor_name: name(uid()), action, entity, entity_id, details: details ?? null, created_at: nowIso() });

// ───────────── rules engine (mirror of recompute_enrolment) ─────────────
function issueCertificate(e: Row): Row {
  const c = T('courses').find((x) => x.id === e.course_id)!;
  const p = T('profiles').find((x) => x.id === e.user_id)!;
  const needsAdmin = !!(c.pass_rules as any)?.admin_approval;
  S.certSeq += 1;
  const cert: Row = {
    id: uuid(), cert_no: `VTA-${c.code}-${new Date().getFullYear()}-${String(S.certSeq).padStart(4, '0')}-${rand4()}`,
    enrolment_id: e.id, learner_id: e.user_id, course_id: c.id, learner_name: p.full_name, course_title: c.title, role_label: c.role_label,
    certificate_title: c.certificate_title, status: needsAdmin ? 'awaiting_approval' : 'valid',
    issued_on: needsAdmin ? null : todayStr(),
    valid_until: !needsAdmin && c.certificate_validity_months != null ? addMonthsStr(c.certificate_validity_months) : null,
    revoked_reason: null, created_at: nowIso(),
  };
  T('certificates').push(cert);
  if (!needsAdmin) push(e.user_id, 'Certificate issued', `Your ${c.certificate_title} certificate (${cert.cert_no}) is ready in your wallet.`, '/app/certificates');
  return cert;
}

function recompute(enrolId: string): string | null {
  const e = T('course_enrolments').find((x) => x.id === enrolId); if (!e) return null;
  const c = T('courses').find((x) => x.id === e.course_id)!;
  const lessons = T('lessons').filter((l) => l.course_id === c.id);
  const done = T('lesson_progress').filter((p) => p.user_id === e.user_id && p.course_id === c.id).length;
  const progress = lessons.length ? Math.round((100 * done) / lessons.length) : 0;
  const lessonsOk = e.mode === 'academy' || lessons.length === 0 || done >= lessons.length;
  const courseBatches = T('batches').filter((b) => b.course_id === c.id).map((b) => b.id);
  const myBookings = T('batch_bookings').filter((b) => b.user_id === e.user_id && courseBatches.includes(b.batch_id));
  const attOk = !c.requires_attendance || myBookings.some((b) => b.status === 'attended');
  const asmts = T('assessments').filter((a) => a.course_id === c.id).map((a) => a.id);
  const myAttempts = T('assessment_attempts').filter((a) => a.user_id === e.user_id && asmts.includes(a.assessment_id) && a.status === 'submitted');
  const assessOk = myAttempts.some((a) => a.passed);
  const cls = T('practical_checklists').filter((x) => x.course_id === c.id).map((x) => x.id);
  const pas = T('practical_assessments').filter((p) => p.enrolment_id === e.id && cls.includes(p.checklist_id));
  const pracOk = !c.requires_practical || cls.length === 0 || pas.filter((p) => p.result === 'passed').length >= cls.length;
  const apprOk = !c.requires_trainer_approval || cls.length === 0 || pas.filter((p) => p.approval_status === 'approved').length >= cls.length;
  const cert = T('certificates').filter((x) => x.enrolment_id === e.id && ['valid', 'expired', 'awaiting_approval'].includes(x.status)).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const failed = (!assessOk && myAttempts.some((a) => !a.passed)) || pas.some((p) => p.result === 'failed');
  const booked = myBookings.some((b) => b.status === 'booked');

  let status: string;
  if (cert?.status === 'valid') status = 'certified';
  else if (cert?.status === 'expired') status = 'expired';
  else if (cert) status = 'awaiting_approval';
  else if (lessonsOk && attOk && assessOk && pracOk && apprOk) {
    if (T('certificates').some((x) => x.enrolment_id === e.id && x.status === 'revoked')) status = 'awaiting_approval';
    else { issueCertificate(e); status = 'certified'; }
  } else if (assessOk) status = 'awaiting_approval';
  else if (failed) status = 'needs_retake';
  else if (lessonsOk && attOk && (lessons.length > 0 || c.requires_attendance)) status = 'assessment_unlocked';
  else if (booked) status = 'session_booked';
  else if (progress > 0) status = 'in_progress';
  else status = 'not_started';

  if (status === 'assessment_unlocked' && e.status !== 'assessment_unlocked') push(e.user_id, 'Assessment unlocked', `You can now take the ${c.title} knowledge test.`, '/app/courses/' + c.slug);
  e.status = status; e.progress_pct = progress;
  if (status === 'certified' && !e.completed_at) e.completed_at = nowIso();
  return status;
}

function syncCertStatuses() {
  for (const c of T('certificates')) if (c.status === 'valid' && c.valid_until && c.valid_until < todayStr()) { c.status = 'expired'; if (c.enrolment_id) recompute(c.enrolment_id); }
}

function seatsTaken(batchId: string) { return T('batch_bookings').filter((b) => b.batch_id === batchId && ['booked', 'attended'].includes(b.status)).length; }
const fail = (m: string): never => { throw new Error(m); };

// ───────────── RPCs (mirror of SQL functions) ─────────────
const rpcs: Record<string, (a: Row) => any> = {
  enrol_in_course({ p_course, p_mode }) {
    if (!uid()) fail('Please sign in to request enrolment');
    const c = T('courses').find((x) => x.id === p_course && x.status === 'published') ?? fail('This course is not open for enrolment');
    if (!c.learning_modes.includes(p_mode)) fail(`This course is not offered in ${p_mode} mode`);
    const pre = c.prerequisite_course_id ? T('courses').find((x) => x.id === c.prerequisite_course_id) : null;
    if (pre && !T('course_enrolments').some((x) => x.user_id === uid() && x.course_id === pre.id && x.status === 'certified') && !T('certificates').some((x) => x.learner_id === uid() && x.course_id === pre.id && x.status === 'valid'))
      fail(`Complete ${pre.title} and earn its certificate before enrolling in ${c.title}.`);
    let e = T('course_enrolments').find((x) => x.user_id === uid() && x.course_id === p_course);
    const old = e?.access_status ?? null;
    if (e && e.access_status !== 'cancelled') fail(`You already have an enrolment for this course (${e.access_status}).`);
    if (e) Object.assign(e, { access_status: 'pending', mode: p_mode, access_changed_by: uid(), access_changed_at: nowIso() });
    else { e = { id: uuid(), user_id: uid(), course_id: p_course, mode: p_mode, status: 'not_started', access_status: 'pending', request_note: null, access_changed_by: null, access_changed_at: null, progress_pct: 0, enrolled_at: nowIso(), completed_at: null }; T('course_enrolments').push(e); }
    T('enrolment_status_history').push({ id: uuid(), enrolment_id: e.id, from_status: old, to_status: 'pending', changed_by: uid(), changed_by_name: name(uid()), note: 'Enrolment requested', created_at: nowIso() });
    push(uid()!, 'Enrolment request received', `Your request for ${c.title} is awaiting approval.`, '/app/courses/' + c.slug);
    T('user_roles').filter((r) => ['academy_admin', 'super_admin'].includes(r.role_key)).forEach((r) => push(r.user_id, 'New enrolment request', `${name(uid())} requested ${c.title}`, '/admin/enrolments'));
    return e.id;
  },
  submit_enquiry({ p_name, p_phone, p_email, p_course, p_contact, p_type, p_message, p_consent }) {
    const phone = String(p_phone ?? '').replace(/[^0-9+]/g, '');
    if (String(p_name ?? '').trim().length < 2) fail('Please enter your name');
    if (phone.replace(/\D/g, '').length < 10) fail('Please enter a valid phone number');
    if (p_email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(p_email))) fail('Please enter a valid email address');
    if (!p_consent) fail('Please agree to be contacted about your enquiry');
    const contact = p_contact ?? 'whatsapp';
    if (!['whatsapp', 'phone', 'email'].includes(contact)) fail('Choose how you would like to be contacted');
    if (contact === 'email' && !p_email) fail('Add your email address so we can reply by email');
    if (T('enquiries').filter((x) => x.phone === phone && Date.now() - Date.parse(x.created_at) < 36e5).length >= 3) fail('We already have your recent enquiries. We will contact you shortly.');
    const c = p_course ? T('courses').find((x) => x.id === p_course && ['published', 'coming_soon'].includes(x.status)) : null;
    const row = { id: uuid(), name: String(p_name).trim(), phone, email: p_email ? String(p_email).trim() : null, course_id: c?.id ?? null, course_label: c?.title ?? null, preferred_contact: contact, enquiry_type: ['general', 'counselling_call', 'course'].includes(p_type) ? p_type : 'general', message: p_message ? String(p_message).slice(0, 2000) : null, consent: true, status: 'new', admin_notes: null, contacted_at: null, created_at: nowIso(), updated_at: nowIso() };
    T('enquiries').push(row);
    T('user_roles').filter((r) => ['academy_admin', 'super_admin'].includes(r.role_key)).forEach((r) => push(r.user_id, 'New academy enquiry', row.name + (c ? ' · ' + c.title : ''), '/admin/enquiries'));
    return row.id;
  },
  send_certificate_expiry_reminders() {
    if (uid() && !isAdmin()) fail('Admins only');
    syncCertStatuses();
    let n = 0;
    for (const ce of T('certificates')) {
      const co = T('courses').find((x) => x.id === ce.course_id);
      if (ce.status !== 'valid' || !ce.valid_until || ce.expiry_reminded_at) continue;
      if (ce.valid_until < todayStr() || ce.valid_until > addDays(co?.expiry_reminder_days ?? 30)) continue;
      push(ce.learner_id, 'Your certificate is expiring soon', `${ce.course_title} expires on ${ce.valid_until}. Contact the academy to renew.`, '/app/certificates');
      ce.expiry_reminded_at = nowIso(); n++;
    }
    return n;
  },
  set_enrolment_access({ p_enrolment, p_status, p_note }) {
    if (!isAdmin()) fail('Only admins can change enrolment status');
    if (!['pending', 'approved', 'active', 'completed', 'cancelled'].includes(p_status)) fail('Unknown status');
    const e = T('course_enrolments').find((x) => x.id === p_enrolment) ?? fail('Enrolment not found');
    if (e.access_status === p_status) fail(`Enrolment is already ${p_status}`);
    const allowed: Record<string, string[]> = { pending: ['approved', 'active', 'cancelled'], approved: ['active', 'cancelled'], active: ['approved', 'completed', 'cancelled'], completed: ['active'], cancelled: ['pending', 'approved'] };
    if (!allowed[e.access_status]?.includes(p_status)) fail(`Cannot change an enrolment from ${e.access_status} to ${p_status}`);
    if (p_status === 'cancelled' && !(p_note ?? '').trim()) fail('A reason is required to reject or cancel');
    const c = T('courses').find((x) => x.id === e.course_id)!;
    T('enrolment_status_history').push({ id: uuid(), enrolment_id: e.id, from_status: e.access_status, to_status: p_status, changed_by: uid(), changed_by_name: name(uid()), note: (p_note ?? '').trim() || null, created_at: nowIso() });
    audit('set_enrolment_access', 'course_enrolments', e.id, { from: e.access_status, to: p_status, note: p_note });
    Object.assign(e, { access_status: p_status, access_changed_by: uid(), access_changed_at: nowIso() });
    push(e.user_id, `Enrolment ${p_status}`, c.title + ((p_note ?? '').trim() ? ': ' + p_note : ''), '/app/courses/' + c.slug);
    return p_status;
  },
  complete_lesson({ p_lesson }) {
    const l = T('lessons').find((x) => x.id === p_lesson) ?? fail('Lesson not found');
    const e = T('course_enrolments').find((x) => x.user_id === uid() && x.course_id === l.course_id) ?? fail('Enrol in this course to track lessons');
    if (!['active', 'completed'].includes(e.access_status)) fail('Your enrolment is not active');
    if (l.is_published === false) fail('This lesson is not available');
    if (!T('lesson_progress').some((p) => p.user_id === uid() && p.lesson_id === p_lesson)) T('lesson_progress').push({ user_id: uid(), lesson_id: p_lesson, course_id: l.course_id, completed_at: nowIso() });
    recompute(e.id);
    return e.progress_pct;
  },
  book_batch({ p_batch }) {
    if (!uid()) fail('Please sign in');
    const b = T('batches').find((x) => x.id === p_batch && ['open', 'full'].includes(x.status)) ?? fail('This batch is not available');
    if (b.starts_on < todayStr()) fail('This batch has already started');
    const e = T('course_enrolments').find((x) => x.user_id === uid() && x.course_id === b.course_id) ?? fail('Enrol in the course before booking a batch');
    if (!['active', 'completed'].includes(e.access_status)) fail('Your enrolment must be active before you can book a batch');
    const existing = T('batch_bookings').find((x) => x.batch_id === p_batch && x.user_id === uid());
    if (existing && ['booked', 'waitlist', 'attended'].includes(existing.status)) fail('You already have a booking in this batch');
    const status = seatsTaken(p_batch) >= b.capacity ? 'waitlist' : 'booked';
    if (existing) Object.assign(existing, { status, enrolment_id: e.id });
    else T('batch_bookings').push({ id: uuid(), batch_id: p_batch, user_id: uid(), enrolment_id: e.id, status, created_at: nowIso() });
    recompute(e.id);
    push(uid()!, status === 'booked' ? 'Academy session booked' : 'Added to waitlist', `${b.title} on ${b.starts_on}`, '/app/bookings');
    return status;
  },
  cancel_booking({ p_batch }) {
    const bk = T('batch_bookings').find((x) => x.batch_id === p_batch && x.user_id === uid() && ['booked', 'waitlist'].includes(x.status));
    if (bk) { bk.status = 'cancelled'; if (bk.enrolment_id) recompute(bk.enrolment_id); }
    const b = T('batches').find((x) => x.id === p_batch)!;
    const next = T('batch_bookings').filter((x) => x.batch_id === p_batch && x.status === 'waitlist').sort((a, z) => a.created_at.localeCompare(z.created_at))[0];
    if (next && seatsTaken(p_batch) < b.capacity) { next.status = 'booked'; push(next.user_id, 'A seat opened up', `You have been moved from the waitlist to ${b.title}`, '/app/bookings'); if (next.enrolment_id) recompute(next.enrolment_id); }
  },
  start_attempt({ p_assessment }) {
    const a = T('assessments').find((x) => x.id === p_assessment && x.status === 'published') ?? fail('Assessment not available');
    const e = T('course_enrolments').find((x) => x.user_id === uid() && x.course_id === a.course_id) ?? fail('Enrol in this course first');
    if (!['active', 'completed'].includes(e.access_status)) fail('Your enrolment must be active to take the assessment');
    recompute(e.id);
    if (!['assessment_unlocked', 'needs_retake'].includes(e.status)) fail('The assessment is not unlocked yet. Complete lessons and required academy attendance first.');
    const open = T('assessment_attempts').find((x) => x.assessment_id === p_assessment && x.user_id === uid() && x.status === 'in_progress' && new Date(x.started_at).getTime() + a.time_limit_min * 60000 > Date.now());
    if (open) return open.id;
    T('assessment_attempts').filter((x) => x.assessment_id === p_assessment && x.user_id === uid() && x.status === 'in_progress').forEach((x) => (x.status = 'expired'));
    const last = T('assessment_attempts').filter((x) => x.assessment_id === p_assessment && x.user_id === uid() && x.status === 'submitted' && !x.passed).map((x) => new Date(x.submitted_at).getTime()).sort().pop();
    if (last && a.retake_after_days > 0 && last + a.retake_after_days * 864e5 > Date.now()) fail('You can retake this assessment on ' + new Date(last + a.retake_after_days * 864e5).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }));
    const at = { id: uuid(), assessment_id: p_assessment, user_id: uid(), enrolment_id: e.id, status: 'in_progress', started_at: nowIso(), submitted_at: null, score_pct: null, passed: null, section_scores: null };
    T('assessment_attempts').push(at); return at.id;
  },
  save_answer({ p_attempt, p_question, p_option }) {
    const at = T('assessment_attempts').find((x) => x.id === p_attempt && x.user_id === uid() && x.status === 'in_progress') ?? fail('Attempt is not open');
    const ex = T('assessment_answers').find((x) => x.attempt_id === at.id && x.question_id === p_question);
    if (ex) ex.option_id = p_option; else T('assessment_answers').push({ attempt_id: at.id, question_id: p_question, option_id: p_option, is_correct: null });
  },
  attempt_review({ p_attempt }) {
    const at = T('assessment_attempts').find((x) => x.id === p_attempt);
    if (!at || at.status !== 'submitted') fail('Review is available after submission');
    if (at!.user_id !== uid() && !isStaff()) fail('Not allowed');
    const review = T('assessment_questions').filter((q) => q.assessment_id === at!.assessment_id).sort((a, b) => a.position - b.position).map((q) => {
      const ans = T('assessment_answers').find((x) => x.attempt_id === p_attempt && x.question_id === q.id);
      return { question_id: q.id, category: q.category, prompt: q.prompt, explanation: q.explanation, selected_option_id: ans?.option_id ?? null, correct_option_id: T('assessment_options').find((o) => o.question_id === q.id && o.is_correct)?.id, is_correct: !!ans?.is_correct };
    });
    return { attempt_id: at!.id, score_pct: at!.score_pct, passed: at!.passed, section_scores: at!.section_scores, review };
  },
  submit_attempt({ p_attempt, p_answers }) {
    const at = T('assessment_attempts').find((x) => x.id === p_attempt && x.user_id === uid()) ?? fail('Attempt not found');
    if (at.status !== 'in_progress') fail('This attempt was already submitted');
    const a = T('assessments').find((x) => x.id === at.assessment_id)!;
    const sections: Record<string, { correct: number; total: number }> = {};
    let correct = 0; const qs = T('assessment_questions').filter((q) => q.assessment_id === a.id);
    for (const q of qs) {
      const opt = (p_answers as Row)?.[q.id] ?? null;
      const ok = !!opt && !!T('assessment_options').find((o) => o.id === opt && o.question_id === q.id)?.is_correct;
      const ex = T('assessment_answers').find((x) => x.attempt_id === at.id && x.question_id === q.id);
      if (ex) Object.assign(ex, { option_id: opt, is_correct: ok }); else T('assessment_answers').push({ attempt_id: at.id, question_id: q.id, option_id: opt, is_correct: ok });
      if (ok) correct++;
      const cat = q.category ?? 'General'; sections[cat] ??= { correct: 0, total: 0 }; sections[cat].total++; if (ok) sections[cat].correct++;
    }
    const score = qs.length ? Math.round((10000 * correct) / qs.length) / 100 : 0;
    let secOk = true;
    if (a.compulsory_category && sections[a.compulsory_category]) { const s = sections[a.compulsory_category]; secOk = (100 * s.correct) / Math.max(s.total, 1) >= a.pass_mark; }
    Object.assign(at, { status: 'submitted', submitted_at: nowIso(), score_pct: score, passed: qs.length > 0 && score >= a.pass_mark && secOk, section_scores: sections });
    if (at.enrolment_id) recompute(at.enrolment_id);
    push(uid()!, at.passed ? 'Assessment passed' : 'Assessment result: retake needed', `${a.title} — ${score}%`, '/app/results/' + at.id);
    return rpcs.attempt_review({ p_attempt });
  },
  mark_attendance({ p_batch, p_user, p_status }) {
    const b = T('batches').find((x) => x.id === p_batch) ?? fail('Batch not found');
    if (!(isAdmin() || (hasRole('trainer') && b.trainer_id === uid()))) fail('Only the assigned trainer or an admin can mark attendance');
    const ex = T('attendance').find((x) => x.batch_id === p_batch && x.user_id === p_user && x.session_date === b.starts_on);
    if (ex) Object.assign(ex, { status: p_status, marked_by: uid() }); else T('attendance').push({ id: uuid(), batch_id: p_batch, user_id: p_user, session_date: b.starts_on, status: p_status, marked_by: uid(), marked_at: nowIso() });
    const bk = T('batch_bookings').find((x) => x.batch_id === p_batch && x.user_id === p_user && ['booked', 'attended', 'no_show'].includes(x.status));
    if (bk) { bk.status = p_status === 'present' ? 'attended' : 'no_show'; if (bk.enrolment_id) recompute(bk.enrolment_id); }
    audit('mark_attendance', 'attendance', p_batch, { user: p_user, status: p_status });
  },
  set_booking_status({ p_batch, p_user, p_status }) {
    const b = T('batches').find((x) => x.id === p_batch)!;
    if (!(isAdmin() || (hasRole('trainer') && b.trainer_id === uid()))) fail('Only the assigned trainer or an admin can manage the roster');
    const bk = T('batch_bookings').find((x) => x.batch_id === p_batch && x.user_id === p_user);
    if (bk) { bk.status = p_status; if (bk.enrolment_id) recompute(bk.enrolment_id); }
    if (p_status === 'booked') push(p_user, 'Seat confirmed', `You now have a seat in ${b.title}`, '/app/bookings');
  },
  save_practical({ p_enrolment, p_checklist, p_item_results, p_score, p_trainer_notes, p_learner_feedback, p_evidence, p_retake_reason }) {
    if (!isStaff()) fail('Only trainers and assessors can record practical results');
    const e = T('course_enrolments').find((x) => x.id === p_enrolment) ?? fail('Enrolment not found');
    const cl = T('practical_checklists').find((x) => x.id === p_checklist)!;
    let allPass = (p_item_results as Row[]).length > 0 && (p_item_results as Row[]).every((r) => r.pass);
    if (cl.min_score_pct != null && (p_score ?? 0) < cl.min_score_pct) allPass = false;
    const result = allPass ? 'passed' : 'failed';
    if (result === 'failed' && !(p_retake_reason ?? '').trim()) fail('A retake reason is required when any item is not passed');
    if (result === 'passed' && cl.requires_evidence && !(p_evidence?.length)) fail('Evidence upload is required for this practical');
    const row = { enrolment_id: p_enrolment, checklist_id: p_checklist, learner_id: e.user_id, assessor_id: uid(), assessor_name: name(uid()), item_results: p_item_results, score_pct: p_score ?? null, result, trainer_notes: p_trainer_notes, learner_feedback: p_learner_feedback, evidence_paths: p_evidence ?? [], retake_reason: p_retake_reason, completed_on: todayStr(), approval_status: 'pending', approved_by: null, approved_at: null };
    let pa = T('practical_assessments').find((x) => x.enrolment_id === p_enrolment && x.checklist_id === p_checklist);
    if (pa) Object.assign(pa, row); else { pa = { id: uuid(), ...row, created_at: nowIso() }; T('practical_assessments').push(pa); }
    if ((p_learner_feedback ?? '').trim()) T('trainer_feedback').unshift({ id: uuid(), enrolment_id: p_enrolment, learner_id: e.user_id, trainer_id: uid(), trainer_name: name(uid()), message: p_learner_feedback, created_at: nowIso() });
    recompute(p_enrolment);
    push(e.user_id, result === 'passed' ? 'Practical recorded: passed' : 'Practical recorded: retake needed', cl.title + (result === 'passed' ? ' — awaiting trainer approval.' : ' — see feedback.'), '/app/dashboard');
    audit('save_practical', 'practical_assessments', pa.id, { result });
    return pa.id;
  },
  approve_practical({ p_practical, p_approve, p_note }) {
    if (!(isAdmin() || hasRole('trainer'))) fail('Only trainers or admins can approve');
    const pa = T('practical_assessments').find((x) => x.id === p_practical) ?? fail('Practical not found');
    if (p_approve && pa.result !== 'passed') fail('Only passed practicals can be approved');
    if (!p_approve && !(p_note ?? '').trim()) fail('A reason is required to reject');
    Object.assign(pa, { approval_status: p_approve ? 'approved' : 'rejected', approved_by: uid(), approved_at: nowIso() });
    if (!p_approve) Object.assign(pa, { result: 'failed', retake_reason: p_note });
    recompute(pa.enrolment_id);
    audit(p_approve ? 'approve_practical' : 'reject_practical', 'practical_assessments', p_practical, { note: p_note });
  },
  admin_certificate_action({ p_cert, p_action, p_reason, p_months }) {
    if (!isAdmin()) fail('Admins only');
    const cert = T('certificates').find((x) => x.id === p_cert) ?? fail('Certificate not found');
    const c = T('courses').find((x) => x.id === cert.course_id)!;
    const months = c.certificate_validity_months;
    let result = p_cert;
    if (p_action === 'approve') { Object.assign(cert, { status: 'valid', issued_on: todayStr(), valid_until: months != null ? addMonthsStr(months) : null }); push(cert.learner_id, 'Certificate issued', `${cert.certificate_title} (${cert.cert_no}) is ready.`, '/app/certificates'); }
    else if (p_action === 'revoke') { if (!(p_reason ?? '').trim()) fail('A reason is required to revoke'); Object.assign(cert, { status: 'revoked', revoked_reason: p_reason }); push(cert.learner_id, 'Certificate revoked', `${cert.cert_no}: ${p_reason}`, '/app/certificates'); }
    else if (p_action === 'extend') { const base = cert.valid_until ?? todayStr(); const d = new Date(base); d.setMonth(d.getMonth() + (p_months ?? 12)); Object.assign(cert, { valid_until: d.toISOString().slice(0, 10), status: 'valid' }); }
    else if (p_action === 'reissue') {
      S.certSeq += 1;
      const no = `VTA-${c.code}-${new Date().getFullYear()}-${String(S.certSeq).padStart(4, '0')}-${rand4()}`;
      if (cert.status !== 'revoked') Object.assign(cert, { status: 'revoked', revoked_reason: 'Reissued as ' + no });
      const n = { ...cert, id: uuid(), cert_no: no, status: 'valid', issued_on: todayStr(), valid_until: months != null ? addMonthsStr(months) : null, revoked_reason: null, learner_name: name(cert.learner_id) || cert.learner_name, created_at: nowIso() };
      T('certificates').push(n); result = n.id;
    } else fail('Unknown action');
    if (cert.enrolment_id) recompute(cert.enrolment_id);
    audit('certificate_' + p_action, 'certificates', p_cert, { reason: p_reason });
    return result;
  },
  admin_update_profile({ p_user, p_full_name, p_mobile, p_city, p_branch, p_job_role, p_learner_code, p_is_active }) {
    if (!isAdmin()) fail('Admins only');
    const p = T('profiles').find((x) => x.id === p_user)!;
    const set = (k: string, v: unknown) => { if (v !== null && v !== undefined) p[k] = v; };
    set('full_name', p_full_name); set('mobile', p_mobile); set('city', p_city); set('branch_id', p_branch); set('job_role', p_job_role); set('learner_code', p_learner_code); set('is_active', p_is_active);
    audit('admin_update_profile', 'profiles', p_user, { is_active: p_is_active });
  },
  get_nursing_credentials({ p_user }) {
    const target = p_user ?? uid();
    if (target !== uid() && !(isAdmin() || hasRole('trainer'))) fail('Not allowed');
    const p = T('profiles').find((x) => x.id === target);
    return [{ nursing_reg_no: p?.nursing_reg_no ?? null, nursing_doc_path: p?.nursing_doc_path ?? null }];
  },
  sync_certificate_statuses() { syncCertStatuses(); },
  verify_certificate({ p_cert_no }) {
    const key = String(p_cert_no ?? '').trim().toUpperCase();
    const r = T('certificates').find((c) => c.cert_no.toUpperCase() === key);
    T('certificate_verifications').push({ id: uuid(), cert_no: key.slice(0, 40), found: !!r, verified_at: nowIso() });
    if (!r) return [];
    const status = r.status === 'valid' && r.valid_until && r.valid_until < todayStr() ? 'expired' : r.status;
    return [{ cert_no: r.cert_no, learner_name: r.learner_name, course_title: r.course_title, certificate_title: r.certificate_title, issued_on: r.issued_on, valid_until: r.valid_until, status }];
  },
};

// ───────────── virtual views + row-level visibility ─────────────
function view(name: string): Row[] | null {
  switch (name) {
    case 'v_assessment_questions': return T('assessment_questions').map(({ explanation, ...q }) => q);
    case 'v_assessment_options': return T('assessment_options').map(({ is_correct, ...o }) => o);
    case 'v_lesson_outline': return T('lessons').filter((l) => l.is_published !== false && (l.content_status ?? 'published') !== 'draft' && T('course_modules').find((m) => m.id === l.module_id)?.is_published !== false).map(({ transcript, video_path, video_url, video_provider, body, external_url, ...l }) => l);
    case 'v_batch_availability': return T('batches').filter((b) => b.status !== 'cancelled').map((b) => ({ ...b, branch_name: T('branches').find((x) => x.id === b.branch_id)?.name ?? null, trainer_name: T('profiles').find((x) => x.id === b.trainer_id)?.full_name ?? null, seats_taken: seatsTaken(b.id), waitlist_count: T('batch_bookings').filter((x) => x.batch_id === b.id && x.status === 'waitlist').length }));
    case 'v_my_practicals': return T('practical_assessments').filter((p) => p.learner_id === uid()).map(({ trainer_notes, evidence_paths, approved_by, ...p }) => p);
    default: return null;
  }
}

const OWN_COL: Record<string, string> = {
  lesson_progress: 'user_id', lesson_questions: 'user_id', course_enrolments: 'user_id', batch_bookings: 'user_id', attendance: 'user_id',
  assessment_attempts: 'user_id', trainer_feedback: 'learner_id', certificates: 'learner_id', notifications: 'user_id', profiles: 'id', user_roles: 'user_id',
};
function visibleRows(table: string): Row[] {
  const rows = T(table);
  if (table === 'notifications') return rows.filter((r) => r.user_id === uid());
  if (['assessment_questions', 'assessment_options', 'practical_assessments'].includes(table)) return isStaff() ? rows : [];
  if (table === 'enquiries') return isAdmin() ? rows : [];
  if (table === 'trainer_profiles') return isAdmin() ? rows : rows.filter((r) => r.is_published);
  if (table === 'testimonials') return isAdmin() ? rows : rows.filter((r) => r.is_published && r.consent_confirmed);
  if (table === 'audit_logs' || table === 'certificate_verifications') return isAdmin() ? rows : [];
  if (table === 'assessment_answers') return rows.filter((r) => isStaff() || T('assessment_attempts').find((a) => a.id === r.attempt_id)?.user_id === uid());
  if (table === 'lessons') {
    return rows.filter((l) => isAdmin() || (l.is_published !== false && T('course_modules').find((m) => m.id === l.module_id)?.is_published !== false && (isStaff() || T('course_enrolments').some((e) => e.user_id === uid() && e.course_id === l.course_id && ['active', 'completed'].includes(e.access_status)))));
  }
  if (table === 'enrolment_status_history') {
    return rows.filter((h) => { const e = T('course_enrolments').find((x) => x.id === h.enrolment_id); return isAdmin() || e?.user_id === uid() || (hasRole('trainer', 'assessor') && !!e); });
  }
  const own = OWN_COL[table];
  if (own && !isStaff()) return rows.filter((r) => r[own] === uid());
  return rows;
}
const clean = (table: string, rows: Row[]) => (table === 'profiles' ? rows.map(({ nursing_reg_no, nursing_doc_path, ...p }) => p) : rows);

// ───────────── backend ─────────────
export function createDemoBackend(): Backend {
  load();
  const mkUser = (id: string) => ({ id, email: S.accounts.find((a) => a.id === id)?.email ?? null });
  const newAccount = (email: string, password: string, meta: Row, mobile?: string | null) => {
    const id = 'user:' + uuid();
    S.accounts.push({ id, email, mobile: mobile ?? meta.mobile ?? null, password });
    T('profiles').push({ id, full_name: meta.full_name ?? '', email, mobile: meta.mobile ?? mobile ?? null, city: meta.city ?? null, preferred_language: meta.preferred_language ?? 'English', learner_code: meta.learner_code ?? null, job_role: meta.job_role ?? null, branch_id: meta.branch_id || null, avatar_path: null, nursing_reg_no: meta.nursing_reg_no ?? null, nursing_doc_path: null, consent_privacy: !!meta.consent_privacy, consent_comms: !!meta.consent_comms, is_active: true, created_at: nowIso() });
    T('user_roles').push({ user_id: id, role_key: 'learner' });
    return id;
  };

  return {
    mode: 'demo',
    auth: {
      async getUser() { return S.session ? mkUser(S.session) : null; },
      async signIn(email, password) {
        const a = S.accounts.find((x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.password === password) ?? fail('Invalid email or password');
        if (T('profiles').find((p) => p.id === a.id)?.is_active === false) fail('This account has been deactivated. Contact the academy.');
        S.session = a.id; persist(); notify(); return mkUser(a.id);
      },
      async signUp({ email, password, meta }: SignUpInput) {
        if (S.accounts.some((x) => x.email.toLowerCase() === email.toLowerCase())) fail('An account with this email already exists');
        const id = newAccount(email, password, meta);
        S.session = id; persist(); notify();
        return { user: mkUser(id), needsConfirmation: false };
      },
      async signOut() { S.session = null; persist(); notify(); },
      async sendPasswordReset(email) { if (!email) fail('Enter your email'); },
      async updatePassword(password) { if (password.length < 8) fail('Use at least 8 characters'); },
      async sendOtp(mobile) { if (!/^\+?\d{10,13}$/.test(mobile.replace(/\s/g, ''))) fail('Enter a valid 10-digit mobile number'); },
      async verifyOtp(mobile, token) {
        if (token !== DEMO_OTP) fail(`Incorrect code. In demo mode the code is ${DEMO_OTP}.`);
        const m = mobile.replace(/\D/g, '').slice(-10);
        let a = S.accounts.find((x) => (x.mobile ?? '').replace(/\D/g, '').slice(-10) === m);
        if (!a) { const id = newAccount(`${m}@mobile.vtiara.demo`, DEMO_PASSWORD, { full_name: 'New learner', mobile: m }, m); a = S.accounts.find((x) => x.id === id)!; }
        S.session = a.id; persist(); notify(); return mkUser(a.id);
      },
      onChange(cb) { listeners.add(cb); return () => { listeners.delete(cb); }; },
    },
    async select(table, q: Query = {}) {
      let rows = view(table) ?? clean(table, visibleRows(table));
      if (!view(table) && table === 'courses' && !isStaff()) rows = rows.filter((c) => ['published', 'coming_soon'].includes(c.status));
      if (!view(table) && table === 'course_modules') rows = rows.filter((m) => (isAdmin() || m.is_published !== false) && (isStaff() || ['published', 'coming_soon'].includes(T('courses').find((c) => c.id === m.course_id)?.status)));
      for (const [k, v] of Object.entries(q.eq ?? {})) rows = rows.filter((r) => r[k] === v);
      for (const [k, v] of Object.entries(q.in ?? {})) rows = rows.filter((r) => v.includes(r[k]));
      if (q.order) { const [col, asc = true] = q.order; rows = [...rows].sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (asc ? 1 : -1)); }
      if (q.limit) rows = rows.slice(0, q.limit);
      return JSON.parse(JSON.stringify(rows));
    },
    async insert(table, row) {
      const rows: Row[] = (Array.isArray(row) ? row : [row]).map((r) => ({ id: uuid(), created_at: nowIso(), ...r }));
      if (table === 'lesson_questions') rows.forEach((r) => { r.user_id = uid(); });
      if (table === 'user_roles') rows.forEach((r) => { delete (r as Row).id; delete (r as Row).created_at; });
      if (table === 'courses') rows.forEach((r) => { r.sort_order ??= 100; r.faq ??= []; });
      if (table === 'lessons') rows.forEach((r) => { r.content_status ??= r.is_published === false ? 'draft' : 'published'; r.content_version ??= 1; r.is_published = r.content_status !== 'draft'; });
      T(table).push(...rows); persist(); notify();
      if (['courses', 'user_roles', 'batches', 'assessments'].includes(table)) audit('insert', table, (rows[0] as Row).id ?? (rows[0] as Row).user_id);
      return JSON.parse(JSON.stringify(rows));
    },
    async update(table, match, patch) {
      const hit = T(table).filter((r) => Object.entries(match).every(([k, v]) => r[k] === v));
      hit.forEach((r) => {
        Object.assign(r, patch);
        if (table === 'lessons') { // mirror the DB trigger: is_published and content_status stay in step
          if ('is_published' in patch && !('content_status' in patch)) r.content_status = r.is_published ? 'published' : 'draft';
          else if ('content_status' in patch) r.is_published = r.content_status !== 'draft';
        }
        if (table === 'enquiries') { r.updated_at = nowIso(); if (r.status !== 'new' && !r.contacted_at) r.contacted_at = nowIso(); }
      });
      persist(); notify();
      if (['courses', 'batches', 'assessments'].includes(table)) hit.forEach((r) => audit('update', table, r.id));
      return JSON.parse(JSON.stringify(hit));
    },
    async remove(table, match) {
      S.t[table] = T(table).filter((r) => !Object.entries(match).every(([k, v]) => r[k] === v)); persist(); notify();
    },
    async rpc(fn, args = {}) {
      const f = rpcs[fn] ?? fail('Unknown function ' + fn);
      const out = f(args); persist(); notify(); return out;
    },
    storage: {
      async upload(bucket, path, file) {
        const data: string = await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.readAsDataURL(file); });
        S.files[`${bucket}/${path}`] = data.length < 1_500_000 ? data : URL.createObjectURL(file);
        persist(); return path;
      },
      async signedUrl(bucket, path) { return S.files[`${bucket}/${path}`] ?? null; },
    },
    async manageUser(action, p) {
      if (!isAdmin()) fail('Admins only');
      if (action === 'create') {
        const email = String(p.email ?? '').trim(); if (!email) fail('Email is required');
        if (S.accounts.some((x) => x.email.toLowerCase() === email.toLowerCase())) fail('An account with this email already exists');
        const id = newAccount(email, String(p.password || DEMO_PASSWORD), { full_name: p.full_name, mobile: p.mobile, city: p.city, branch_id: p.branch_id, job_role: p.job_role, learner_code: p.learner_code, consent_privacy: true });
        if (p.role && p.role !== 'learner') T('user_roles').push({ user_id: id, role_key: p.role });
        audit('create_user', 'profiles', id, { role: p.role }); persist(); notify(); return { ok: true, id };
      }
      if (action === 'set_active') { const pr = T('profiles').find((x) => x.id === p.user_id); if (pr) pr.is_active = !!p.active; audit('set_active', 'profiles', String(p.user_id), { active: p.active }); persist(); notify(); return { ok: true }; }
      audit('reset_access', 'profiles', String(p.user_id)); persist(); return { ok: true };
    },
  };
}
