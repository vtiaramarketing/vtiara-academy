import { useEffect, useState } from 'react';
import { backend, isDemo, useQuery } from '@/lib/db';
import { Badge, Button, ErrorNote, Field, Modal, Notice, PageHeader, Spinner, Table, Tabs, useAction, useToast } from '@/components/ui';
import { useSettings } from '@/lib/settings';
import TrainerPhoto from '@/components/TrainerPhoto';
import type { AcademySettings, Branch, Testimonial, TrainerProfile, Course } from '@/lib/types';

type Tab = 'details' | 'branches' | 'trainers' | 'stories';
type TextKey = Exclude<{ [K in keyof AcademySettings]: AcademySettings[K] extends string | null ? K : never }[keyof AcademySettings], 'id'>;

const ACADEMY_FIELDS: [TextKey, string, string?][] = [
  ['academy_name', 'Academy name'], ['tagline', 'Tagline'],
  ['academy_address', 'Academy address', 'Where learners attend. Leave blank to show the clinic address.'], ['academy_maps_url', 'Academy Google Maps link'],
  ['academy_phone', 'Academy phone'], ['academy_whatsapp', 'Academy WhatsApp number', 'Used for the "Enquire on WhatsApp" buttons.'],
  ['academy_email', 'Academy email'], ['academy_hours', 'Academy hours'], ['whatsapp_message', 'Default WhatsApp message'],
];
const CLINIC_FIELDS: [TextKey, string][] = [
  ['clinic_name', 'Clinic name'], ['clinic_website', 'Clinic website'], ['clinic_address', 'Clinic address'], ['clinic_maps_url', 'Clinic Google Maps link'],
  ['clinic_phone', 'Clinic phone'], ['clinic_whatsapp', 'Clinic WhatsApp'], ['clinic_email', 'Clinic email'], ['clinic_hours', 'Clinic hours'],
];
const SOCIAL_FIELDS: [TextKey, string][] = [['instagram_url', 'Instagram'], ['facebook_url', 'Facebook'], ['youtube_url', 'YouTube'], ['linkedin_url', 'LinkedIn']];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('details');
  return (
    <>
      <PageHeader title="Academy settings" subtitle="Contact details, branches, trainer profiles and success stories shown on the public site." />
      <Tabs tabs={[{ id: 'details', label: 'Academy and clinic details' }, { id: 'branches', label: 'Branches' }, { id: 'trainers', label: 'Trainers and advisors' }, { id: 'stories', label: 'Success stories' }]} value={tab} onChange={setTab} />
      <div className="mt-6">
        {tab === 'details' && <Details />}
        {tab === 'branches' && <Branches />}
        {tab === 'trainers' && <Trainers />}
        {tab === 'stories' && <Stories />}
      </div>
      <div className="mt-8"><Notice title="Environment">{isDemo ? 'Demo mode: data is stored in this browser only.' : 'Connected to Supabase.'}</Notice></div>
    </>
  );
}

function Details() {
  const { settings, reload } = useSettings();
  const { busy, run } = useAction();
  const [v, setV] = useState<AcademySettings>(settings);
  useEffect(() => setV(settings), [settings]);
  const flagged = new Set(v.needs_confirmation);
  const toggle = (k: string) => { const n = new Set(flagged); n.has(k) ? n.delete(k) : n.add(k); setV({ ...v, needs_confirmation: [...n] }); };
  const save = () => run(async () => {
    const { id, ...patch } = v; void id;
    const clean = Object.fromEntries(Object.entries(patch).map(([k, val]) => [k, typeof val === 'string' && val.trim() === '' ? null : val]));
    await backend.update('academy_settings', { id: 1 }, { ...clean, academy_name: v.academy_name.trim() || 'VTIARA Training Academy', clinic_name: v.clinic_name.trim() || 'VTIARA Hair & Skin Clinic' });
    reload();
  }, 'Settings saved');
  const input = ([k, label, hint]: [TextKey, string, string?], confirmable = true) => (
    <div key={k}>
      <Field label={label} hint={hint}><input className="input" value={(v[k] as string | null) ?? ''} onChange={(e) => setV({ ...v, [k]: e.target.value })} /></Field>
      {confirmable && (
        <label className="mt-1 flex items-center gap-2 text-xs text-navy/70">
          <input type="checkbox" className="accent-teal" checked={flagged.has(k)} onChange={() => toggle(k)} />Needs VTIARA confirmation {flagged.has(k) && <Badge tone="gold">Unconfirmed</Badge>}
        </label>
      )}
    </div>
  );
  return (
    <div className="space-y-8">
      <Notice tone="gold" title="Check these before launch">Fields marked "Needs VTIARA confirmation" were taken from the public clinic website or are not yet confirmed for the academy. Edit them, then untick the box once confirmed. Academy details override clinic details on the public site; blank academy fields fall back to the clinic.</Notice>
      <section className="card"><h2 className="font-display text-lg font-semibold">Academy</h2><div className="mt-4 grid gap-4 md:grid-cols-2">{ACADEMY_FIELDS.map((f) => input(f))}</div></section>
      <section className="card"><h2 className="font-display text-lg font-semibold">Clinic (separate from the academy)</h2><div className="mt-4 grid gap-4 md:grid-cols-2">{CLINIC_FIELDS.map((f) => input(f))}</div></section>
      <section className="card"><h2 className="font-display text-lg font-semibold">Social links</h2><div className="mt-4 grid gap-4 md:grid-cols-2">{SOCIAL_FIELDS.map((f) => input(f, false))}</div></section>
      <Button className="btn-primary" loading={busy} onClick={save}>Save settings</Button>
    </div>
  );
}

