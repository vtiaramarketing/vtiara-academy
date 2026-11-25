import { useState } from 'react';
import { backend, useQuery } from '@/lib/db';
import { Badge, Button, ErrorNote, Field, Modal, Notice, PageHeader, Spinner, Table, useAction, useToast } from '@/components/ui';
import type { Assessment, Course } from '@/lib/types';

interface Q { id: string; assessment_id: string; category: string | null; prompt: string; explanation: string | null; position: number }
interface O { id: string; question_id: string; label: string; is_correct: boolean; position: number }

export default function AssessmentsAdmin() {
  const { busy, run } = useAction(); const toast = useToast();
  const [edit, setEdit] = useState<Assessment | null>(null);
  const [bank, setBank] = useState<Assessment | null>(null);
  const [warn, setWarn] = useState(false);
  const [nq, setNq] = useState({ category: '', prompt: '', explanation: '', opts: ['', '', '', ''], correct: 0 });
  const { data, loading, error, reload } = useQuery(async () => {
    const [assessments, courses, qs, os] = await Promise.all([backend.select<Assessment>('assessments'), backend.select<Course>('courses'), backend.select<Q>('assessment_questions', { order: ['position'] }), backend.select<O>('assessment_options', { order: ['position'] })]);
    return { assessments, courses, qs, os };
  }, []);
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorNote message={error ?? 'Could not load assessments'} />;
  const bankCount = (id: string) => data.qs.filter((q) => q.assessment_id === id).length;
  const gap = (a: Assessment) => a.num_questions - bankCount(a.id);
  const mismatched = data.assessments.filter((a) => a.status !== 'archived' && gap(a) !== 0);
  const save = async (force = false) => {
    if (!edit) return;
    const publishing = edit.status === 'published' && gap(edit) > 0 && data.assessments.find((a) => a.id === edit.id)?.status !== 'published';
    if (publishing && !force) { setWarn(true); return; }
    const ok = await run(() => backend.update('assessments', { id: edit.id }, { title: edit.title, time_limit_min: edit.time_limit_min, pass_mark: edit.pass_mark, num_questions: edit.num_questions, retake_after_days: edit.retake_after_days, compulsory_category: edit.compulsory_category || null, status: edit.status, approved_by: edit.approved_by || null, approved_on: edit.approved_on || null, last_reviewed_on: edit.last_reviewed_on || null }), 'Assessment saved');
    if (ok) { setEdit(null); setWarn(false); reload(); }
  };
  const qs = bank ? data.qs.filter((q) => q.assessment_id === bank.id) : [];
  const addQ = async () => {
    const filled = nq.opts.map((o) => o.trim()); if (!nq.prompt.trim() || filled.filter(Boolean).length < 2 || !filled[nq.correct]) { toast('Add a question, at least two options, and mark a correct one', 'err'); return; }
    const ok = await run(async () => { const [q] = await backend.insert<Q>('assessment_questions', { assessment_id: bank!.id, category: nq.category || null, prompt: nq.prompt.trim(), explanation: nq.explanation.trim() || null, position: qs.length + 1 });
      await backend.insert('assessment_options', filled.map((label, i) => ({ question_id: q.id, label, is_correct: i === nq.correct, position: i + 1 })).filter((o) => o.label)); }, 'Question added');
    if (ok) { setNq({ category: nq.category, prompt: '', explanation: '', opts: ['', '', '', ''], correct: 0 }); reload(); }
  };
  return (
    <>
      <PageHeader title="Assessments" subtitle="MCQ settings and question banks. Answer keys are visible to staff only." />
      {mismatched.length > 0
        ? <Notice tone="gold" title={`${mismatched.length} assessment${mismatched.length > 1 ? 's' : ''} where the question bank does not match the target`}>{mismatched.map((a) => `${a.title}: ${bankCount(a.id)} of ${a.num_questions}`).join(' · ')}. Learners are served only the questions that exist. Add questions or lower the target count, and have the Medical Advisor approve the bank before relying on it.</Notice>
        : <Notice tone="green" title="Question banks match their targets">Every active assessment has as many questions as its target count.</Notice>}
      <div className="mt-5"><Table><thead><tr><th className="th">Assessment</th><th className="th">Questions</th><th className="th">Time</th><th className="th">Pass</th><th className="th">Retake</th><th className="th">Status</th><th className="th" /></tr></thead>
        <tbody className="divide-y divide-navy/5">{data.assessments.map((a) => { const n = data.qs.filter((q) => q.assessment_id === a.id).length; return <tr key={a.id}><td className="td font-medium">{a.title}<span className="block text-xs text-navy/50">{data.courses.find((c) => c.id === a.course_id)?.title}</span></td><td className="td">{n} <span className="text-xs text-navy/50">of {a.num_questions}</span>{n !== a.num_questions && a.status !== 'archived' && <Badge tone="gold" className="ml-1.5">{n < a.num_questions ? `${a.num_questions - n} short` : `${n - a.num_questions} extra`}</Badge>}{!a.approved_by && <span className="block text-xs text-amber-700">Not medically approved</span>}</td><td className="td">{a.time_limit_min} min</td><td className="td">{a.pass_mark}%{a.compulsory_category && <span className="block text-xs text-navy/50">{a.compulsory_category} compulsory</span>}</td><td className="td">{a.retake_after_days} days</td><td className="td"><Badge tone={a.status === 'published' ? 'green' : 'slate'}>{a.status}</Badge></td><td className="td whitespace-nowrap text-right font-semibold text-teal"><button className="mr-3" onClick={() => setBank(a)}>Questions</button><button onClick={() => { setWarn(false); setEdit(a); }}>Settings</button></td></tr>; })}</tbody></Table></div>

      <Modal open={!!edit} onClose={() => { setEdit(null); setWarn(false); }} title="Assessment settings">
        {edit && <div className="space-y-4"><Field label="Title"><input className="input" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-4"><Field label="Time limit (min)"><input type="number" className="input" value={edit.time_limit_min} onChange={(e) => setEdit({ ...edit, time_limit_min: Number(e.target.value) })} /></Field><Field label="Pass mark %"><input type="number" className="input" value={edit.pass_mark} onChange={(e) => setEdit({ ...edit, pass_mark: Number(e.target.value) })} /></Field><Field label="Target question count"><input type="number" className="input" value={edit.num_questions} onChange={(e) => setEdit({ ...edit, num_questions: Number(e.target.value) })} /></Field><Field label="Retake after (days)"><input type="number" className="input" value={edit.retake_after_days} onChange={(e) => setEdit({ ...edit, retake_after_days: Number(e.target.value) })} /></Field></div>
          <Field label="Compulsory section" hint="Learners must also pass this category"><input className="input" value={edit.compulsory_category ?? ''} onChange={(e) => setEdit({ ...edit, compulsory_category: e.target.value })} /></Field>
          <Field label="Status"><select className="input" value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>{['draft', 'published', 'archived'].map((s) => <option key={s}>{s}</option>)}</select></Field>
          <fieldset className="rounded-2xl border border-navy/10 p-4">
            <legend className="px-2 text-sm font-semibold">Medical approval</legend>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Approved by"><input className="input" value={edit.approved_by ?? ''} onChange={(e) => setEdit({ ...edit, approved_by: e.target.value })} /></Field>
              <Field label="Approval date"><input type="date" className="input" value={edit.approved_on ?? ''} onChange={(e) => setEdit({ ...edit, approved_on: e.target.value })} /></Field>
              <Field label="Last reviewed"><input type="date" className="input" value={edit.last_reviewed_on ?? ''} onChange={(e) => setEdit({ ...edit, last_reviewed_on: e.target.value })} /></Field>
            </div>
          </fieldset>
          {warn && (
            <div role="alert" className="rounded-2xl border border-gold/60 bg-gold-soft/70 p-4 text-sm">
              <p className="font-semibold">This assessment is incomplete</p>
              <p className="mt-1 text-navy/80">It has {bankCount(edit.id)} of {edit.num_questions} questions. Learners would get a shorter test than advertised{edit.approved_by ? '' : ', and no medical approval is recorded'}. Publish anyway?</p>
              <div className="mt-3 flex gap-2"><button className="btn-outline btn-sm" onClick={() => setWarn(false)}>Keep as draft</button><Button className="btn-primary btn-sm" loading={busy} onClick={() => save(true)}>Publish anyway</Button></div>
            </div>
          )}
          <div className="flex justify-end gap-2"><button className="btn-outline" onClick={() => { setEdit(null); setWarn(false); }}>Cancel</button><Button className="btn-primary" loading={busy} onClick={() => save()}>Save</Button></div></div>}
      </Modal>

      <Modal open={!!bank} onClose={() => setBank(null)} title={bank ? `Questions: ${bank.title}` : ''} wide>
        {bank && <div className="space-y-5">
          <ol className="space-y-3">{qs.map((q, n) => <li key={q.id} className="rounded-xl border border-navy/10 p-3 text-sm"><div className="flex justify-between gap-3"><p className="font-medium">{n + 1}. {q.prompt} {q.category && <Badge>{q.category}</Badge>}</p><button className="shrink-0 text-xs font-semibold text-red-600" onClick={async () => { await run(() => backend.remove('assessment_questions', { id: q.id })); reload(); }}>Delete</button></div>
            <ul className="mt-1.5 space-y-0.5">{data.os.filter((o) => o.question_id === q.id).map((o) => <li key={o.id} className={o.is_correct ? 'font-semibold text-emerald-700' : 'text-navy/65'}>{o.is_correct ? '✓' : '·'} {o.label}</li>)}</ul></li>)}</ol>
          <div className="rounded-2xl bg-pale p-4"><p className="mb-3 font-semibold">Add question</p><div className="space-y-3">
            <input className="input" placeholder="Category (e.g. Hygiene, Compliance)" value={nq.category} onChange={(e) => setNq({ ...nq, category: e.target.value })} />
            <textarea className="input" rows={2} placeholder="Question" value={nq.prompt} onChange={(e) => setNq({ ...nq, prompt: e.target.value })} />
            {nq.opts.map((o, i) => <div key={i} className="flex items-center gap-2"><input type="radio" name="correct" className="accent-teal" checked={nq.correct === i} onChange={() => setNq({ ...nq, correct: i })} aria-label={`Option ${i + 1} is correct`} /><input className="input" placeholder={`Option ${i + 1}`} value={o} onChange={(e) => setNq({ ...nq, opts: nq.opts.map((x, j) => (j === i ? e.target.value : x)) })} /></div>)}
            <textarea className="input" rows={2} placeholder="Explanation shown after submission" value={nq.explanation} onChange={(e) => setNq({ ...nq, explanation: e.target.value })} />
            <Button className="btn-primary" loading={busy} onClick={addQ}>Add question</Button></div></div></div>}
      </Modal>
    </>
  );
}
