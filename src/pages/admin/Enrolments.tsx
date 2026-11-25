import { useState } from 'react';
import { backend, useQuery } from '@/lib/db';
import { Badge, Button, ErrorNote, Modal, PageHeader, Spinner, Table, useAction } from '@/components/ui';
import { ACCESS_LABEL, ACCESS_TONE, downloadCsv, fmtDate, fmtDateTime } from '@/lib/utils';
import type { AccessStatus, Course, Enrolment, EnrolmentHistory, Profile } from '@/lib/types';

const NEXT: Record<AccessStatus, { to: AccessStatus; label: string; danger?: boolean; needsNote?: boolean }[]> = {
  pending: [{ to: 'approved', label: 'Approve' }, { to: 'active', label: 'Approve & activate' }, { to: 'cancelled', label: 'Reject', danger: true, needsNote: true }],
  approved: [{ to: 'active', label: 'Activate' }, { to: 'cancelled', label: 'Cancel', danger: true, needsNote: true }],
  active: [{ to: 'approved', label: 'Deactivate' }, { to: 'completed', label: 'Mark completed' }, { to: 'cancelled', label: 'Cancel', danger: true, needsNote: true }],
  completed: [{ to: 'active', label: 'Reopen' }],
  cancelled: [{ to: 'pending', label: 'Reopen request' }],
};

export default function Enrolments() {
  const { busy, run } = useAction();
  const [q, setQ] = useState(''); const [st, setSt] = useState<string>('pending');
  const [act, setAct] = useState<{ e: Enrolment; to: AccessStatus; label: string; needsNote?: boolean } | null>(null);
  const [note, setNote] = useState(''); const [err, setErr] = useState('');
  const [hist, setHist] = useState<{ e: Enrolment; rows: EnrolmentHistory[] } | null>(null);
  const { data, loading, error, reload } = useQuery(async () => {
    const [enrols, profiles, courses] = await Promise.all([backend.select<Enrolment>('course_enrolments', { order: ['enrolled_at', false] }), backend.select<Profile>('profiles'), backend.select<Course>('courses')]);
    return { enrols, profiles, courses };
  }, []);
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorNote message={error ?? 'Could not load enrolments'} />;
  const who = (id: string) => data.profiles.find((p) => p.id === id);
  const title = (id: string) => data.courses.find((c) => c.id === id)?.title ?? '';
  const count = (s: string) => data.enrols.filter((e) => e.access_status === s).length;
  const rows = data.enrols.filter((e) => (!st || e.access_status === st) && (!q || `${who(e.user_id)?.full_name} ${who(e.user_id)?.email} ${title(e.course_id)}`.toLowerCase().includes(q.toLowerCase())));

  const confirm = async () => {
    if (!act) return;
    if (act.needsNote && !note.trim()) { setErr('Please enter a reason.'); return; }
    const ok = await run(() => backend.rpc('set_enrolment_access', { p_enrolment: act.e.id, p_status: act.to, p_note: note.trim() || null }), `Enrolment ${ACCESS_LABEL[act.to].toLowerCase()}`);
    if (ok) { setAct(null); setNote(''); setErr(''); reload(); }
  };
  const openHistory = async (e: Enrolment) => setHist({ e, rows: await backend.select<EnrolmentHistory>('enrolment_status_history', { eq: { enrolment_id: e.id }, order: ['created_at', false] }) });

  return (
    <>
      <PageHeader title="Enrolments" subtitle="Review requests, activate access and keep a record of every status change."
        actions={<button className="btn-outline" onClick={() => downloadCsv('enrolments.csv', rows.map((e) => ({ learner: who(e.user_id)?.full_name, email: who(e.user_id)?.email, course: title(e.course_id), mode: e.mode, access: e.access_status, learning_status: e.status, requested: e.enrolled_at })))}>Export CSV</button>} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(['pending', 'approved', 'active', 'completed', 'cancelled'] as AccessStatus[]).map((s) => (
          <button key={s} onClick={() => setSt(s)} className={st === s ? 'btn-primary btn-sm' : 'btn-outline btn-sm'}>{ACCESS_LABEL[s]} <span className="ml-1 opacity-70">{count(s)}</span></button>
        ))}
        <button onClick={() => setSt('')} className={st === '' ? 'btn-primary btn-sm' : 'btn-outline btn-sm'}>All</button>
        <input className="input ml-auto max-w-xs" placeholder="Search learner or course" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search enrolments" />
      </div>
      <Table>
        <thead><tr><th className="th">Learner</th><th className="th">Course</th><th className="th">Mode</th><th className="th">Requested</th><th className="th">Access</th><th className="th" /></tr></thead>
        <tbody className="divide-y divide-navy/5">{rows.map((e) => <tr key={e.id}>
          <td className="td font-medium">{who(e.user_id)?.full_name ?? 'Learner'}<span className="block text-xs text-navy/50">{who(e.user_id)?.email}</span></td>
          <td className="td">{title(e.course_id)}</td><td className="td capitalize">{e.mode}</td><td className="td">{fmtDate(e.enrolled_at)}</td>
          <td className="td"><Badge tone={ACCESS_TONE[e.access_status]}>{ACCESS_LABEL[e.access_status]}</Badge></td>
          <td className="td whitespace-nowrap text-right text-sm font-semibold">
            {NEXT[e.access_status].map((n) => <button key={n.to + n.label} className={`mr-3 ${n.danger ? 'text-red-600' : 'text-teal'}`} onClick={() => { setNote(''); setErr(''); setAct({ e, to: n.to, label: n.label, needsNote: n.needsNote }); }}>{n.label}</button>)}
            <button className="text-navy/55" onClick={() => openHistory(e)}>History</button>
          </td></tr>)}</tbody>
      </Table>
      {rows.length === 0 && <p className="mt-4 text-sm text-navy/55">No enrolments in this view.</p>}

      <Modal open={!!act} onClose={() => setAct(null)} title={act ? `${act.label}: ${who(act.e.user_id)?.full_name ?? ''}` : ''}>
        {act && <div className="space-y-4 text-sm">
          <p>{title(act.e.course_id)}</p>
          <div><label className="label" htmlFor="en">{act.needsNote ? 'Reason (required, shown to the learner)' : 'Note (optional)'}</label><textarea id="en" className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />{err && <p className="mt-1 text-xs text-red-600">{err}</p>}</div>
          <div className="flex justify-end gap-2"><button className="btn-outline" onClick={() => setAct(null)}>Cancel</button><Button className="btn-primary" loading={busy} onClick={confirm}>Confirm</Button></div>
        </div>}
      </Modal>
      <Modal open={!!hist} onClose={() => setHist(null)} title="Status history">
        {hist && (hist.rows.length === 0 ? <p className="text-sm text-navy/60">No history recorded.</p> : <ol className="space-y-3 text-sm">{hist.rows.map((h) => <li key={h.id} className="rounded-xl bg-pale p-3"><p className="font-semibold">{h.from_status ? `${ACCESS_LABEL[h.from_status]} → ` : ''}{ACCESS_LABEL[h.to_status]}</p><p className="text-xs text-navy/55">{h.changed_by_name ?? 'System'} · {fmtDateTime(h.created_at)}</p>{h.note && <p className="mt-1">{h.note}</p>}</li>)}</ol>)}
      </Modal>
    </>
  );
}
