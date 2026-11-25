import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Clock, Flag, ListChecks, Lock, Send, ShieldCheck, Timer } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { backend, useQuery } from '@/lib/db';
import { Badge, Button, ErrorNote, Modal, Notice, Spinner, useAction, useToast } from '@/components/ui';
import { cn, fmtDate } from '@/lib/utils';
import type { Assessment as A, Attempt, Course, Enrolment, PublicOption, PublicQuestion } from '@/lib/types';

type Stage = 'intro' | 'test' | 'review';

export default function Assessment() {
  const { slug } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const { busy, run } = useAction();

  const [stage, setStage] = useState<Stage>('intro');
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [flags, setFlags] = useState<Set<string>>(new Set());
  const [i, setI] = useState(0);
  const [left, setLeft] = useState<number | null>(null);
  const [confirm, setConfirm] = useState(false);
  const submitting = useRef(false);

  const { data, loading, error } = useQuery(async () => {
    const [course] = await backend.select<Course>('courses', { eq: { slug } });
    const [assessment] = course ? await backend.select<A>('assessments', { eq: { course_id: course.id } }) : [];
    if (!course || !assessment) return null;
    await backend.rpc('sync_certificate_statuses').catch(() => {});
    const [[enrol], qs, attempts] = await Promise.all([
      backend.select<Enrolment>('course_enrolments', { eq: { user_id: user!.id, course_id: course.id } }),
      backend.select<PublicQuestion>('v_assessment_questions', { eq: { assessment_id: assessment.id }, order: ['position'] }),
      backend.select<Attempt>('assessment_attempts', { eq: { user_id: user!.id, assessment_id: assessment.id }, order: ['started_at', false] }),
    ]);
    const opts = qs.length ? await backend.select<PublicOption>('v_assessment_options', { in: { question_id: qs.map((q) => q.id) }, order: ['position'] }) : [];
    return { course, assessment, enrol, qs, opts, attempts };
  }, [slug, user?.id]);

  // resume an open attempt if time remains
  useEffect(() => {
    if (!data || attempt) return;
    const open = data.attempts.find((a) => a.status === 'in_progress' && new Date(a.started_at).getTime() + data.assessment.time_limit_min * 60000 > Date.now());
    if (open) {
      setAttempt(open);
      backend.select<{ question_id: string; option_id: string }>('assessment_answers', { eq: { attempt_id: open.id } }).then((rows) => {
        const m: Record<string, string> = {}; rows.forEach((r) => r.option_id && (m[r.question_id] = r.option_id));
        setAnswers(m); setSaved(Object.fromEntries(Object.keys(m).map((k) => [k, true]))); setStage('test');
      });
    }
  }, [data, attempt]);

  const submit = useCallback(async () => {
    if (!attempt || submitting.current) return;
    submitting.current = true;
    const ok = await run(async () => { await backend.rpc('submit_attempt', { p_attempt: attempt.id, p_answers: answers }); }, 'Assessment submitted');
    if (ok) nav(`/app/results/${attempt.id}`, { replace: true }); else submitting.current = false;
  }, [attempt, answers, nav, run]);

  // countdown + auto-submit
  useEffect(() => {
    if (!attempt || !data || stage === 'intro') return;
    const end = new Date(attempt.started_at).getTime() + data.assessment.time_limit_min * 60000;
    const tick = () => { const s = Math.max(0, Math.round((end - Date.now()) / 1000)); setLeft(s); if (s === 0) { toast('Time is up — submitting your answers', 'err'); submit(); } };
    tick(); const t = setInterval(tick, 1000); return () => clearInterval(t);
  }, [attempt, data, stage, submit, toast]);

  if (loading) return <Spinner />;
  if (error) return <ErrorNote message={error} />;
  if (!data) return <ErrorNote message="Assessment not found." />;
  const { course, assessment: a, enrol, qs, opts, attempts } = data;
  const unlocked = enrol && ['assessment_unlocked', 'needs_retake'].includes(enrol.status);
  const lastFail = attempts.filter((t) => t.status === 'submitted' && !t.passed)[0];
  const retakeOn = lastFail && a.retake_after_days ? new Date(new Date(lastFail.submitted_at!).getTime() + a.retake_after_days * 864e5) : null;
  const waiting = retakeOn && retakeOn.getTime() > Date.now();

  const begin = async () => {
    let id = '';
    const ok = await run(async () => { id = await backend.rpc('start_attempt', { p_assessment: a.id }); });
    if (!ok) return;
    const [t] = await backend.select<Attempt>('assessment_attempts', { eq: { id } });
    setAttempt(t); setAnswers({}); setSaved({}); setFlags(new Set()); setI(0); setStage('test'); submitting.current = false;
  };

  if (stage === 'intro') {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <nav className="text-sm text-navy/55"><Link to={`/app/courses/${slug}`} className="hover:text-teal">{course.title}</Link> / Assessment</nav>
        <div className="card">
          <p className="eyebrow">Instructions</p>
          <h1 className="mt-1 font-display text-3xl font-semibold">{a.title}</h1>
          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
            {[[ListChecks, 'Questions', `${qs.length} MCQs`], [Clock, 'Time limit', `${a.time_limit_min} minutes`], [ShieldCheck, 'Pass mark', `${a.pass_mark}%`], [Timer, 'Retake', a.retake_after_days ? `After ${a.retake_after_days} days` : 'Any time']].map(([I, k, v]: any) => (
              <div key={k} className="flex items-center gap-3 rounded-2xl bg-pale p-4"><I className="h-5 w-5 text-teal" /><div><dt className="text-xs text-navy/55">{k}</dt><dd className="font-semibold">{v}</dd></div></div>
            ))}
          </dl>
          <ul className="mt-6 list-disc space-y-1.5 pl-5 text-sm text-navy/75">
            <li>Choose one answer per question. Your answers are saved as you go.</li>
            <li>You can move between questions, flag any for review and check your answers before submitting.</li>
            <li>The timer starts when you press Start. The test submits automatically when time runs out.</li>
            <li>Correct answers and explanations are shown only after you submit.</li>
            {a.compulsory_category && <li>The <strong>{a.compulsory_category}</strong> section is compulsory: you must reach the pass mark in it as well.</li>}
            {course.requires_practical && <li>Passing the test does not issue your certificate. Practical assessment and trainer approval are still required.</li>}
          </ul>
          {a.num_questions > qs.length && <div className="mt-4"><Notice tone="gold" title="Sample question bank">The full bank of {a.num_questions} questions is still being authored by the academy. This sample set has {qs.length}.</Notice></div>}
          <div className="mt-6">
            {!unlocked ? (
              <Notice tone="gold" title={<span className="flex items-center gap-1.5"><Lock className="h-4 w-4" />Assessment locked</span> as any}>Complete your recorded lessons{course.requires_attendance ? ' and attend your academy session' : ''} to unlock this test. <Link to={`/app/courses/${slug}`} className="font-semibold text-teal">View requirements</Link></Notice>
            ) : waiting ? (
              <Notice tone="gold" title="Retake not available yet">You can retake this assessment on <strong>{fmtDate(retakeOn!.toISOString())}</strong>. Use the time to revise the lessons and read your trainer's feedback.</Notice>
            ) : (
              <Button className="btn-primary !px-8 !py-3" loading={busy} onClick={begin}>{lastFail ? 'Start retake' : 'Start assessment'}</Button>
            )}
          </div>
        </div>
        {attempts.filter((t) => t.status === 'submitted').length > 0 && (
          <div className="card"><h2 className="mb-3 font-semibold">Previous attempts</h2><ul className="divide-y divide-navy/5 text-sm">{attempts.filter((t) => t.status === 'submitted').map((t) => <li key={t.id} className="flex items-center justify-between py-2.5"><span>{fmtDate(t.submitted_at)}</span><span className="flex items-center gap-3"><Badge tone={t.passed ? 'green' : 'red'}>{t.passed ? 'Passed' : 'Not passed'} · {Math.round(Number(t.score_pct))}%</Badge><Link className="font-semibold text-teal" to={`/app/results/${t.id}`}>Review</Link></span></li>)}</ul></div>
        )}
      </div>
    );
  }

  /* ───────── test + review ───────── */
  const q = qs[i];
  const qOpts = opts.filter((o) => o.question_id === q?.id);
  const unanswered = qs.filter((x) => !answers[x.id]);
  const mm = left === null ? '--' : String(Math.floor(left / 60)).padStart(2, '0');
  const ss = left === null ? '--' : String(left % 60).padStart(2, '0');
  const choose = (qid: string, oid: string) => {
    setAnswers((a) => ({ ...a, [qid]: oid })); setSaved((s) => ({ ...s, [qid]: false }));
    backend.rpc('save_answer', { p_attempt: attempt!.id, p_question: qid, p_option: oid }).then(() => setSaved((s) => ({ ...s, [qid]: true }))).catch(() => {});
  };
  const toggleFlag = (id: string) => setFlags((f) => { const n = new Set(f); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="sticky top-16 z-20 -mx-1 flex items-center justify-between gap-3 rounded-2xl border border-navy/5 bg-white/95 px-4 py-3 shadow-card backdrop-blur">
        <div className="min-w-0"><p className="truncate text-sm font-semibold">{a.title}</p><p className="text-xs text-navy/55">{qs.length - unanswered.length} of {qs.length} answered</p></div>
        <div className={cn('flex items-center gap-2 rounded-xl px-3.5 py-2 font-mono text-lg font-semibold tabular-nums', left !== null && left < 120 ? 'bg-red-50 text-red-600' : 'bg-pale text-navy')} role="timer" aria-label="Time remaining"><Clock className="h-4 w-4" />{mm}:{ss}</div>
      </div>

      {stage === 'review' ? (
        <div className="card">
          <h1 className="font-display text-2xl font-semibold">Review your answers</h1>
          <p className="mt-1 text-sm text-navy/65">{unanswered.length === 0 ? 'All questions answered.' : `${unanswered.length} question${unanswered.length > 1 ? 's' : ''} unanswered.`} Select a question to change your answer.</p>
          <ul className="mt-5 divide-y divide-navy/5">
            {qs.map((x, n) => (
              <li key={x.id}><button onClick={() => { setI(n); setStage('test'); }} className="flex w-full items-center gap-3 py-3 text-left hover:bg-pale/60">
                <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold', answers[x.id] ? 'bg-teal text-white' : 'bg-red-50 text-red-600')}>{n + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm">{x.prompt}</span>
                {flags.has(x.id) && <Flag className="h-4 w-4 text-amber-600" />}
                <span className="text-xs font-semibold">{answers[x.id] ? <span className="text-emerald-700">Answered</span> : <span className="text-red-600">Unanswered</span>}</span>
              </button></li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap justify-between gap-3"><button className="btn-outline" onClick={() => setStage('test')}><ChevronLeft className="h-4 w-4" />Back to questions</button><button className="btn-primary" onClick={() => setConfirm(true)}><Send className="h-4 w-4" />Submit assessment</button></div>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
          <div className="card">
            <div className="flex items-center justify-between gap-3">
              <p className="eyebrow">Question {i + 1} of {qs.length}{q?.category ? ` · ${q.category}` : ''}</p>
              <span className="text-xs font-medium">{answers[q.id] ? (saved[q.id] === false ? <span className="text-navy/50">Saving…</span> : <span className="inline-flex items-center gap-1 text-emerald-700"><Check className="h-3.5 w-3.5" />Saved</span>) : <span className="text-navy/40">Not answered</span>}</span>
            </div>
            <h2 className="mt-3 text-lg font-semibold leading-snug">{q.prompt}</h2>
            <div className="mt-5 space-y-2.5" role="radiogroup" aria-label={`Question ${i + 1} options`}>
              {qOpts.map((o, n) => (
                <button key={o.id} role="radio" aria-checked={answers[q.id] === o.id} onClick={() => choose(q.id, o.id)}
                  className={cn('flex w-full items-start gap-3 rounded-2xl border px-4 py-3.5 text-left text-sm transition', answers[q.id] === o.id ? 'border-teal bg-teal/5 ring-1 ring-teal' : 'border-navy/10 hover:border-teal/50 hover:bg-pale/50')}>
                  <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold', answers[q.id] === o.id ? 'border-teal bg-teal text-white' : 'border-navy/25 text-navy/55')}>{String.fromCharCode(65 + n)}</span>
                  <span className="pt-0.5">{o.label}</span>
                </button>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <button className="btn-outline" disabled={i === 0} onClick={() => setI(i - 1)}><ChevronLeft className="h-4 w-4" />Previous</button>
              <button className={cn('btn-ghost btn-sm', flags.has(q.id) && '!bg-gold-soft !text-amber-800')} onClick={() => toggleFlag(q.id)}><Flag className="h-4 w-4" />{flags.has(q.id) ? 'Flagged' : 'Flag for review'}</button>
              {i < qs.length - 1 ? <button className="btn-primary" onClick={() => setI(i + 1)}>Next<ChevronRight className="h-4 w-4" /></button> : <button className="btn-primary" onClick={() => setStage('review')}>Review answers</button>}
            </div>
          </div>
          <aside className="card h-fit">
            <p className="mb-3 text-sm font-semibold">Questions</p>
            <div className="grid grid-cols-5 gap-2">
              {qs.map((x, n) => (
                <button key={x.id} onClick={() => setI(n)} aria-label={`Question ${n + 1}${answers[x.id] ? ', answered' : ''}${flags.has(x.id) ? ', flagged' : ''}`} aria-current={n === i}
                  className={cn('relative h-9 rounded-lg text-sm font-semibold transition', n === i ? 'bg-navy text-white' : answers[x.id] ? 'bg-teal/15 text-teal' : 'bg-pale text-navy/60 hover:bg-accent/10')}>
                  {n + 1}{flags.has(x.id) && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-gold" />}
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-1 text-xs text-navy/55"><p><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded bg-teal/30" />Answered</p><p><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded bg-pale ring-1 ring-navy/10" />Not answered</p><p><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-gold" />Flagged</p></div>
            <button className="btn-outline mt-5 w-full" onClick={() => setStage('review')}>Review answers</button>
            <button className="btn-primary mt-2 w-full" onClick={() => setConfirm(true)}>Submit</button>
          </aside>
        </div>
      )}

      <Modal open={confirm} onClose={() => setConfirm(false)} title="Submit your assessment?">
        {unanswered.length > 0 ? <Notice tone="gold" title={<span className="flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" />{unanswered.length} unanswered</span> as any}>Unanswered questions are marked incorrect. You cannot change answers after submitting.</Notice> : <p className="text-sm text-navy/70">You have answered every question. You cannot change answers after submitting.</p>}
        <div className="mt-5 flex justify-end gap-2"><button className="btn-outline" onClick={() => setConfirm(false)}>Keep working</button><Button className="btn-primary" loading={busy} onClick={() => { setConfirm(false); submit(); }}>Yes, submit</Button></div>
      </Modal>
    </div>
  );
}