function Branches() {
  const { busy, run } = useAction();
  const [edit, setEdit] = useState<Partial<Branch> | null>(null);
  const { data, loading, error, reload } = useQuery(() => backend.select<Branch>('branches', { order: ['name'] }), []);
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorNote message={error ?? 'Could not load branches'} />;
  const save = async () => {
    if (!edit?.name?.trim()) return;
    const ok = await run(async () => {
      const row = { name: edit.name!.trim(), city: edit.city || null, address: edit.address || null, maps_url: edit.maps_url || null, phone: edit.phone || null, hours: edit.hours || null, is_active: edit.is_active ?? true };
      edit.id ? await backend.update('branches', { id: edit.id }, row) : await backend.insert('branches', row);
    }, 'Branch saved');
    if (ok) { setEdit(null); reload(); }
  };
  const set = (k: keyof Branch, val: string | boolean) => setEdit({ ...edit, [k]: val });
  return (
    <>
      <div className="mb-4 flex justify-end"><button className="btn-primary" onClick={() => setEdit({ is_active: true })}>Add branch</button></div>
      <Table>
        <thead><tr><th className="th">Branch</th><th className="th">Address</th><th className="th">Phone</th><th className="th">Status</th><th className="th"><span className="sr-only">Actions</span></th></tr></thead>
        <tbody className="divide-y divide-navy/5">{data.map((b) => <tr key={b.id}><td className="td font-medium">{b.name}</td><td className="td">{b.address}</td><td className="td">{b.phone}</td><td className="td">{b.is_active ? 'Active' : 'Inactive'}</td><td className="td text-right"><button className="font-semibold text-teal" onClick={() => setEdit(b)} aria-label={`Edit ${b.name}`}>Edit</button></td></tr>)}</tbody>
      </Table>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit branch' : 'Add branch'}>
        <div className="space-y-4">
          <Field label="Name" required><input className="input" value={edit?.name ?? ''} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label="City"><input className="input" value={edit?.city ?? ''} onChange={(e) => set('city', e.target.value)} /></Field>
          <Field label="Address"><input className="input" value={edit?.address ?? ''} onChange={(e) => set('address', e.target.value)} /></Field>
          <Field label="Google Maps link"><input className="input" value={edit?.maps_url ?? ''} onChange={(e) => set('maps_url', e.target.value)} /></Field>
          <Field label="Phone"><input className="input" value={edit?.phone ?? ''} onChange={(e) => set('phone', e.target.value)} /></Field>
          <Field label="Hours"><input className="input" value={edit?.hours ?? ''} onChange={(e) => set('hours', e.target.value)} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-teal" checked={edit?.is_active ?? true} onChange={(e) => set('is_active', e.target.checked)} />Active</label>
          <div className="flex justify-end gap-2"><button className="btn-outline" onClick={() => setEdit(null)}>Cancel</button><Button className="btn-primary" loading={busy} onClick={save}>Save</Button></div>
        </div>
      </Modal>
    </>
  );
}

