import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Clock, RotateCcw, XCircle } from 'lucide-react';
import { backend, useQuery } from '@/lib/db';
import { Badge, ErrorNote, Notice, ProgressBar, Spinner } from '@/components/ui';
import { cn, fmtDate } from '@/lib/utils';
import type { Assessment, Attempt, AttemptResult, Course, PublicOption, TrainerFeedback } from '@/lib/types';

export default function Results() {
  const { attemptId } = useParams();
  const { data, loading, error } = useQuery(async () => {
    const result = await backend.rpc<AttemptResult>('attempt_review', { p_attempt: attemptId });
    const [attempt] = await backend.select<Attempt>('assessment_attempts', { eq: { id: attemptId } });
    const [a] = await backend.select<Assessment>('assessments', { eq: { id: attempt.assessment_id } });
    const [course] = await backend.select<Course>('courses', { eq: { id: a.course_id } });
    const qIds = result.review.map((r) => r.question_id);
    const opts = qIds.length ? await backend.select<PublicOption>('v_assessment_options', { in: { question_id: qIds }, order: ['position'] }) : [];
    const feedback = attempt.enrolment_id ? await backend.select<TrainerFeedback>('trainer_feedback', { eq: { enrolment_id: attempt.enrolment_id }, order: ['created_at', false] }).catch(() => []) : [];
    return { result, attempt, a, course, opts, feedback };
  }, [attemptId]);

  if (loading) return <Spinner />;
  if (error || !data) return <ErrorNote message={error ?? 'Result not found'} />;
  const { result, attempt, a, course, opts, feedback } = data;
  const retakeOn = !result.passed && a.retake_after_days && attempt.submitted_at ? new Date(new Date(attempt.submitted_at).getTime() + a.retake_after_days * 864e5) : null;
  const canRetake = !retakeOn || retakeOn.getTime() <= Date.now();
  const sections = Object.entries(result.section_scores ?? {});

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <nav className="text-sm text-navy/55"><Link to={`/app/courses/${course.slug}`} className="hover:text-teal">{course.title}</Link> / Result</nav>

      <div className={cn('card text-center', result.passed ? 'border-emerald-200' : 'border-red-200')}>
        {result.passed ? <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" /> : <XCircle className="mx-auto h-12 w-12 text-red-500" />}
        <h1 className="mt-3 font-display text-3xl font-semibold">{result.passed ? 'You passed' : 'Not passed this time'}</h1>
        <p className="mt-1 text-navy/60">{a.title} · submitted {fmtDate(attempt.submitted_at)}</p>
        <p className="mt-4 font-display text-6xl font-semibold text-navy">{Math.round(Number(result.score_pct))}<span className="text-3xl text-navy/40">%</span></p>
        <p className="mt-1 text-sm text-navy/60">Pass mark {a.pass_mark}%</p>
      </div>

      {result.passed ? (
        course.requires_practical || course.requires_attendance ? (
          <Notice tone="gold" title="Next: practical assessment and trainer approval">Your certificate is issued only after your trainer completes your practical assessment and approves it. We will notify you. <Link to="/app/certificates" className="font-semibold text-teal">Certificate status</Link></Notice>
        ) : <Notice tone="green" title="Well done">Your enrolment has been updated. <Link to="/app/certificates" className="font-semibold text-teal">View certificates</Link></Notice>
      ) : (
        <Notice tone="gold" title={canRetake ? 'You can retake the assessment' : 'Retake available soon'}>
          {canRetake ? 'Review the explanations below, revisit the lessons, then try again.' : <>You can retake on <strong>{fmtDate(retakeOn!.toISOString())}</strong>. Use the explanations below to revise.</>}
          {canRetake && <div className="mt-3"><Link to={`/app/assessment/${course.slug}`} className="btn-primary btn-sm"><RotateCcw className="h-4 w-4" />Retake assessment</Link></div>}
        </Notice>
      )}

      {sections.length > 1 && (
        <div className="card">
          <h2 className="mb-4 font-semibold">Section scores</h2>
          <div className="space-y-4">{sections.map(([k, v]) => { const p = Math.round((100 * v.correct) / Math.max(v.total, 1)); const must = a.compulsory_category === k; return (
            <div key={k}><div className="mb-1 flex items-center justify-between text-sm"><span className="font-medium">{k}{must && <Badge tone="gold" className="ml-2">Compulsory</Badge>}</span><span className="tabular-nums text-navy/70">{v.correct}/{v.total} · {p}%</span></div><ProgressBar value={p} /></div>
          ); })}</div>
        </div>
      )}

      {feedback.length > 0 && (
        <div className="card"><h2 className="mb-3 font-semibold">Trainer feedback</h2><ul className="space-y-3">{feedback.map((f) => <li key={f.id} className="rounded-xl bg-pale p-4 text-sm"><p>{f.message}</p><p className="mt-1 text-xs text-navy/50">{f.trainer_name ?? 'Trainer'} · {fmtDate(f.created_at)}</p></li>)}</ul></div>
      )}

      <div className="card">
        <h2 className="mb-1 font-semibold">Question review</h2>
        <p className="mb-4 text-sm text-navy/60">{result.review.filter((r) => r.is_correct).length} of {result.review.length} correct.</p>
        <ol className="space-y-5">
          {result.review.map((r, n) => (
            <li key={r.question_id} className="border-b border-navy/5 pb-5 last:border-0 last:pb-0">
              <div className="flex items-start gap-3">
                <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold', r.is_correct ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}>{n + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{r.prompt}</p>
                  <ul className="mt-2 space-y-1.5">
                    {opts.filter((o) => o.question_id === r.question_id).map((o) => {
                      const right = o.id === r.correct_option_id; const mine = o.id === r.selected_option_id;
                      return <li key={o.id} className={cn('flex items-center gap-2 rounded-lg px-3 py-2 text-sm', right ? 'bg-emerald-50 text-emerald-900' : mine ? 'bg-red-50 text-red-800' : 'text-navy/65')}>
                        {right ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : mine ? <XCircle className="h-4 w-4 shrink-0" /> : <span className="h-4 w-4 shrink-0" />}
                        <span className="flex-1">{o.label}</span>{mine && <span className="text-xs font-semibold">Your answer</span>}{right && !mine && <span className="text-xs font-semibold">Correct</span>}
                      </li>;
                    })}
                    {!r.selected_option_id && <li className="flex items-center gap-2 px-3 text-xs text-navy/50"><Clock className="h-3.5 w-3.5" />Not answered</li>}
                  </ul>
                  {r.explanation && <p className="mt-2 rounded-lg bg-pale px-3 py-2 text-sm text-navy/75"><span className="font-semibold">Why: </span>{r.explanation}</p>}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
