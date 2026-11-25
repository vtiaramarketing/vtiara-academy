import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { backend, useQuery } from '@/lib/db';
import { Badge, Button, Disclaimer, Empty, ErrorNote, Notice, PageHeader, Spinner, Table, useAction, useToast } from '@/components/ui';
import { FileInput } from '@/pages/auth/Auth';
import { fmtDate, STATUS_LABEL, STATUS_TONE } from '@/lib/utils';
import type { Checklist, ChecklistItem, Course, Enrolment, ItemResult, PracticalAssessment, Profile } from '@/lib/types';

export default function Practicals() {
  const { enrolmentId } = useParams();
  return enrolmentId ? <Detail id={enrolmentId} /> : <List />;
}

function List() {
  const { data, loading, error } = useQuery(async () => {
    const [enrols, profiles, courses, practicals] = await Promise.all([backend.select<Enrolment>('course_enrolments'), backend.select<Profile>('profiles'), backend.select<Course>('courses'), backend.select<PracticalAssessment>('practical_assessments')]);
    return { enrols: enrols.filter((e) => courses.find((c) => c.id === e.course_id)?.requires_practical && e.status !== 'not_started'), profiles, courses, practicals };
  }, []);
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorNote message={error ?? 'Could not load'} />;
  const order = ['awaiting_approval', 'assessment_unlocked', 'needs_retake', 'session_booked', 'in_progress', 'certified'];
  const rows = [...data.enrols].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
  return (
    <>
      <PageHeader title="Practical reviews" subtitle="Record practical results and approve completion. Certificates are issued only after approval." />
      {rows.length === 0 ? <Empty title="No learners to review" /> : <Table><thead><tr><th className="th">Learner</th><th className="th">Course</th><th className="th">Status</th><th className="th">Practical</th><th className="th" /></tr></thead>
        <tbody className="divide-y divide-navy/5">{rows.map((e) => { const p = data.practicals.filter((x) => x.enrolment_id === e.id); const pend = p.some((x) => x.result === 'passed' && x.approval_status === 'pending');
          return <tr key={e.id}><td className="td font-medium">{data.profiles.find((x) => x.id === e.user_id)?.full_name}</td><td className="td">{data.courses.find((c) => c.id === e.course_id)?.title}</td><td className="td"><Badge tone={STATUS_TONE[e.status]}>{STATUS_LABEL[e.status]}</Badge></td><td className="td">{pend ? <Badge tone="gold">Needs approval</Badge> : p.length ? <Badge tone={p.every((x) => x.approval_status === 'approved') ? 'green' : 'slate'}>{p.every((x) => x.approval_status === 'approved') ? 'Approved' : p[0].result}</Badge> : <span className="text-navy/40">Not recorded</span>}</td><td className="td text-right"><Link className="font-semibold text-teal" to={`/admin/practicals/${e.id}`}>Open</Link></td></tr>; })}</tbody></Table>}
    </>
  );
}

