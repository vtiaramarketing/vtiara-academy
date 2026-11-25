import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Award, Bell, CalendarDays, CheckCircle2, ClipboardCheck, MessageSquareQuote, PlayCircle, Sparkles, UserCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { backend, useQuery } from '@/lib/db';
import { firstIncompleteLesson, firstName, useLearnerData, type LearnerData } from '@/lib/learner';
import { Badge, CourseImage, Disclaimer, Empty, ProgressBar, Spinner, ErrorNote } from '@/components/ui';
import { CERT_LABEL, CERT_TONE, ACCESS_NEXT, enrolBadge, hasAccess, cn, fmtDate, fmtDateTime, fmtTime, nextAction } from '@/lib/utils';
import ExpiryBanner from '@/components/ExpiryBanner';
import type { Enrolment, Notification } from '@/lib/types';

const PATH = ['Common Core', 'Role Training', 'Supervised Practice', 'Assessment', 'Certificate'];

function pathState(d: LearnerData): { index: number; focusSlug?: string } {
  const bySlug = (slug: string) => d.courses.find((c) => c.slug === slug);
  const ccEnrol = d.enrolments.find((e) => e.course_id === bySlug('common-core')?.id);
  if (!ccEnrol || ccEnrol.status !== 'certified') {
    // Common Core is first until certified
    if (ccEnrol) { const s = ccEnrol.status; return { index: s === 'certified' ? 1 : s === 'awaiting_approval' ? 3 : s === 'assessment_unlocked' || s === 'needs_retake' ? 3 : s === 'session_booked' ? 2 : 0, focusSlug: 'common-core' }; }
    return { index: 0 };
  }
  const role = d.enrolments.find((e) => e.course_id !== bySlug('common-core')?.id);
  if (!role) return { index: 1 };
  const s = role.status;
  const slug = d.courses.find((c) => c.id === role.course_id)?.slug;
  if (s === 'certified') return { index: 5, focusSlug: slug };
  if (s === 'awaiting_approval' || s === 'assessment_unlocked' || s === 'needs_retake') return { index: 3, focusSlug: slug };
  if (s === 'session_booked') return { index: 2, focusSlug: slug };
  return { index: 1, focusSlug: slug };
}

