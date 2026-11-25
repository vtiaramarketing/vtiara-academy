import { lazy, Suspense, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Smartphone, Upload } from 'lucide-react';
import { backend, isDemo, useQuery } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import { Button, ErrorNote, Field, Notice, Tabs } from '@/components/ui';
import type { Branch } from '@/lib/types';
import { usePageMeta } from '@/lib/seo';

/** Only ever loaded when VITE_DEMO_MODE=true; production bundles contain no demo credentials. */
const DemoLoginHint = isDemo ? lazy(() => import('@/components/DemoLoginHint')) : null;

const JOB_ROLES = ['Skin Therapist', 'Staff Nurse', 'Housekeeping', 'Telecaller', 'Dermatologist', 'Front Desk', 'Branch Manager', 'Other / future trainee'];
const LANGUAGES = ['English', 'Kannada', 'Hindi', 'Tamil', 'Telugu', 'Malayalam'];

function Shell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[1fr_1.1fr]">
      <div className="relative hidden overflow-hidden bg-navy p-12 text-white lg:flex lg:flex-col lg:justify-end">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent/25 blur-3xl" />
        <p className="eyebrow relative !text-gold">VTIARA Training Academy</p>
        <p className="relative mt-3 font-display text-4xl font-semibold leading-tight text-white">Certified before patients.</p>
        <p className="relative mt-3 max-w-sm text-white/70">Learn online or at the academy, complete supervised practice, and earn a certificate anyone can verify.</p>
      </div>
      <div className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <h1 className="font-display text-3xl font-semibold">{title}</h1>
          <p className="mt-1 text-sm text-navy/65">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

function useAfterAuth() {
  const nav = useNavigate();
  const loc = useLocation();
  const { refresh } = useAuth();
  const from = (loc.state as any)?.from as string | undefined;
  return async (id: string, fallback?: string) => {
    await refresh();
    const roles = await backend.select<{ role_key: string }>('user_roles', { eq: { user_id: id } });
    const staff = roles.some((r) => r.role_key !== 'learner');
    nav(from ?? fallback ?? (staff ? '/admin' : '/app/dashboard'), { replace: true });
  };
}

export function Login() {
  usePageMeta('Sign in', 'Sign in to your VTIARA Training Academy account.', { noindex: true });
  const [mode, setMode] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const after = useAfterAuth();

  const go = async (fn: () => Promise<{ id: string }>) => {
    setBusy(true); setErr(null);
    try { const u = await fn(); await after(u.id); } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const submitEmail = (e: FormEvent) => { e.preventDefault(); go(() => backend.auth.signIn(email, password)); };
  const submitOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (!sent) { setBusy(true); setErr(null); try { await backend.auth.sendOtp(mobile); setSent(true); } catch (x: any) { setErr(x.message); } finally { setBusy(false); } }
    else go(() => backend.auth.verifyOtp(mobile, code));
  };

  return (
    <Shell title="Welcome back" subtitle="Sign in to continue your training.">
      <Tabs tabs={[{ id: 'email', label: 'Email & password' }, { id: 'otp', label: 'Mobile OTP' }]} value={mode} onChange={(m) => { setMode(m); setErr(null); }} />
      {DemoLoginHint && <Suspense fallback={null}><DemoLoginHint /></Suspense>}
      {err && <div className="mt-4"><ErrorNote message={err} /></div>}
      {mode === 'email' ? (
        <form onSubmit={submitEmail} className="mt-5 space-y-4">
          <Field label="Email" htmlFor="email"><input id="email" type="email" required autoComplete="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Password" htmlFor="pw"><input id="pw" type="password" required autoComplete="current-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          <div className="text-right"><Link to="/forgot-password" className="text-sm font-semibold text-teal">Forgot password?</Link></div>
          <Button className="btn-primary w-full" loading={busy}><Mail className="h-4 w-4" />Sign in</Button>
        </form>
      ) : (
        <form onSubmit={submitOtp} className="mt-5 space-y-4">
          <Field label="Mobile number" htmlFor="mob" hint="We will text you a one-time code."><input id="mob" inputMode="numeric" required className="input" placeholder="98XXXXXXXX" value={mobile} onChange={(e) => setMobile(e.target.value)} disabled={sent} /></Field>
          {sent && <Field label="One-time code" htmlFor="otp"><input id="otp" inputMode="numeric" required maxLength={6} className="input tracking-[0.4em]" value={code} onChange={(e) => setCode(e.target.value)} autoFocus /></Field>}
          <Button className="btn-primary w-full" loading={busy}><Smartphone className="h-4 w-4" />{sent ? 'Verify and sign in' : 'Send code'}</Button>
          {sent && <button type="button" className="btn-ghost btn-sm w-full" onClick={() => { setSent(false); setCode(''); }}>Use a different number</button>}
        </form>
      )}
      <p className="mt-6 text-center text-sm text-navy/65">New to the academy? <Link to="/signup" className="font-semibold text-teal">Create an account</Link></p>
    </Shell>
  );
}

