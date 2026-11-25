import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { backend, useQuery } from '@/lib/db';
import { Button, Field, Notice, PageHeader, Spinner, useAction } from '@/components/ui';
import { FileInput } from '@/pages/auth/Auth';
import type { Branch } from '@/lib/types';

const LANGS = ['English', 'Kannada', 'Hindi', 'Tamil', 'Telugu', 'Malayalam'];
const ROLES = ['Skin Therapist', 'Staff Nurse', 'Housekeeping', 'Telecaller', 'Front Desk', 'Branch Manager', 'Dermatologist', 'Other'];

export default function Profile() {
  const { user, refresh } = useAuth();
  const [params] = useSearchParams();
  const { busy, run } = useAction();
  const p = user!.profile;
  const [f, setF] = useState({ full_name: '', mobile: '', city: '', preferred_language: 'English', learner_code: '', job_role: '', branch_id: '', consent_comms: false });
  const [nurse, setNurse] = useState({ reg: '', hasDoc: false });
  const [photo, setPhoto] = useState<File | null>(null);
  const [doc, setDoc] = useState<File | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);

  const { data: branches } = useQuery(() => backend.select<Branch>('branches', { eq: { is_active: true } }), []);
  useQuery(async () => {
    const rows = await backend.rpc<{ nursing_reg_no: string | null; nursing_doc_path: string | null }[]>('get_nursing_credentials', { p_user: user!.id });
    setNurse({ reg: rows?.[0]?.nursing_reg_no ?? '', hasDoc: !!rows?.[0]?.nursing_doc_path });
    return rows;
  }, [user?.id]);

  useEffect(() => {
    if (!p) return;
    setF({ full_name: p.full_name, mobile: p.mobile ?? '', city: p.city ?? '', preferred_language: p.preferred_language ?? 'English', learner_code: p.learner_code ?? '', job_role: p.job_role ?? '', branch_id: p.branch_id ?? '', consent_comms: p.consent_comms });
    if (p.avatar_path) backend.storage.signedUrl('learner-documents', p.avatar_path).then(setAvatar).catch(() => {});
  }, [p?.id, p?.avatar_path]);

  if (!p) return <Spinner />;
  const isNurse = f.job_role === 'Staff Nurse';
  const set = (k: keyof typeof f) => (e: any) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      if (!f.full_name.trim()) throw new Error('Name is required');
      if (isNurse && !nurse.reg.trim()) throw new Error('Nursing Council registration number is required for nurses');
      const patch: Record<string, unknown> = { ...f, branch_id: f.branch_id || null };
      if (isNurse) patch.nursing_reg_no = nurse.reg.trim();
      if (photo) patch.avatar_path = await backend.storage.upload('learner-documents', `${user!.id}/avatar-${Date.now()}-${photo.name}`, photo);
      if (doc) patch.nursing_doc_path = await backend.storage.upload('learner-documents', `${user!.id}/nursing-registration-${Date.now()}-${doc.name}`, doc);
      await backend.update('profiles', { id: user!.id }, patch);
      setPhoto(null); setDoc(null);
      if (doc) setNurse((n) => ({ ...n, hasDoc: true }));
      await refresh();
    }, 'Profile saved');
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="My profile" subtitle="Keep your details current. They appear on your certificate only as your name." />
      {params.get('welcome') && <div className="mb-5"><Notice tone="green" title="Welcome to VTIARA Training Academy">Please check your details and add a photo. Then browse the catalogue and enrol in Common Core Training.</Notice></div>}
      <form onSubmit={save} className="card space-y-5">
        <div className="flex items-center gap-4">
          {avatar ? <img src={avatar} alt="" className="h-16 w-16 rounded-full object-cover" /> : <span className="flex h-16 w-16 items-center justify-center rounded-full bg-navy font-display text-2xl text-white">{p.full_name.charAt(0)}</span>}
          <div className="min-w-0 flex-1"><FileInput label="Profile photo" file={photo} onChange={setPhoto} accept="image/*" /></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="pn"><input id="pn" className="input" value={f.full_name} onChange={set('full_name')} required /></Field>
          <Field label="Email" hint="Sign-in email cannot be changed here."><input className="input bg-pale" value={p.email ?? ''} disabled /></Field>
          <Field label="Mobile" htmlFor="pm"><input id="pm" className="input" inputMode="tel" value={f.mobile} onChange={set('mobile')} /></Field>
          <Field label="City" htmlFor="pc"><input id="pc" className="input" value={f.city} onChange={set('city')} /></Field>
          <Field label="Job role" htmlFor="pr"><select id="pr" className="input" value={f.job_role} onChange={set('job_role')}>{[...new Set([f.job_role, ...ROLES])].filter(Boolean).map((r) => <option key={r}>{r}</option>)}</select></Field>
          <Field label="Branch" htmlFor="pb"><select id="pb" className="input" value={f.branch_id} onChange={set('branch_id')}><option value="">Not an employee / none</option>{branches?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
          <Field label="Preferred language" htmlFor="pl"><select id="pl" className="input" value={f.preferred_language} onChange={set('preferred_language')}>{LANGS.map((l) => <option key={l}>{l}</option>)}</select></Field>
          <Field label="Employee / learner ID" hint="Optional" htmlFor="pi"><input id="pi" className="input" value={f.learner_code} onChange={set('learner_code')} /></Field>
        </div>

        {isNurse && (
          <div className="rounded-2xl border border-accent/30 bg-pale p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-teal" />Nursing Council registration</p>
            <div className="grid gap-4">
              <Field label="Registration number" htmlFor="pnr"><input id="pnr" className="input" value={nurse.reg} onChange={(e) => setNurse({ ...nurse, reg: e.target.value })} /></Field>
              <FileInput label={nurse.hasDoc ? 'Replace registration document' : 'Registration document (PDF or image)'} file={doc} onChange={setDoc} accept="application/pdf,image/*" />
            </div>
            <p className="mt-3 text-xs text-navy/60">Visible only to academy administrators and your trainers.</p>
          </div>
        )}

        <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 h-4 w-4 accent-teal" checked={f.consent_comms} onChange={set('consent_comms')} />Send me course reminders and academy updates.</label>
        <p className="text-xs text-navy/55">Privacy consent was given at sign-up{p.consent_privacy ? '' : ' (not recorded)'}.</p>
        <Button className="btn-primary" loading={busy} type="submit">Save profile</Button>
      </form>
    </div>
  );
}