function Detail({ id }: { id: string }) {
  const { user, isAdmin, hasRole } = useAuth();
  const nav = useNavigate(); const toast = useToast(); const { busy, run } = useAction();
  const [res, setRes] = useState<Record<string, ItemResult>>({});
  const [score, setScore] = useState(''); const [notes, setNotes] = useState(''); const [fb, setFb] = useState(''); const [retake, setRetake] = useState('');
  const [files, setFiles] = useState<File[]>([]); const [reject, setReject] = useState('');
  const { data, loading, error, reload } = useQuery(async () => {
    const [enrol] = await backend.select<Enrolment>('course_enrolments', { eq: { id } });
    const [course] = await backend.select<Course>('courses', { eq: { id: enrol.course_id } });
    const [learner] = await backend.select<Profile>('profiles', { eq: { id: enrol.user_id } });
    const cls = await backend.select<Checklist>('practical_checklists', { eq: { course_id: course.id } });
    const items = cls.length ? await backend.select<ChecklistItem>('practical_checklist_items', { in: { checklist_id: cls.map((c) => c.id) }, order: ['position'] }) : [];
    const pas = await backend.select<PracticalAssessment>('practical_assessments', { eq: { enrolment_id: id } });
    const att = await backend.select<any>('attendance', { eq: { user_id: enrol.user_id } });
    return { enrol, course, learner, cls, items, pas, att };
  }, [id]);
  const [cid, setCid] = useState<string | null>(null);
  useEffect(() => { if (data && !cid) setCid(data.cls[0]?.id ?? null); }, [data, cid]);
  const cl = data?.cls.find((c) => c.id === cid);
  const existing = data?.pas.find((p) => p.checklist_id === cid);
  useEffect(() => {
    if (!data || !cl) return;
    const m: Record<string, ItemResult> = {}; data.items.filter((i) => i.checklist_id === cl.id).forEach((i) => { m[i.id] = existing?.item_results.find((r) => r.item_id === i.id) ?? { item_id: i.id, pass: false, note: '' }; });
    setRes(m); setScore(existing?.score_pct != null ? String(existing.score_pct) : ''); setNotes(existing?.trainer_notes ?? ''); setFb(existing?.learner_feedback ?? ''); setRetake(existing?.retake_reason ?? '');
  }, [data, cl?.id, existing?.id]);
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorNote message={error ?? 'Not found'} />;
  const { enrol, course, learner, cls, items } = data;
  const myItems = items.filter((i) => i.checklist_id === cl?.id);
  const approved = existing?.approval_status === 'approved';
  const attended = data.att.some((a: any) => a.status === 'present');
  const canApprove = isAdmin || hasRole('trainer');
  const save = async () => { if (!cl) return; const ok = await run(async () => {
    const ev: string[] = []; for (const f of files) ev.push(await backend.storage.upload('practical-evidence', `${enrol.user_id}/${enrol.id}/${Date.now()}-${f.name}`, f));
    await backend.rpc('save_practical', { p_enrolment: enrol.id, p_checklist: cl.id, p_item_results: myItems.map((i) => res[i.id]), p_score: score === '' ? null : Number(score), p_trainer_notes: notes, p_learner_feedback: fb, p_evidence: ev.length ? ev : (existing?.evidence_paths ?? []), p_retake_reason: retake });
  }, 'Practical recorded'); if (ok) { setFiles([]); reload(); } };
  const approve = async (yes: boolean) => { if (!existing) return; const ok = await run(() => backend.rpc('approve_practical', { p_practical: existing.id, p_approve: yes, p_note: yes ? null : reject }), yes ? 'Approved. Certificate issued if all requirements are met.' : 'Practical sent back to the learner'); if (ok) { setReject(''); reload(); } };
  return (
    <>
      <PageHeader title={learner.full_name} subtitle={`${course.title} · ${STATUS_LABEL[enrol.status]}`} actions={<button className="btn-outline" onClick={() => nav('/admin/practicals')}>Back</button>} />
      <div className="mb-5 grid gap-3 sm:grid-cols-3 text-sm">
        <div className="card !p-4"><p className="text-xs text-navy/55">Attendance</p><p className="font-semibold">{course.requires_attendance ? (attended ? 'Present' : 'Not marked') : 'Not required'}</p></div>
        <div className="card !p-4"><p className="text-xs text-navy/55">Enrolled</p><p className="font-semibold">{fmtDate(enrol.enrolled_at)}</p></div>
        <div className="card !p-4"><p className="text-xs text-navy/55">Practical</p><p className="font-semibold">{existing ? `${existing.result} · ${existing.approval_status}` : 'Not recorded'}</p></div>
      </div>
      {cls.length === 0 || !cl ? <Notice title="No checklist">This course has no practical checklist.</Notice> : (
        <div className="card space-y-5">
          {cls.length > 1 && <select className="input max-w-sm" value={cid ?? ''} onChange={(e) => setCid(e.target.value)} aria-label="Checklist">{cls.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select>}
          <div><h2 className="font-semibold">{cl.title}</h2>{cl.description && <p className="text-sm text-navy/60">{cl.description}</p>}</div>
          <ul className="divide-y divide-navy/5">{myItems.map((i) => <li key={i.id} className="grid gap-2 py-3 sm:grid-cols-[1fr_auto]"><div><p className="text-sm font-medium">{i.label}{i.is_critical && <Badge tone="red" className="ml-2">Critical</Badge>}</p><input className="input mt-2 !py-1.5 text-sm" placeholder="Note (optional)" value={res[i.id]?.note ?? ''} onChange={(e) => setRes({ ...res, [i.id]: { ...res[i.id], note: e.target.value } })} disabled={approved} /></div>
            <div className="flex items-start gap-2"><button disabled={approved} className={res[i.id]?.pass ? 'btn-primary btn-sm' : 'btn-outline btn-sm'} onClick={() => setRes({ ...res, [i.id]: { ...res[i.id], pass: true } })}>Pass</button><button disabled={approved} className={res[i.id] && !res[i.id].pass ? 'btn-primary btn-sm !bg-red-600' : 'btn-outline btn-sm'} onClick={() => setRes({ ...res, [i.id]: { ...res[i.id], pass: false } })}>Not yet</button></div></li>)}</ul>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="sc">Score % {cl.min_score_pct != null && `(minimum ${cl.min_score_pct}%)`}</label><input id="sc" type="number" min={0} max={100} className="input" value={score} onChange={(e) => setScore(e.target.value)} disabled={approved} /></div>
            {cl.requires_evidence && <FileInput label="Evidence (photo/video, required to pass)" file={files[0] ?? null} onChange={(f) => setFiles(f ? [f] : [])} />}
          </div>
          <div><label className="label" htmlFor="tn">Private trainer notes (not shown to learner)</label><textarea id="tn" className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={approved} /></div>
          <div><label className="label" htmlFor="lf">Feedback for learner</label><textarea id="lf" className="input" rows={2} value={fb} onChange={(e) => setFb(e.target.value)} disabled={approved} /></div>
          <div><label className="label" htmlFor="rt">Retake reason (required if any item is not passed)</label><input id="rt" className="input" value={retake} onChange={(e) => setRetake(e.target.value)} disabled={approved} /></div>
          {!approved && <Button className="btn-primary" loading={busy} onClick={save}>Save practical result</Button>}
          {existing && existing.result === 'passed' && (
            <div className="rounded-2xl bg-pale p-4">
              <p className="mb-2 text-sm font-semibold">Trainer approval</p>
              {approved ? <Notice tone="green" title="Approved">Approved {fmtDate(existing.approved_at)}. The certificate is issued once every other requirement is complete.</Notice> : canApprove ? (
                <div className="space-y-3"><p className="text-sm text-navy/70">Approve only after you have confirmed attendance and observed the practical in person.</p>
                  <div className="flex flex-wrap items-center gap-2"><Button className="btn-primary" loading={busy} onClick={() => approve(true)}>Approve completion</Button><input className="input max-w-xs" placeholder="Reason to send back" value={reject} onChange={(e) => setReject(e.target.value)} aria-label="Rejection reason" /><button className="btn-outline" onClick={() => reject.trim() ? approve(false) : toast('Enter a reason first', 'err')}>Send back</button></div></div>
              ) : <p className="text-sm text-navy/60">Waiting for a trainer or admin to approve.</p>}
            </div>
          )}
        </div>
      )}
      <div className="mt-5"><Disclaimer /></div>
    </>
  );
}