export function Forgot() {
  usePageMeta('Forgot password', 'Reset your VTIARA Training Academy password.', { noindex: true });
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    try { await backend.auth.sendPasswordReset(email); setDone(true); } catch (x: any) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <Shell title="Reset your password" subtitle="Enter your email and we will send a reset link.">
      {done ? <Notice tone="green" title="Check your inbox">If an account exists for {email}, a reset link is on its way.</Notice> : (
        <form onSubmit={submit} className="space-y-4">
          {err && <ErrorNote message={err} />}
          <Field label="Email" htmlFor="fe"><input id="fe" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Button className="btn-primary w-full" loading={busy}>Send reset link</Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm"><Link to="/login" className="font-semibold text-teal">Back to sign in</Link></p>
    </Shell>
  );
}

export function Signup() {
  usePageMeta('Register', 'Create your VTIARA Training Academy learner account.', { noindex: true });
  const { data: branches } = useQuery(() => backend.select<Branch>('branches', { eq: { is_active: true } }), []);
  const [f, setF] = useState({ full_name: '', mobile: '', email: '', password: '', city: 'Bangalore', preferred_language: 'English', learner_code: '', job_role: 'Skin Therapist', branch_id: '', nursing_reg_no: '' });
  const [photo, setPhoto] = useState<File | null>(null);
  const [doc, setDoc] = useState<File | null>(null);
  const [privacy, setPrivacy] = useState(false);
  const [comms, setComms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const after = useAfterAuth();
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const nurse = f.job_role === 'Staff Nurse';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (f.password.length < 8) { setErr('Password must be at least 8 characters.'); return; }
    if (!privacy) { setErr('Please accept the Privacy Policy to continue.'); return; }
    if (nurse && !f.nursing_reg_no.trim()) { setErr('Nursing Council registration number is required for nurses.'); return; }
    setBusy(true); setErr(null);
    try {
      const { user, needsConfirmation } = await backend.auth.signUp({
        email: f.email.trim(), password: f.password,
        meta: { ...f, branch_id: f.branch_id || (branches?.[0]?.id ?? ''), nursing_reg_no: nurse ? f.nursing_reg_no.trim() : undefined, consent_privacy: privacy, consent_comms: comms },
      });
      if (needsConfirmation) { setConfirm(true); return; }
      if (user) {
        // uploads need a session; both go to the private learner-documents bucket under the learner's own folder
        const patch: Record<string, unknown> = {};
        if (photo) patch.avatar_path = await backend.storage.upload('learner-documents', `${user.id}/photo-${Date.now()}-${photo.name}`, photo);
        if (nurse && doc) patch.nursing_doc_path = await backend.storage.upload('learner-documents', `${user.id}/nursing-registration-${Date.now()}-${doc.name}`, doc);
        if (Object.keys(patch).length) await backend.update('profiles', { id: user.id }, patch);
        await after(user.id, '/app/profile?welcome=1');
      }
    } catch (x: any) { setErr(x.message); } finally { setBusy(false); }
  };

  if (confirm) return (
    <Shell title="Confirm your email" subtitle="One more step.">
      <Notice tone="green" title="Check your inbox">We sent a confirmation link to {f.email}. After confirming, sign in to add your profile photo{nurse ? ' and nursing registration document' : ''}.</Notice>
      <Link to="/login" className="btn-primary mt-6 w-full">Go to sign in</Link>
    </Shell>
  );

  return (
    <Shell title="Create your account" subtitle="Register to enrol in VTIARA Training Academy courses.">
      <form onSubmit={submit} className="space-y-4">
        {err && <ErrorNote message={err} />}
        <Field label="Full name" htmlFor="n"><input id="n" required className="input" value={f.full_name} onChange={set('full_name')} autoComplete="name" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mobile number" htmlFor="m"><input id="m" required inputMode="numeric" className="input" value={f.mobile} onChange={set('mobile')} autoComplete="tel" /></Field>
          <Field label="City" htmlFor="c"><input id="c" required className="input" value={f.city} onChange={set('city')} /></Field>
        </div>
        <Field label="Email" htmlFor="e"><input id="e" type="email" required className="input" value={f.email} onChange={set('email')} autoComplete="email" /></Field>
        <Field label="Password" htmlFor="p" hint="At least 8 characters."><input id="p" type="password" required minLength={8} className="input" value={f.password} onChange={set('password')} autoComplete="new-password" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Role you are training for" htmlFor="r"><select id="r" className="input" value={f.job_role} onChange={set('job_role')}>{JOB_ROLES.map((r) => <option key={r}>{r}</option>)}</select></Field>
          <Field label="Preferred language" htmlFor="l"><select id="l" className="input" value={f.preferred_language} onChange={set('preferred_language')}>{LANGUAGES.map((r) => <option key={r}>{r}</option>)}</select></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Branch" htmlFor="b"><select id="b" className="input" value={f.branch_id || branches?.[0]?.id || ''} onChange={set('branch_id')}>{(branches ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
          <Field label="Employee ID or learner ID" htmlFor="i" hint="Leave blank if you are not yet employed."><input id="i" className="input" value={f.learner_code} onChange={set('learner_code')} /></Field>
        </div>
        {nurse && (
          <div className="space-y-4 rounded-2xl border border-gold/50 bg-gold-soft/50 p-4">
            <p className="text-sm font-semibold">Staff nurse verification</p>
            <Field label="Nursing Council registration number" htmlFor="nr"><input id="nr" className="input" value={f.nursing_reg_no} onChange={set('nursing_reg_no')} /></Field>
            <FileInput label="Registration document (PDF or image)" file={doc} onChange={setDoc} accept="application/pdf,image/*" />
            <p className="text-xs text-navy/60">Visible only to authorised admins and trainers.</p>
          </div>
        )}
        <FileInput label="Profile photo (optional)" file={photo} onChange={setPhoto} accept="image/*" />
        <label className="flex items-start gap-2.5 text-sm"><input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} className="mt-1 h-4 w-4 rounded border-navy/30 text-teal" /><span>I agree to the <Link to="/privacy" target="_blank" className="font-semibold text-teal">Privacy Policy</Link> and <Link to="/terms" target="_blank" className="font-semibold text-teal">Terms</Link>. <span className="text-red-600">*</span></span></label>
        <label className="flex items-start gap-2.5 text-sm"><input type="checkbox" checked={comms} onChange={(e) => setComms(e.target.checked)} className="mt-1 h-4 w-4 rounded border-navy/30 text-teal" /><span>I agree to receive academy communications (session reminders, results).</span></label>
        <Button className="btn-primary w-full" loading={busy}>Create account</Button>
      </form>
      <p className="mt-6 text-center text-sm text-navy/65">Already registered? <Link to="/login" className="font-semibold text-teal">Sign in</Link></p>
    </Shell>
  );
}

export function FileInput({ label, file, onChange, accept }: { label: string; file: File | null; onChange: (f: File | null) => void; accept?: string }) {
  return (
    <div>
      <span className="label">{label}</span>
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-navy/25 bg-white px-4 py-3 text-sm text-navy/70 hover:border-teal">
        <Upload className="h-4 w-4 text-teal" /><span className="truncate">{file ? file.name : 'Choose a file…'}</span>
        <input type="file" className="sr-only" accept={accept} onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
      </label>
    </div>
  );
}
