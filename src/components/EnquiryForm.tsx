import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { backend, useQuery } from '@/lib/db';
import { Button, Field, useToast } from './ui';
import { useSettings } from '@/lib/settings';
import type { Course } from '@/lib/types';

type Errors = Partial<Record<'name' | 'phone' | 'email' | 'consent' | 'form', string>>;

export default function EnquiryForm({ initialCourse = '', intent = 'general' }: { initialCourse?: string; intent?: 'general' | 'counselling_call' | 'course' }) {
  const toast = useToast();
  const { contact } = useSettings();
  const { data: courses } = useQuery(() => backend.select<Course>('courses', { order: ['sort_order'] }), []);
  const [v, setV] = useState({ name: '', phone: '', email: '', course: initialCourse, contact: 'whatsapp', message: '', consent: false, website: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((x) => ({ ...x, [k]: val }));

  const validate = (): Errors => {
    const e: Errors = {};
    if (v.name.trim().length < 2) e.name = 'Please enter your name.';
    if (v.phone.replace(/\D/g, '').length < 10) e.phone = 'Enter a phone number with at least 10 digits.';
    if (v.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) e.email = 'Enter a valid email address, or leave it blank.';
    if (v.contact === 'email' && !v.email) e.email = 'Add your email so we can reply by email.';
    if (!v.consent) e.consent = 'Please tick this box so we can contact you about your enquiry.';
    return e;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (v.website) { setDone(true); return; } // honeypot: bots fill the hidden field, people never see it
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) { document.getElementById('enquiry-errors')?.focus(); return; }
    setBusy(true);
    try {
      await backend.rpc('submit_enquiry', {
        p_name: v.name.trim(), p_phone: v.phone.trim(), p_email: v.email.trim() || null, p_course: v.course || null,
        p_contact: v.contact, p_type: v.course && intent === 'general' ? 'course' : intent, p_message: v.message.trim() || null, p_consent: v.consent,
      });
      setDone(true); toast('Enquiry sent. We will be in touch soon.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again or contact us on WhatsApp.';
      setErrors({ form: msg }); toast(msg, 'err');
    } finally { setBusy(false); }
  };

  if (done) {
    return (
      <div className="card text-center" role="status">
        <CheckCircle2 className="mx-auto h-10 w-10 text-teal" aria-hidden />
        <h3 className="mt-3 font-display text-xl font-semibold">Thank you, we have your enquiry</h3>
        <p className="mt-1 text-sm text-navy/70">A member of the academy team will contact you{contact.hours ? ` (our hours: ${contact.hours})` : ''}. For anything urgent, use WhatsApp or call us.</p>
      </div>
    );
  }
  const errList = Object.entries(errors).filter(([, m]) => m);
  return (
    <form onSubmit={submit} noValidate className="card space-y-4" aria-label="Academy enquiry form">
      <div id="enquiry-errors" tabIndex={-1} className="outline-none" role={errList.length ? 'alert' : undefined}>
        {errList.length > 0 && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{errors.form ?? 'Please fix the highlighted fields.'}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" error={errors.name} required><input className="input" autoComplete="name" value={v.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Phone number" error={errors.phone} required hint="We will use this to reach you."><input className="input" type="tel" inputMode="tel" autoComplete="tel" value={v.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
        <Field label="Email (optional)" error={errors.email}><input className="input" type="email" autoComplete="email" value={v.email} onChange={(e) => set('email', e.target.value)} /></Field>
        <Field label="Course of interest">
          <select className="input" value={v.course} onChange={(e) => set('course', e.target.value)}>
            <option value="">Not sure yet</option>
            {(courses ?? []).filter((c) => ['published', 'coming_soon'].includes(c.status)).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </Field>
      </div>
      <fieldset>
        <legend className="label">Preferred way to be contacted</legend>
        <div className="flex flex-wrap gap-4 text-sm">
          {([['whatsapp', 'WhatsApp'], ['phone', 'Phone call'], ['email', 'Email']] as const).map(([k, l]) => (
            <label key={k} className="inline-flex items-center gap-2"><input type="radio" name="contact" value={k} checked={v.contact === k} onChange={() => set('contact', k)} className="h-4 w-4 text-teal" />{l}</label>
          ))}
        </div>
      </fieldset>
      <Field label="Message (optional)"><textarea className="input min-h-24" maxLength={2000} value={v.message} onChange={(e) => set('message', e.target.value)} /></Field>
      <div className="absolute -left-[9999px]" aria-hidden><label>Website<input tabIndex={-1} autoComplete="off" value={v.website} onChange={(e) => set('website', e.target.value)} /></label></div>
      <div>
        <label className="flex items-start gap-2.5 text-sm">
          <input type="checkbox" className="mt-1 h-4 w-4 rounded border-navy/30 text-teal" checked={v.consent} onChange={(e) => set('consent', e.target.checked)} aria-invalid={errors.consent ? true : undefined} aria-describedby={errors.consent ? 'consent-err' : undefined} />
          <span>I agree that VTIARA Training Academy may contact me about this enquiry. We use your details only to respond to you.</span>
        </label>
        {errors.consent && <p id="consent-err" className="mt-1 text-xs text-red-700">{errors.consent}</p>}
      </div>
      <Button className="btn-primary w-full sm:w-auto" loading={busy}>Send enquiry</Button>
    </form>
  );
}
