import { Link } from 'react-router-dom';
import { Award, CalendarDays, ClipboardCheck, GraduationCap, Users } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { backend, useQuery } from '@/lib/db';
import { Badge, Button, Empty, ErrorNote, PageHeader, Spinner, Stat, useAction, useToast } from '@/components/ui';
import { fmtDate, fmtTime, STATUS_LABEL, STATUS_TONE } from '@/lib/utils';
import TrainerDashboard from './TrainerDashboard';
import type { BatchAvailability, Certificate, Course, Enquiry, Enrolment, PracticalAssessment, Profile } from '@/lib/types';

export default function AdminDashboard() {
  const { isAdmin } = useAuth();
  return isAdmin ? <AdminOverview /> : <TrainerDashboard />;
}

function AdminOverview() {
  const { user, isAdmin } = useAuth();
  const { busy, run } = useAction();
  const toast = useToast();
  const { data, loading, error, reload } = useQuery(async () => {
    await backend.rpc('sync_certificate_statuses').catch(() => {});
    const [enquiries, enrols, certs, batches, practicals, courses, profiles] = await Promise.all([
      isAdmin ? backend.select<Enquiry>('enquiries') : Promise.resolve([] as Enquiry[]),
      backend.select<Enrolment>('course_enrolments'), backend.select<Certificate>('certificates'),
      backend.select<BatchAvailability>('v_batch_availability', { order: ['starts_on'] }),
      backend.select<PracticalAssessment>('practical_assessments'), backend.select<Course>('courses'), backend.select<Profile>('profiles'),
    ]);
    return { enquiries, enrols, certs, batches, practicals, courses, profiles };
  }, []);
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorNote message={error ?? 'Could not load dashboard'} />;
  const { enquiries, enrols, certs, batches, practicals, courses, profiles } = data;
  const soon = certs.filter((c) => c.status === 'valid' && c.valid_until && Date.parse(c.valid_until) - Date.now() <= (courses.find((x) => x.id === c.course_id)?.expiry_reminder_days ?? 30) * 864e5).sort((a, z) => (a.valid_until ?? '').localeCompare(z.valid_until ?? ''));
  const remind = async () => { let n = 0; const ok = await run(async () => { n = Number(await backend.rpc<number>('send_certificate_expiry_reminders')) || 0; }); if (ok) { toast(n ? `${n} reminder${n === 1 ? '' : 's'} sent` : 'No new reminders were due'); reload(); } };
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = batches.filter((b) => b.starts_on >= today && b.status !== 'cancelled').slice(0, 5);
  const pending = practicals.filter((p) => p.result === 'passed' && p.approval_status === 'pending');
  const waiting = enrols.filter((e) => ['assessment_unlocked', 'awaiting_approval'].includes(e.status));
  const nameOf = (id: string) => profiles.find((p) => p.id === id)?.full_name ?? 'Learner';
  const courseOf = (id: string) => courses.find((c) => c.id === id)?.title ?? '';
  return (
    <>
      <PageHeader title={`Welcome, ${user?.profile?.full_name.split(' ')[0] ?? ''}`} subtitle={isAdmin ? 'Academy overview' : 'Your trainer overview'} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={isAdmin ? 'Learners' : 'My learners'} value={profiles.filter((p) => p.id !== user?.id).length} icon={<Users className="h-5 w-5" />} />
        <Stat label="Active enrolments" value={enrols.filter((e) => e.status !== 'certified').length} icon={<GraduationCap className="h-5 w-5" />} />
        <Stat label="Awaiting your approval" value={pending.length} tone="gold" icon={<ClipboardCheck className="h-5 w-5" />} />
        <Stat label="Valid certificates" value={certs.filter((c) => c.status === 'valid').length} tone="gold" icon={<Award className="h-5 w-5" />} />
      </div>
      {isAdmin && enquiries.some((e) => e.status === 'new') && (
        <Link to="/admin/enquiries" className="mt-4 flex items-center justify-between rounded-2xl border border-teal/30 bg-white p-4 text-sm shadow-card hover:border-teal"><span><strong>{enquiries.filter((e) => e.status === 'new').length} new enquir{enquiries.filter((e) => e.status === 'new').length === 1 ? 'y' : 'ies'}</strong> waiting for a reply</span><span className="font-semibold text-teal">Open →</span></Link>
      )}
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="card">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Practical approvals</h2><Link to="/admin/practicals" className="text-sm font-semibold text-teal">Open</Link></div>
          {pending.length === 0 ? <p className="text-sm text-navy/55">Nothing waiting for approval.</p> : <ul className="divide-y divide-navy/5">{pending.slice(0, 6).map((p) => { const e = enrols.find((x) => x.id === p.enrolment_id); return <li key={p.id} className="flex items-center justify-between py-2.5 text-sm"><span><strong>{nameOf(p.learner_id)}</strong><span className="block text-xs text-navy/55">{e ? courseOf(e.course_id) : ''}</span></span><Link className="btn-outline btn-sm" to={`/admin/practicals/${p.enrolment_id}`}>Review</Link></li>; })}</ul>}
        </div>
        <div className="card">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Upcoming batches</h2><Link to="/admin/batches" className="text-sm font-semibold text-teal">All batches</Link></div>
          {upcoming.length === 0 ? <p className="text-sm text-navy/55">No upcoming batches.</p> : <ul className="divide-y divide-navy/5">{upcoming.map((b) => <li key={b.id} className="flex items-center justify-between gap-3 py-2.5 text-sm"><span className="min-w-0"><CalendarDays className="mr-1.5 inline h-4 w-4 text-teal" /><strong>{b.title}</strong><span className="block text-xs text-navy/55">{fmtDate(b.starts_on)} · {fmtTime(b.start_time)} · {b.branch_name}</span></span><Badge tone={b.seats_taken >= b.capacity ? 'red' : 'green'}>{b.seats_taken}/{b.capacity}</Badge></li>)}</ul>}
        </div>
        {isAdmin && (
          <div className="card lg:col-span-2">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Certificates expiring soon</h2><Button className="btn-outline btn-sm" loading={busy} onClick={remind}>Send expiry reminders</Button></div>
            {soon.length === 0 ? <p className="text-sm text-navy/55">No certificates are close to expiry.</p> : <ul className="divide-y divide-navy/5">{soon.slice(0, 8).map((c) => <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"><span><strong>{c.learner_name}</strong> · {c.course_title}</span><Badge tone="gold">Expires {fmtDate(c.valid_until)}</Badge></li>)}</ul>}
          </div>
        )}
        <div className="card lg:col-span-2">
          <h2 className="mb-3 font-semibold">Learners ready for the next step</h2>
          {waiting.length === 0 ? <Empty title="No one waiting" /> : <ul className="divide-y divide-navy/5">{waiting.slice(0, 8).map((e) => <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"><span><strong>{nameOf(e.user_id)}</strong> · {courseOf(e.course_id)}</span><span className="flex items-center gap-3"><Badge tone={STATUS_TONE[e.status]}>{STATUS_LABEL[e.status]}</Badge><Link className="font-semibold text-teal" to={`/admin/practicals/${e.id}`}>Practical</Link></span></li>)}</ul>}
        </div>
      </div>
    </>
  );
}
