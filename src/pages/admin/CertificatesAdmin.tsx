import { useState } from 'react';
import { backend, useQuery } from '@/lib/db';
import { Badge, Button, ErrorNote, Modal, PageHeader, Spinner, Table, useAction } from '@/components/ui';
import { CERT_LABEL, CERT_TONE, downloadCsv, fmtDate } from '@/lib/utils';
import type { Certificate } from '@/lib/types';

type Act = 'approve' | 'revoke' | 'extend' | 'reissue';
export default function CertificatesAdmin() {
  const { busy, run } = useAction();
  const [q, setQ] = useState(''); const [st, setSt] = useState('');
  const [act, setAct] = useState<{ cert: Certificate; action: Act } | null>(null);
  const [reason, setReason] = useState(''); const [months, setMonths] = useState(12);
  const { data, loading, error, reload } = useQuery(async () => { await backend.rpc('sync_certificate_statuses').catch(() => {}); return backend.select<Certificate>('certificates', { order: ['created_at', false] }); }, []);
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorNote message={error ?? 'Could not load certificates'} />;
  const rows = data.filter((c) => (!st || c.status === st) && (!q || `${c.cert_no} ${c.learner_name} ${c.course_title}`.toLowerCase().includes(q.toLowerCase())));
  const go = async () => { if (!act) return; const ok = await run(() => backend.rpc('admin_certificate_action', { p_cert: act.cert.id, p_action: act.action, p_reason: reason || null, p_months: months }), 'Done'); if (ok) { setAct(null); setReason(''); reload(); } };
  return (
    <>
      <PageHeader title="Certificates" subtitle="Approve, revoke, extend or reissue. Every action is recorded in the audit log." actions={<button className="btn-outline" onClick={() => downloadCsv('certificates.csv', rows.map((c) => ({ cert_no: c.cert_no, learner: c.learner_name, course: c.course_title, status: c.status, issued_on: c.issued_on, valid_until: c.valid_until })))}>Export CSV</button>} />
      <div className="mb-4 flex flex-wrap gap-3"><input className="input max-w-xs" placeholder="Search number, learner, course" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search certificates" /><select className="input max-w-[200px]" value={st} onChange={(e) => setSt(e.target.value)} aria-label="Status"><option value="">All statuses</option>{Object.entries(CERT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
      <Table>
        <thead><tr><th className="th">Number</th><th className="th">Learner</th><th className="th">Course</th><th className="th">Issued</th><th className="th">Valid until</th><th className="th">Status</th><th className="th" /></tr></thead>
        <tbody className="divide-y divide-navy/5">{rows.map((c) => <tr key={c.id}><td className="td font-mono text-xs">{c.cert_no}</td><td className="td">{c.learner_name}</td><td className="td">{c.course_title}</td><td className="td">{fmtDate(c.issued_on)}</td><td className="td">{c.valid_until ? fmtDate(c.valid_until) : 'Not specified'}</td><td className="td"><Badge tone={CERT_TONE[c.status]}>{CERT_LABEL[c.status]}</Badge></td>
          <td className="td whitespace-nowrap text-right text-sm font-semibold text-teal">
            {c.status === 'awaiting_approval' && <button className="mr-3" onClick={() => setAct({ cert: c, action: 'approve' })}>Approve</button>}
            {c.status !== 'awaiting_approval' && <><button className="mr-3" onClick={() => setAct({ cert: c, action: 'extend' })}>Extend</button><button className="mr-3" onClick={() => setAct({ cert: c, action: 'reissue' })}>Reissue</button></>}
            {c.status !== 'revoked' && <button className="text-red-600" onClick={() => setAct({ cert: c, action: 'revoke' })}>Revoke</button>}
          </td></tr>)}</tbody>
      </Table>
      {rows.length === 0 && <p className="mt-4 text-sm text-navy/55">No certificates match.</p>}
      <Modal open={!!act} onClose={() => setAct(null)} title={act ? `${act.action[0].toUpperCase() + act.action.slice(1)} certificate` : ''}>
        {act && <div className="space-y-4 text-sm"><p><strong>{act.cert.learner_name}</strong> · {act.cert.course_title}<br /><span className="font-mono text-xs">{act.cert.cert_no}</span></p>
          {act.action === 'revoke' && <div><label className="label" htmlFor="rr">Reason (required)</label><textarea id="rr" className="input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></div>}
          {act.action === 'extend' && <div><label className="label" htmlFor="em">Extend by (months)</label><input id="em" type="number" min={1} className="input" value={months} onChange={(e) => setMonths(Number(e.target.value))} /></div>}
          {act.action === 'reissue' && <p className="text-navy/65">The current certificate is revoked and a new number is issued.</p>}
          {act.action === 'approve' && <p className="text-navy/65">Approving issues the certificate to the learner now.</p>}
          <div className="flex justify-end gap-2"><button className="btn-outline" onClick={() => setAct(null)}>Cancel</button><Button className={act.action === 'revoke' ? 'btn-primary !bg-red-600' : 'btn-primary'} loading={busy} onClick={go}>Confirm</Button></div></div>}
      </Modal>
    </>
  );
}