function Trainers() {
  const { busy, run } = useAction();
  const toast = useToast();
  const [edit, setEdit] = useState<Partial<TrainerProfile> | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const { data, loading, error, reload } = useQuery(() => backend.select<TrainerProfile>('trainer_profiles', { order: ['sort_order'] }), []);
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorNote message={error ?? 'Could not load profiles'} />;
  const set = (k: keyof TrainerProfile, val: string | boolean | number | null) => setEdit({ ...edit, [k]: val });
  const save = async () => {
    if (!edit?.full_name?.trim()) return;
    if (file && !/^image\/(jpeg|png|webp)$/.test(file.type)) { toast('Photo must be a JPG, PNG or WebP image', 'err'); return; }
    if (file && file.size > 3 * 1024 * 1024) { toast('Photo must be under 3 MB', 'err'); return; }
    const ok = await run(async () => {
      let photo_path = edit.photo_path ?? null;
      if (file) photo_path = await backend.storage.upload('trainer-photos', `${crypto.randomUUID()}-${file.name.replace(/[^a-z0-9._-]/gi, '_')}`, file);
      const row = { full_name: edit.full_name!.trim(), title: edit.title || null, qualification: edit.qualification || null, specialisation: edit.specialisation || null, bio: edit.bio || null, photo_url: edit.photo_url || null, photo_path, is_medical_advisor: !!edit.is_medical_advisor, sort_order: Number(edit.sort_order ?? 100), is_published: edit.is_published ?? false, needs_confirmation: !!edit.needs_confirmation };
      edit.id ? await backend.update('trainer_profiles', { id: edit.id }, row) : await backend.insert('trainer_profiles', row);
    }, 'Profile saved');
    if (ok) { setEdit(null); setFile(null); reload(); }
  };
  return (
    <>
      <Notice title="Photos and details">Only add photos and details the person has agreed to publish. Use an uploaded photo, or a link to a photo already published on the clinic site. Without a photo, initials are shown.</Notice>
      <div className="my-4 flex justify-end"><button className="btn-primary" onClick={() => { setFile(null); setEdit({ is_published: false, sort_order: 100 }); }}>Add profile</button></div>
      {data.length === 0 ? <p className="text-sm text-navy/65">No profiles yet.</p> : (
        <ul className="grid gap-4 md:grid-cols-2">
          {data.map((t) => (
            <li key={t.id} className="card flex gap-4 !p-4">
              <TrainerPhoto t={t} className="h-16 w-16 shrink-0 text-xl" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{t.full_name}</p><p className="text-xs text-navy/65">{[t.title, t.qualification].filter(Boolean).join(' · ')}</p>
                <div className="mt-2 flex flex-wrap gap-1.5"><Badge tone={t.is_published ? 'green' : 'gold'}>{t.is_published ? 'Published' : 'Hidden'}</Badge>{t.is_medical_advisor && <Badge tone="blue">Medical advisor</Badge>}{t.needs_confirmation && <Badge tone="gold">Needs confirmation</Badge>}</div>
                <button className="mt-2 text-sm font-semibold text-teal" onClick={() => { setFile(null); setEdit(t); }} aria-label={`Edit ${t.full_name}`}>Edit</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Modal wide open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit profile' : 'Add profile'}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" required><input className="input" value={edit?.full_name ?? ''} onChange={(e) => set('full_name', e.target.value)} /></Field>
          <Field label="Title"><input className="input" value={edit?.title ?? ''} onChange={(e) => set('title', e.target.value)} /></Field>
          <Field label="Qualification"><input className="input" value={edit?.qualification ?? ''} onChange={(e) => set('qualification', e.target.value)} /></Field>
          <Field label="Specialisation"><input className="input" value={edit?.specialisation ?? ''} onChange={(e) => set('specialisation', e.target.value)} /></Field>
          <div className="sm:col-span-2"><Field label="Bio"><textarea className="input min-h-24" value={edit?.bio ?? ''} onChange={(e) => set('bio', e.target.value)} /></Field></div>
          <Field label="Upload photo" hint="JPG, PNG or WebP, up to 3 MB."><input type="file" accept="image/jpeg,image/png,image/webp" className="input" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field>
          <Field label="Or published photo link (https)"><input className="input" value={edit?.photo_url ?? ''} onChange={(e) => set('photo_url', e.target.value)} /></Field>
          <Field label="Display order"><input type="number" className="input" value={edit?.sort_order ?? 100} onChange={(e) => set('sort_order', Number(e.target.value))} /></Field>
          <div className="space-y-2 pt-6 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" className="accent-teal" checked={!!edit?.is_published} onChange={(e) => set('is_published', e.target.checked)} />Show on public site</label>
            <label className="flex items-center gap-2"><input type="checkbox" className="accent-teal" checked={!!edit?.is_medical_advisor} onChange={(e) => set('is_medical_advisor', e.target.checked)} />Medical advisor</label>
            <label className="flex items-center gap-2"><input type="checkbox" className="accent-teal" checked={!!edit?.needs_confirmation} onChange={(e) => set('needs_confirmation', e.target.checked)} />Needs VTIARA confirmation</label>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2"><button className="btn-outline" onClick={() => setEdit(null)}>Cancel</button><Button className="btn-primary" loading={busy} onClick={save}>Save</Button></div>
      </Modal>
    </>
  );
}

function Stories() {
  const { busy, run } = useAction();
  const [edit, setEdit] = useState<Partial<Testimonial> | null>(null);
  const { data, loading, error, reload } = useQuery(async () => ({ t: await backend.select<Testimonial>('testimonials', { order: ['sort_order'] }), c: await backend.select<Course>('courses', {}) }), []);
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorNote message={error ?? 'Could not load stories'} />;
  const set = (k: keyof Testimonial, val: string | boolean | number | null) => setEdit({ ...edit, [k]: val });
  const save = async () => {
    if (!edit?.author_name?.trim() || !edit.quote?.trim()) return;
    const ok = await run(async () => {
      const published = !!edit.is_published && !!edit.consent_confirmed;
      const row = { author_name: edit.author_name!.trim(), author_role: edit.author_role || null, course_id: edit.course_id || null, quote: edit.quote!.trim(), consent_confirmed: !!edit.consent_confirmed, is_published: published, sort_order: Number(edit.sort_order ?? 100) };
      edit.id ? await backend.update('testimonials', { id: edit.id }, row) : await backend.insert('testimonials', row);
    }, 'Story saved');
    if (ok) { setEdit(null); reload(); }
  };
  return (
    <>
      <Notice title="Only publish real, consented stories">Add a learner's words only with their permission. Do not include patient information or medical claims. A story is shown publicly only when it is published and consent is confirmed.</Notice>
      <div className="my-4 flex justify-end"><button className="btn-primary" onClick={() => setEdit({ sort_order: 100 })}>Add story</button></div>
      {data.t.length === 0 ? <p className="text-sm text-navy/65">No stories yet. The public site hides this section until one is published.</p> : (
        <Table>
          <thead><tr><th className="th">Name</th><th className="th">Quote</th><th className="th">Status</th><th className="th"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody className="divide-y divide-navy/5">{data.t.map((t) => <tr key={t.id}><td className="td font-medium">{t.author_name}</td><td className="td max-w-md truncate">{t.quote}</td><td className="td">{t.is_published ? <Badge tone="green">Published</Badge> : <Badge tone="gold">Hidden</Badge>}</td><td className="td text-right"><button className="font-semibold text-teal" onClick={() => setEdit(t)} aria-label={`Edit story by ${t.author_name}`}>Edit</button></td></tr>)}</tbody>
        </Table>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit story' : 'Add story'}>
        <div className="space-y-4">
          <Field label="Name" required><input className="input" value={edit?.author_name ?? ''} onChange={(e) => set('author_name', e.target.value)} /></Field>
          <Field label="Role or course"><input className="input" value={edit?.author_role ?? ''} onChange={(e) => set('author_role', e.target.value)} /></Field>
          <Field label="Quote" required><textarea className="input min-h-24" value={edit?.quote ?? ''} onChange={(e) => set('quote', e.target.value)} /></Field>
          <Field label="Related course"><select className="input" value={edit?.course_id ?? ''} onChange={(e) => set('course_id', e.target.value || null)}><option value="">None</option>{data.c.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-teal" checked={!!edit?.consent_confirmed} onChange={(e) => set('consent_confirmed', e.target.checked)} />The person has agreed to this being published</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-teal" checked={!!edit?.is_published} disabled={!edit?.consent_confirmed} onChange={(e) => set('is_published', e.target.checked)} />Show on public site</label>
          <div className="flex justify-end gap-2"><button className="btn-outline" onClick={() => setEdit(null)}>Cancel</button><Button className="btn-primary" loading={busy} onClick={save}>Save</Button></div>
        </div>
      </Modal>
    </>
  );
}