export default function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { data: d, loading, error } = useLearnerData();
  const { data: notes } = useQuery(() => backend.select<Notification>('notifications', { eq: { user_id: user!.id }, order: ['created_at', false], limit: 4 }), [user?.id]);

  if (loading) return <Spinner />;
  if (error || !d) return <ErrorNote message={error ?? 'Could not load your dashboard'} />;

  const course = (id: string) => d.courses.find((c) => c.id === id)!;
  const active = d.enrolments.filter((e) => e.status !== 'certified').sort((a, b) => b.enrolled_at.localeCompare(a.enrolled_at));
  const lead = active.find((e) => hasAccess(e)) ?? active[0];
  const upcoming = d.bookings.filter((b) => ['booked', 'waitlist'].includes(b.status)).map((b) => ({ b, batch: d.batches.find((x) => x.id === b.batch_id)! })).filter((x) => x.batch && x.batch.starts_on >= new Date().toISOString().slice(0, 10)).sort((a, z) => a.batch.starts_on.localeCompare(z.batch.starts_on));
  const attended = d.bookings.filter((b) => b.status === 'attended').length;
  const noShow = d.bookings.filter((b) => b.status === 'no_show').length;
  const { index, focusSlug } = pathState(d);

  const cont = async (e: Enrolment) => {
    const c = course(e.course_id);
    if (!hasAccess(e)) return nav(`/app/courses/${c.slug}`);
    if (e.status === 'assessment_unlocked' || e.status === 'needs_retake') return nav(`/app/assessment/${c.slug}`);
    if (e.status === 'session_booked' || (e.mode === 'academy' && e.status === 'not_started')) return nav('/app/bookings?course=' + c.slug);
    const l = await firstIncompleteLesson(c.id, user!.id);
    nav(l && e.mode !== 'academy' ? `/app/learn/${c.slug}/${l.id}` : `/app/courses/${c.slug}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Learner dashboard</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Welcome back, {firstName(user?.profile?.full_name)}</h1>
      </div>

      <ExpiryBanner />

      {/* Recommended next action */}
      {lead ? (
        <div className="relative overflow-hidden rounded-3xl bg-navy p-6 text-white sm:p-8">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-5">
            <div className="max-w-xl">
              <p className="eyebrow !text-gold"><Sparkles className="mr-1 inline h-3.5 w-3.5" />Next required action</p>
              <p className="mt-2 font-display text-2xl font-semibold text-white">{hasAccess(lead) ? nextAction(lead.status, lead.mode, course(lead.course_id).requires_attendance) : ACCESS_NEXT[lead.access_status]}</p>
              <p className="mt-1 text-sm text-white/65">{course(lead.course_id).title} · {enrolBadge(lead).label}</p>
            </div>
            <button onClick={() => cont(lead)} className="btn-gold !px-6 !py-3"><PlayCircle className="h-5 w-5" />Continue Learning</button>
          </div>
        </div>
      ) : (
        <div className="card flex flex-wrap items-center justify-between gap-4">
          <div><p className="font-display text-xl font-semibold">{d.enrolments.length ? 'You have completed all your courses' : 'Start with Common Core Training'}</p><p className="mt-1 text-sm text-navy/65">{d.enrolments.length ? 'Explore other role paths in the catalogue.' : 'It is the mandatory foundation for every VTIARA role.'}</p></div>
          <Link to={d.enrolments.length ? '/courses' : '/courses/common-core?enrol=1'} className="btn-primary">{d.enrolments.length ? 'Browse courses' : 'Enrol in Common Core'} <ArrowRight className="h-4 w-4" /></Link>
        </div>
      )}

      {/* Role path */}
      <div className="card">
        <p className="eyebrow mb-4">Your role path{focusSlug ? ` · ${course(d.courses.find((c) => c.slug === focusSlug)!.id).title}` : ''}</p>
        <ol className="grid gap-3 sm:grid-cols-5">
          {PATH.map((p, i) => {
            const done = i < index; const cur = i === index;
            return (
              <li key={p} className={cn('relative rounded-2xl border p-4 text-sm', done ? 'border-teal/30 bg-teal/5' : cur ? 'border-accent bg-accent/5 ring-1 ring-accent' : 'border-navy/10')}>
                <span className={cn('mb-2 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold', done ? 'bg-teal text-white' : cur ? 'bg-accent text-white' : i === 4 ? 'bg-gold-soft text-amber-700' : 'bg-navy/10 text-navy/50')}>{done ? <CheckCircle2 className="h-4 w-4" /> : i === 4 ? <Award className="h-4 w-4" /> : i + 1}</span>
                <p className={cn('font-semibold', !done && !cur && 'text-navy/50')}>{p}</p>
                {cur && <p className="text-xs text-accent">In progress</p>}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          {/* Current courses */}
          <section>
            <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-xl font-semibold">Current courses</h2><Link to="/app/courses" className="text-sm font-semibold text-teal">All courses →</Link></div>
            {d.enrolments.length === 0 ? <Empty title="You are not enrolled in any course yet" action={<Link to="/courses" className="btn-primary">Explore courses</Link>} /> : (
              <div className="space-y-3">
                {d.enrolments.map((e) => {
                  const c = course(e.course_id);
                  return (
                    <div key={e.id} className="card flex flex-col gap-4 !p-4 sm:flex-row">
                      <CourseImage course={c} className="h-28 w-full shrink-0 rounded-xl sm:w-40" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2"><Link to={`/app/courses/${c.slug}`} className="font-semibold hover:text-teal">{c.title}</Link><Badge tone={enrolBadge(e).tone}>{enrolBadge(e).label}</Badge></div>
                        <div className="mt-3 flex items-center gap-3"><div className="flex-1"><ProgressBar value={e.progress_pct} label={`${c.title} progress`} /></div><span className="text-sm font-semibold tabular-nums">{e.progress_pct}%</span></div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {e.status === 'certified' ? <Link to="/app/certificates" className="btn-outline btn-sm"><Award className="h-3.5 w-3.5" />View certificate</Link> : <button onClick={() => cont(e)} className="btn-primary btn-sm">Continue Learning</button>}
                          <Link to={`/app/courses/${c.slug}`} className="btn-ghost btn-sm">Course status</Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Feedback */}
          <section className="card">
            <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-semibold"><MessageSquareQuote className="h-5 w-5 text-teal" />Trainer feedback</h2>
            {d.feedback.length === 0 ? <p className="text-sm text-navy/60">Feedback from your trainers will appear here after your practical work is reviewed.</p> : (
              <ul className="space-y-3">{d.feedback.slice(0, 3).map((f) => <li key={f.id} className="rounded-xl bg-pale p-4 text-sm"><p>{f.message}</p><p className="mt-1 text-xs text-navy/55">— {f.trainer_name ?? 'Trainer'}, {fmtDate(f.created_at)}</p></li>)}</ul>
            )}
          </section>
        </div>

        <div className="space-y-6">
          {/* Sessions + attendance */}
          <section className="card">
            <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-semibold"><CalendarDays className="h-5 w-5 text-teal" />Upcoming academy sessions</h2>
            {upcoming.length === 0 ? <p className="text-sm text-navy/60">No sessions booked. <Link to="/app/bookings" className="font-semibold text-teal">Book a session</Link></p> : (
              <ul className="space-y-3">{upcoming.slice(0, 3).map(({ b, batch }) => (
                <li key={b.id} className="rounded-xl border border-navy/10 p-3 text-sm"><p className="font-semibold">{batch.title}</p><p className="text-navy/65">{fmtDate(batch.starts_on)} · {fmtTime(batch.start_time)}</p><p className="text-xs text-navy/55">{batch.branch_name}</p>{b.status === 'waitlist' && <Badge tone="gold" className="mt-1">Waitlist</Badge>}</li>
              ))}</ul>
            )}
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-navy/10 pt-4 text-center">
              <div className="rounded-xl bg-pale p-3"><p className="text-2xl font-semibold text-teal">{attended}</p><p className="text-xs text-navy/60"><UserCheck className="mr-1 inline h-3 w-3" />Sessions attended</p></div>
              <div className="rounded-xl bg-pale p-3"><p className={cn('text-2xl font-semibold', noShow ? 'text-red-600' : 'text-navy/40')}>{noShow}</p><p className="text-xs text-navy/60">Missed</p></div>
            </div>
          </section>

          {/* Assessment status */}
          <section className="card">
            <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-semibold"><ClipboardCheck className="h-5 w-5 text-teal" />Assessment status</h2>
            {d.enrolments.length === 0 ? <p className="text-sm text-navy/60">Enrol in a course to see assessments.</p> : (
              <ul className="space-y-2.5 text-sm">
                {d.enrolments.map((e) => {
                  const a = d.assessments.find((x) => x.course_id === e.course_id);
                  const last = a && d.attempts.find((t) => t.assessment_id === a.id && t.status === 'submitted');
                  return (
                    <li key={e.id} className="flex items-center justify-between gap-3 rounded-xl bg-pale px-3 py-2.5">
                      <span className="min-w-0 truncate">{course(e.course_id).title.replace(' Training', '')}</span>
                      <span className="shrink-0 text-xs font-semibold">{last ? <span className={last.passed ? 'text-emerald-700' : 'text-red-600'}>{last.passed ? 'Passed' : 'Failed'} · {Math.round(Number(last.score_pct))}%</span> : ['assessment_unlocked', 'needs_retake'].includes(e.status) ? <Link className="text-teal" to={`/app/assessment/${course(e.course_id).slug}`}>Take test →</Link> : <span className="text-navy/50">Locked</span>}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Wallet */}
          <section className="card">
            <div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 font-display text-xl font-semibold"><Award className="h-5 w-5 text-amber-600" />Certificate wallet</h2><Link to="/app/certificates" className="text-sm font-semibold text-teal">Open</Link></div>
            {d.certificates.length === 0 ? <p className="text-sm text-navy/60">Your verified certificates will be kept here once approved.</p> : (
              <ul className="space-y-2">{d.certificates.slice(0, 3).map((c) => <li key={c.id} className="flex items-center justify-between gap-2 rounded-xl border border-gold/40 bg-gold-soft/40 px-3 py-2.5 text-sm"><span className="truncate font-medium">{c.certificate_title ?? c.course_title}</span><Badge tone={CERT_TONE[c.status]}>{CERT_LABEL[c.status]}</Badge></li>)}</ul>
            )}
          </section>

          {/* Notifications */}
          <section className="card">
            <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-semibold"><Bell className="h-5 w-5 text-teal" />Notifications</h2>
            {(notes ?? []).length === 0 ? <p className="text-sm text-navy/60">Nothing new.</p> : <ul className="space-y-2.5">{notes!.map((n) => <li key={n.id} className="text-sm"><p className={cn('font-medium', !n.is_read && 'text-teal')}>{n.title}</p><p className="text-xs text-navy/55">{n.body} · {fmtDateTime(n.created_at)}</p></li>)}</ul>}
          </section>
        </div>
      </div>
      <Disclaimer />
    </div>
  );
}
