import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Backpack, CalendarCheck, CalendarDays, CheckCircle2, ClipboardList, MapPin, UserRound, Users, X } from 'lucide-react';
import { backend } from '@/lib/db';
import { useLearnerData } from '@/lib/learner';
import { Badge, Button, Disclaimer, Empty, ErrorNote, Modal, Notice, PageHeader, Spinner, useAction } from '@/components/ui';
import { MODE_LABEL, MODE_SHORT, cn, fmtDate, fmtTime } from '@/lib/utils';
import type { BatchAvailability } from '@/lib/types';

export default function Bookings() {
  const { data: d, loading, error, reload } = useLearnerData();
  const [sp] = useSearchParams();
  const [courseSlug, setCourseSlug] = useState(sp.get('course') ?? '');
  const [branch, setBranch] = useState('');
  const [trainer, setTrainer] = useState('');
  const [from, setFrom] = useState('');
  const [slot, setSlot] = useState('');
  const [mode, setMode] = useState('');
  const [confirmed, setConfirmed] = useState<{ batch: BatchAvailability; status: string } | null>(null);
  const { busy, run } = useAction();

  const enrolled = useMemo(() => (d ? d.enrolments.map((e) => d.courses.find((c) => c.id === e.course_id)!).filter((c) => c.requires_attendance || c.learning_modes.includes('academy')) : []), [d]);
  if (loading) return <Spinner />;
  if (error || !d) return <ErrorNote message={error ?? 'Could not load bookings'} />;

  const today = new Date().toISOString().slice(0, 10);
  const course = enrolled.find((c) => c.slug === courseSlug);
  const myBookings = d.bookings.filter((b) => b.status !== 'cancelled').map((b) => ({ b, batch: d.batches.find((x) => x.id === b.batch_id)! })).filter((x) => x.batch).sort((a, z) => z.batch.starts_on.localeCompare(a.batch.starts_on));
  const bookedIds = new Set(myBookings.filter((x) => ['booked', 'waitlist', 'attended'].includes(x.b.status)).map((x) => x.b.batch_id));

  const available = d.batches.filter((b) =>
    b.status !== 'cancelled' && b.status !== 'completed' && b.starts_on >= today &&
    (!course ? enrolled.some((c) => c.id === b.course_id) : b.course_id === course.id) &&
    (!branch || b.branch_id === branch) && (!trainer || b.trainer_id === trainer) && (!from || b.starts_on >= from) &&
    (!mode || b.mode === mode) &&
    (!slot || (slot === 'am' ? b.start_time < '12:00' : b.start_time >= '12:00')));

  const branches = [...new Map(d.batches.map((b) => [b.branch_id, b.branch_name])).entries()].filter(([k]) => k);
  const trainers = [...new Map(d.batches.map((b) => [b.trainer_id, b.trainer_name])).entries()].filter(([k]) => k);

  const book = async (b: BatchAvailability) => {
    let status = '';
    const ok = await run(async () => { status = await backend.rpc('book_batch', { p_batch: b.id }); });
    if (ok) { setConfirmed({ batch: b, status }); reload(); }
  };
  const cancel = (batchId: string) => run(async () => { await backend.rpc('cancel_booking', { p_batch: batchId }); reload(); }, 'Booking cancelled');

  return (
    <>
      <PageHeader eyebrow="Academy" title="Academy sessions" subtitle="Book your in-person sessions and supervised practice. Your trainer marks attendance on the day." />

      {enrolled.length === 0 && <Empty title="No academy sessions needed yet" action={<Link to="/courses" className="btn-primary">Browse courses</Link>}>Enrol in a course that includes academy attendance to book a session.</Empty>}

      {enrolled.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <section className="space-y-4">
            <div className="card">
              <h2 className="mb-4 font-display text-xl font-semibold">Find a batch</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <label className="col-span-2 sm:col-span-3"><span className="label">Course</span><select className="input" value={courseSlug} onChange={(e) => setCourseSlug(e.target.value)}><option value="">All my courses</option>{enrolled.map((c) => <option key={c.id} value={c.slug}>{c.title}</option>)}</select></label>
                <label><span className="label">Branch</span><select className="input" value={branch} onChange={(e) => setBranch(e.target.value)}><option value="">Any</option>{branches.map(([k, n]) => <option key={k!} value={k!}>{n}</option>)}</select></label>
                <label><span className="label">Trainer</span><select className="input" value={trainer} onChange={(e) => setTrainer(e.target.value)}><option value="">Any</option>{trainers.map(([k, n]) => <option key={k!} value={k!}>{n}</option>)}</select></label>
                <label><span className="label">Mode</span><select className="input" value={mode} onChange={(e) => setMode(e.target.value)}><option value="">Any</option>{Object.entries(MODE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
                <label><span className="label">From date</span><input type="date" className="input" min={today} value={from} onChange={(e) => setFrom(e.target.value)} /></label>
                <label><span className="label">Time</span><select className="input" value={slot} onChange={(e) => setSlot(e.target.value)}><option value="">Any</option><option value="am">Morning</option><option value="pm">Afternoon</option></select></label>
              </div>
            </div>

            {available.length === 0 ? <Empty title="No upcoming batches match" action={<button className="btn-outline" onClick={() => { setBranch(''); setTrainer(''); setFrom(''); setSlot(''); setMode(''); setCourseSlug(''); }}>Clear filters</button>}>Try other dates, or contact the academy to request a batch.</Empty> : available.map((b) => {
              const left = b.capacity - b.seats_taken;
              const already = bookedIds.has(b.id);
              const c = d.courses.find((x) => x.id === b.course_id)!;
              return (
                <article key={b.id} className="card !p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><p className="text-xs font-semibold uppercase tracking-wide text-accent">{c.title}</p><h3 className="mt-0.5 font-semibold">{b.title}</h3></div>
                    <Badge tone={left > 0 ? 'green' : 'gold'}><Users className="h-3 w-3" />{left > 0 ? `${left} of ${b.capacity} seats left` : `Full · ${b.waitlist_count} waiting`}</Badge>
                  </div>
                  <dl className="mt-3 grid gap-2 text-sm text-navy/70 sm:grid-cols-2">
                    <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-accent" />{fmtDate(b.starts_on)}</div>
                    <div className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-accent" />{fmtTime(b.start_time)} – {fmtTime(b.end_time)} · {MODE_SHORT[b.mode]}</div>
                    <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-accent" />{b.branch_name}</div>
                    <div className="flex items-center gap-2"><UserRound className="h-4 w-4 text-accent" />{b.trainer_name ?? 'Trainer to be assigned'}</div>
                  </dl>
                  <div className="mt-4">{already ? <Badge tone="teal"><CheckCircle2 className="h-3 w-3" />You are booked</Badge> : <Button className={left > 0 ? 'btn-primary btn-sm' : 'btn-outline btn-sm'} loading={busy} onClick={() => book(b)}>{left > 0 ? 'Book this batch' : 'Join waitlist'}</Button>}</div>
                </article>
              );
            })}
          </section>

          <section className="space-y-4">
            <div className="card">
              <h2 className="mb-4 font-display text-xl font-semibold">My bookings</h2>
              {myBookings.length === 0 ? <p className="text-sm text-navy/60">You have no bookings yet.</p> : (
                <ul className="space-y-3">
                  {myBookings.map(({ b, batch }) => (
                    <li key={b.id} className="rounded-xl border border-navy/10 p-4 text-sm">
                      <div className="flex items-start justify-between gap-2"><p className="font-semibold">{batch.title}</p><Badge tone={b.status === 'attended' ? 'green' : b.status === 'no_show' ? 'red' : b.status === 'waitlist' ? 'gold' : 'teal'}>{b.status === 'no_show' ? 'Missed' : b.status.charAt(0).toUpperCase() + b.status.slice(1)}</Badge></div>
                      <p className="mt-1 text-navy/65">{fmtDate(batch.starts_on)} · {fmtTime(batch.start_time)} · {batch.branch_name}</p>
                      {['booked', 'waitlist'].includes(b.status) && batch.starts_on >= today && <button onClick={() => cancel(batch.id)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline"><X className="h-3 w-3" />Cancel booking</button>}
                      {b.status === 'no_show' && <p className="mt-2 text-xs text-red-700">You missed this session. Please book another batch to complete attendance.</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Notice title="Attendance rules">Courses that require attendance need 100% attendance, marked in person by your trainer. A no-show must be rebooked.</Notice>
            <Disclaimer />
          </section>
        </div>
      )}

      <Modal open={!!confirmed} onClose={() => setConfirmed(null)} title={confirmed?.status === 'waitlist' ? 'You are on the waitlist' : 'Booking confirmed'}>
        {confirmed && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-emerald-900"><CalendarCheck className="h-6 w-6" /><div><p className="font-semibold">{confirmed.batch.title}</p><p>{fmtDate(confirmed.batch.starts_on)} · {fmtTime(confirmed.batch.start_time)} – {fmtTime(confirmed.batch.end_time)}</p></div></div>
            {confirmed.status === 'waitlist' && <Notice tone="gold">This batch is full. We will move you in automatically if a seat opens and notify you.</Notice>}
            <div><p className="flex items-center gap-2 font-semibold"><MapPin className="h-4 w-4 text-accent" />Location</p><p className="ml-6 text-navy/70">{confirmed.batch.location ?? confirmed.batch.branch_name}</p></div>
            <div><p className="flex items-center gap-2 font-semibold"><UserRound className="h-4 w-4 text-accent" />Trainer</p><p className="ml-6 text-navy/70">{confirmed.batch.trainer_name ?? 'To be assigned'}</p></div>
            <div><p className="flex items-center gap-2 font-semibold"><ClipboardList className="h-4 w-4 text-accent" />Attendance requirements</p><p className="ml-6 text-navy/70">Arrive 15 minutes early. Your trainer marks attendance in person. {confirmed.batch.practical_requirements}</p></div>
            <div><p className="flex items-center gap-2 font-semibold"><Backpack className="h-4 w-4 text-accent" />What to bring</p><p className="ml-6 text-navy/70">{confirmed.batch.what_to_bring}</p></div>
            <div className="flex justify-end"><button className={cn('btn-primary')} onClick={() => setConfirmed(null)}>Done</button></div>
          </div>
        )}
      </Modal>
    </>
  );
}
