import { Link, useNavigate, useParams } from 'react-router-dom';
import { Award, CalendarDays, CheckCircle2, ChevronRight, Circle, Clock, Hourglass, PlayCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { backend } from '@/lib/db';
import { firstIncompleteLesson, useLearnerData } from '@/lib/learner';
import { Badge, Disclaimer, Empty, ErrorNote, Notice, ProgressBar, Spinner, useAction } from '@/components/ui';
import { ACCESS_LABEL, ACCESS_NEXT, ACCESS_TONE, MODE_LABEL, STATUS_LABEL, STATUS_TONE, cn, fmtDate, hasAccess, nextAction } from '@/lib/utils';
import type { LearningMode } from '@/lib/types';

type StepState = 'done' | 'current' | 'todo' | 'blocked';

export default function CourseHome() {
  const { slug } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const { data: d, loading, error, reload } = useLearnerData();
  const { busy, run } = useAction();
  if (loading) return <Spinner />;
  if (error || !d) return <ErrorNote message={error ?? 'Could not load course'} />;
  const c = d.courses.find((x) => x.slug === slug);
  const e = c && d.enrolments.find((x) => x.course_id === c.id);
  if (!c) return <Empty title="Course not found" />;
  if (!e) return <Empty title="You are not enrolled in this course" action={<Link to={`/courses/${c.slug}?enrol=1`} className="btn-primary">Enrol now</Link>} />;

  if (!hasAccess(e)) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="card"><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="font-display text-2xl font-semibold">{c.title}</h1><Badge tone={ACCESS_TONE[e.access_status]}>{ACCESS_LABEL[e.access_status]}</Badge></div>
          <p className="mt-3 text-sm text-navy/70">{ACCESS_NEXT[e.access_status]}. Lessons, batch booking and assessments open once an academy admin activates your enrolment. Your request was sent on {fmtDate(e.enrolled_at)}.</p>
          {e.access_status === 'cancelled' && <Link to={`/courses/${c.slug}?enrol=1`} className="btn-primary mt-4">Request enrolment again</Link>}
        </div>
        <Disclaimer />
      </div>
    );
  }
  const a = d.assessments.find((x) => x.course_id === c.id);
  const attempts = d.attempts.filter((t) => a && t.assessment_id === a.id && t.status === 'submitted');
  const best = attempts.reduce((m, t) => Math.max(m, Number(t.score_pct ?? 0)), 0);
  const passed = attempts.some((t) => t.passed);
  const myBatchIds = d.batches.filter((b) => b.course_id === c.id).map((b) => b.id);
  const bookings = d.bookings.filter((b) => myBatchIds.includes(b.batch_id));
  const attended = bookings.some((b) => b.status === 'attended');
  const booked = bookings.find((b) => b.status === 'booked' || b.status === 'waitlist');
  const lists = d.checklists.filter((k) => k.course_id === c.id);
  const pracs = d.practicals.filter((p) => p.enrolment_id === e.id);
  const cert = d.certificates.find((x) => x.course_id === c.id && x.status !== 'revoked') ?? d.certificates.find((x) => x.course_id === c.id);
  const unlocked = ['assessment_unlocked', 'needs_retake'].includes(e.status);

  const steps: { title: string; detail: string; state: StepState; action?: React.ReactNode }[] = [
    { title: 'Recorded lessons', detail: e.mode === 'academy' ? 'Optional for academy learners — useful for revision.' : `${e.progress_pct}% complete`, state: e.progress_pct >= 100 || e.mode === 'academy' ? 'done' : 'current' },
  ];
  if (c.requires_attendance) steps.push({ title: 'Academy session attendance', detail: attended ? 'Attendance marked by your trainer.' : booked ? `Booked — ${fmtDate(d.batches.find((b) => b.id === booked.batch_id)?.starts_on)}${booked.status === 'waitlist' ? ' (waitlist)' : ''}` : 'Book a batch and attend in person (100% attendance required).', state: attended ? 'done' : booked ? 'current' : 'todo', action: !attended && <Link to={`/app/bookings?course=${c.slug}`} className="btn-outline btn-sm">{booked ? 'View booking' : 'Book session'}</Link> });
  steps.push({ title: 'MCQ assessment', detail: a ? (passed ? `Passed — best score ${Math.round(best)}% (pass mark ${a.pass_mark}%)` : attempts.length ? `Best score ${Math.round(best)}% — pass mark ${a.pass_mark}%` : `${a.num_questions} questions · ${a.time_limit_min} min · pass mark ${a.pass_mark}%`) : 'Assessment coming soon', state: passed ? 'done' : unlocked ? 'current' : 'blocked', action: unlocked && <Link to={`/app/assessment/${c.slug}`} className="btn-primary btn-sm">{e.status === 'needs_retake' ? 'Retake test' : 'Start test'}</Link> });
  if (c.requires_practical) steps.push({ title: 'Practical assessment', detail: lists.length ? lists.map((k) => { const p = pracs.find((x) => x.checklist_id === k.id); return `${k.title}: ${p ? (p.result === 'passed' ? 'passed' : 'needs retake') : 'pending'}`; }).join(' · ') : 'Assessed in person by your trainer', state: lists.length && lists.every((k) => pracs.find((p) => p.checklist_id === k.id)?.result === 'passed') ? 'done' : pracs.some((p) => p.result === 'failed') ? 'blocked' : 'todo' });
  if (c.requires_trainer_approval) steps.push({ title: 'Trainer approval', detail: pracs.length && pracs.every((p) => p.approval_status === 'approved') && lists.length <= pracs.length ? 'Approved' : 'Awaiting trainer approval', state: pracs.length && lists.length <= pracs.length && pracs.every((p) => p.approval_status === 'approved') ? 'done' : e.status === 'awaiting_approval' ? 'current' : 'todo' });
  steps.push({ title: 'Certificate', detail: cert ? `${cert.cert_no}` : 'Issued automatically once every requirement above is complete and approved.', state: e.status === 'certified' ? 'done' : 'todo', action: cert && <Link to="/app/certificates" className="btn-outline btn-sm"><Award className="h-3.5 w-3.5" />Open wallet</Link> });

  const feedback = d.feedback.filter((f) => f.enrolment_id === e.id);
  const changeMode = (m: LearningMode) => run(async () => { await backend.rpc('enrol_in_course', { p_course: c.id, p_mode: m }); reload(); }, 'Learning mode updated');
  const goLearn = async () => { const l = await firstIncompleteLesson(c.id, user!.id); nav(l ? `/app/learn/${c.slug}/${l.id}` : `/app/learn/${c.slug}`); };

  return (
    <div className="space-y-6">
      <nav className="text-sm text-navy/55"><Link to="/app/courses" className="hover:text-teal">My courses</Link> <ChevronRight className="inline h-3.5 w-3.5" /> {c.title}</nav>
      <div className="card flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 max-w-2xl">
          <Badge tone={STATUS_TONE[e.status]}>{STATUS_LABEL[e.status]}</Badge>
          <h1 className="mt-2 font-display text-3xl font-semibold">{c.title}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 text-sm text-navy/60"><span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" />{c.duration_label}</span><span>{MODE_LABEL[e.mode]}</span><span>Enrolled {fmtDate(e.enrolled_at)}</span></p>
          <div className="mt-4 flex max-w-md items-center gap-3"><div className="flex-1"><ProgressBar value={e.progress_pct} /></div><span className="font-semibold tabular-nums">{e.progress_pct}%</span></div>
        </div>
        <div className="flex flex-col gap-2">
          {e.mode !== 'academy' && <button onClick={goLearn} className="btn-primary"><PlayCircle className="h-4 w-4" />Continue Learning</button>}
          {cert && e.status === 'certified' && <Link to="/app/certificates" className="btn-gold"><Award className="h-4 w-4" />View certificate</Link>}
        </div>
      </div>

      <Notice tone={e.status === 'awaiting_approval' ? 'gold' : 'info'} title="Recommended next step">{nextAction(e.status, e.mode, c.requires_attendance)}</Notice>
      {e.status === 'awaiting_approval' && <Notice tone="gold" title="Passed — awaiting trainer approval">Your certificate is issued only after your trainer has reviewed your attendance and practical work. You will be notified as soon as it is approved.</Notice>}
      {e.status === 'needs_retake' && a && <Notice tone="gold" title="Retake needed">{a.retake_after_days ? `You can retake the assessment ${a.retake_after_days} days after your last attempt.` : 'You can retake the assessment when you are ready.'} Review feedback below and revise the lessons first.</Notice>}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="card">
          <h2 className="mb-4 font-display text-xl font-semibold">Your requirements</h2>
          <ol className="space-y-1">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-4 rounded-xl p-3">
                <span className="mt-0.5">{s.state === 'done' ? <CheckCircle2 className="h-6 w-6 text-emerald-600" /> : s.state === 'current' ? <Hourglass className="h-6 w-6 text-accent" /> : s.state === 'blocked' ? <XCircle className="h-6 w-6 text-navy/25" /> : <Circle className="h-6 w-6 text-navy/25" />}</span>
                <div className="min-w-0 flex-1"><p className={cn('font-semibold', s.state === 'blocked' && 'text-navy/50')}>{i + 1}. {s.title}</p><p className="text-sm text-navy/65">{s.detail}</p>{s.action && <div className="mt-2">{s.action}</div>}</div>
              </li>
            ))}
          </ol>
        </section>
        <div className="space-y-6">
          <section className="card">
            <h2 className="mb-3 font-display text-xl font-semibold">Learning mode</h2>
            <div className="space-y-2">{c.learning_modes.map((m) => <button key={m} disabled={busy || m === e.mode} onClick={() => changeMode(m)} className={cn('flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium', m === e.mode ? 'border-teal bg-teal/5 text-teal' : 'border-navy/10 hover:border-teal/50')}>{MODE_LABEL[m]}{m === e.mode && <CheckCircle2 className="h-4 w-4" />}</button>)}</div>
          </section>
          <section className="card">
            <h2 className="mb-3 font-display text-xl font-semibold">Trainer feedback</h2>
            {feedback.length === 0 ? <p className="text-sm text-navy/60">No feedback yet.</p> : <ul className="space-y-3">{feedback.map((f) => <li key={f.id} className="rounded-xl bg-pale p-3 text-sm"><p>{f.message}</p><p className="mt-1 text-xs text-navy/50">— {f.trainer_name}, {fmtDate(f.created_at)}</p></li>)}</ul>}
            {pracs.filter((p) => p.retake_reason && p.result === 'failed').map((p) => <p key={p.id} className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700"><strong>Retake reason:</strong> {p.retake_reason}</p>)}
          </section>
          {c.requires_attendance && <Link to={`/app/bookings?course=${c.slug}`} className="btn-outline w-full"><CalendarDays className="h-4 w-4" />Academy sessions</Link>}
        </div>
      </div>
      <Disclaimer />
    </div>
  );
}
