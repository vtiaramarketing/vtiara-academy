import { Link } from 'react-router-dom';
import { CalendarDays, ClipboardCheck, GraduationCap, Users } from 'lucide-react';
import { usePortalBase } from '@/lib/portal';
import { useAuth } from '@/lib/auth';
import { backend, useQuery } from '@/lib/db';
import { Badge, Empty, ErrorNote, PageHeader, Spinner, Stat } from '@/components/ui';
import { enrolBadge, fmtDate, fmtTime } from '@/lib/utils';
import type { BatchAvailability, Booking, Course, Enrolment, PracticalAssessment, Profile } from '@/lib/types';

export default function TrainerDashboard() {
  const base = usePortalBase();
  const { user } = useAuth();
  const { data, loading, error } = useQuery(async () => {
    const [batches, bookings, courses, profiles, enrols, practicals] = await Promise.all([
      backend.select<BatchAvailability>('v_batch_availability', { eq: { trainer_id: user!.id }, order: ['starts_on'] }),
      backend.select<Booking>('batch_bookings'), backend.select<Course>('courses'), backend.select<Profile>('profiles'),
      backend.select<Enrolment>('course_enrolments'), backend.select<PracticalAssessment>('practical_assessments'),
    ]);
    return { batches, bookings, courses, profiles, enrols, practicals };
  }, [user?.id]);
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorNote message={error ?? 'Could not load your dashboard'} />;
  const { batches, bookings, courses, profiles, enrols, practicals } = data;
  const mine = new Set(batches.map((b) => b.id));
  const myBookings = bookings.filter((b) => mine.has(b.batch_id) && b.status !== 'cancelled');
  const learnerIds = [...new Set(myBookings.map((b) => b.user_id))];
  const myCourses = courses.filter((c) => batches.some((b) => b.course_id === c.id));
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = batches.filter((b) => b.starts_on >= today);
  const pending = practicals.filter((p) => learnerIds.includes(p.learner_id) && p.result === 'passed' && p.approval_status === 'pending');
  const name = (id: string) => profiles.find((p) => p.id === id)?.full_name ?? 'Learner';
  const title = (id: string) => courses.find((c) => c.id === id)?.title ?? '';
  return (
    <>
      <PageHeader title="Trainer dashboard" subtitle="Your assigned batches, learners and the actions waiting for you." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Assigned courses" value={myCourses.length} icon={<GraduationCap className="h-5 w-5" />} />
        <Stat label="Upcoming batches" value={upcoming.length} icon={<CalendarDays className="h-5 w-5" />} />
        <Stat label="My learners" value={learnerIds.length} icon={<Users className="h-5 w-5" />} />
        <Stat label="Practicals to approve" value={pending.length} tone="gold" icon={<ClipboardCheck className="h-5 w-5" />} />
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="card">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">My batches</h2><Link to={`${base}/batches`} className="text-sm font-semibold text-teal">Rosters and attendance</Link></div>
          {batches.length === 0 ? <Empty title="No batches assigned yet">An admin assigns trainers to batches.</Empty> : <ul className="divide-y divide-navy/5">{batches.map((b) => <li key={b.id} className="flex items-center justify-between gap-3 py-2.5 text-sm"><span className="min-w-0"><strong>{b.title}</strong><span className="block text-xs text-navy/55">{title(b.course_id)} · {fmtDate(b.starts_on)} · {fmtTime(b.start_time)}</span></span><Badge tone={b.starts_on < today ? 'slate' : 'green'}>{b.seats_taken}/{b.capacity}</Badge></li>)}</ul>}
        </div>
        <div className="card">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Practical actions</h2><Link to={`${base}/practicals`} className="text-sm font-semibold text-teal">All reviews</Link></div>
          {pending.length === 0 ? <p className="text-sm text-navy/55">Nothing waiting for approval.</p> : <ul className="divide-y divide-navy/5">{pending.map((p) => <li key={p.id} className="flex items-center justify-between py-2.5 text-sm"><strong>{name(p.learner_id)}</strong><Link className="btn-outline btn-sm" to={`${base}/practicals/${p.enrolment_id}`}>Review</Link></li>)}</ul>}
        </div>
        <div className="card lg:col-span-2">
          <h2 className="mb-3 font-semibold">Learners in my batches</h2>
          {learnerIds.length === 0 ? <p className="text-sm text-navy/55">No learners have booked your batches yet.</p> : <ul className="divide-y divide-navy/5">{learnerIds.map((id) => { const e = enrols.filter((x) => x.user_id === id && myCourses.some((c) => c.id === x.course_id))[0]; return <li key={id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"><span><strong>{name(id)}</strong>{e && <span className="ml-2 text-xs text-navy/55">{title(e.course_id)}</span>}</span><span className="flex items-center gap-3">{e && <Badge tone={enrolBadge(e).tone}>{enrolBadge(e).label}</Badge>}{e && <Link className="font-semibold text-teal" to={`${base}/practicals/${e.id}`}>Practical</Link>}</span></li>; })}</ul>}
        </div>
      </div>
    </>
  );
}
