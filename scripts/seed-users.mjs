// Creates the demo accounts in YOUR Supabase project (service role; run locally, never in the browser).
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed:users
// Run supabase/seed.sql first (courses, batches, branches).
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (Project Settings → API).'); process.exit(1); }
const PASSWORD = process.env.DEMO_PASSWORD || 'Demo@1234';
const { demoUsers } = JSON.parse(readFileSync(new URL('../src/data/content.json', import.meta.url), 'utf8'));
const sb = createClient(url, key, { auth: { persistSession: false } });
const ok = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data; };

const { data: branches } = await sb.from('branches').select('id').order('name').limit(1);
const ids = {};
for (const u of demoUsers) {
  const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  let existing = list?.users?.find((x) => x.email === u.email);
  if (!existing) {
    const r = await sb.auth.admin.createUser({
      email: u.email, password: PASSWORD, email_confirm: true,
      user_metadata: { full_name: u.name, mobile: u.mobile, city: 'Bangalore', preferred_language: 'English', job_role: u.role === 'learner' ? 'Skin Therapist' : 'Academy', branch_id: branches?.[0]?.id ?? '', consent_privacy: true },
    });
    existing = ok(r, `create ${u.email}`).user;
  }
  ids[u.key] = existing.id;
  if (u.role !== 'learner') ok(await sb.from('user_roles').upsert({ user_id: existing.id, role_key: u.role }), `role ${u.email}`);
  console.log('✓', u.email, u.role);
}

// Trainer takes the demo batches that have none.
ok(await sb.from('batches').update({ trainer_id: ids.trainer }).is('trainer_id', null), 'assign trainer');

// learner2 arrives already certified so the verification page can be shown straight away.
const [cc] = ok(await sb.from('courses').select('*').eq('code', 'CC'), 'course CC');
if (cc) {
  let [en] = ok(await sb.from('course_enrolments').select('id').eq('user_id', ids.learner2).eq('course_id', cc.id), 'enrolment lookup');
  if (!en) [en] = ok(await sb.from('course_enrolments').insert({ user_id: ids.learner2, course_id: cc.id, mode: 'online', access_status: 'completed', status: 'certified', progress_pct: 100, completed_at: new Date().toISOString() }).select('id'), 'enrolment');
  const { data: has } = await sb.from('certificates').select('id').eq('learner_id', ids.learner2).eq('course_id', cc.id);
  if (!has?.length) {
    const until = cc.certificate_validity_months ? new Date(Date.now() + cc.certificate_validity_months * 30.4 * 864e5).toISOString().slice(0, 10) : null;
    ok(await sb.from('certificates').insert({
      cert_no: `VTA-CC-${new Date().getFullYear()}-0000-D3M0`, enrolment_id: en.id, learner_id: ids.learner2, course_id: cc.id,
      learner_name: demoUsers.find((u) => u.key === 'learner2').name, course_title: cc.title, role_label: cc.role_label,
      certificate_title: cc.certificate_title, status: 'valid', issued_on: new Date().toISOString().slice(0, 10), valid_until: until,
    }), 'sample certificate');
    console.log(`✓ sample certificate VTA-CC-${new Date().getFullYear()}-0000-D3M0 for learner2`);
  }
}
console.log(`\nDone. Sign in with any demo email and password ${PASSWORD}.`);
