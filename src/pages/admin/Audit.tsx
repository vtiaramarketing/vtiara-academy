import { useState } from 'react';
import { backend, useQuery } from '@/lib/db';
import { ErrorNote, PageHeader, Spinner, Table } from '@/components/ui';
import { downloadCsv, fmtDateTime } from '@/lib/utils';
import type { AuditLog } from '@/lib/types';

export default function Audit() {
  const [q, setQ] = useState('');
  const { data, loading, error } = useQuery(() => backend.select<AuditLog>('audit_logs', { order: ['created_at', false], limit: 500 }), []);
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorNote message={error ?? 'Could not load audit log'} />;
  const rows = data.filter((r) => !q || JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHeader title="Audit log" subtitle="Who changed what, and when. Latest 500 entries." actions={<button className="btn-outline" onClick={() => downloadCsv('audit-log.csv', rows.map((r) => ({ when: r.created_at, actor: r.actor_name, action: r.action, entity: r.entity, entity_id: r.entity_id, details: JSON.stringify(r.details) })))}>Export CSV</button>} />
      <input className="input mb-4 max-w-sm" placeholder="Search actor, action, entity…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search audit log" />
      <Table>
        <thead><tr><th className="th">When</th><th className="th">Actor</th><th className="th">Action</th><th className="th">Entity</th><th className="th">Details</th></tr></thead>
        <tbody className="divide-y divide-navy/5">{rows.map((r) => <tr key={r.id}><td className="td whitespace-nowrap">{fmtDateTime(r.created_at)}</td><td className="td">{r.actor_name ?? '—'}</td><td className="td font-medium">{r.action}</td><td className="td">{r.entity}</td><td className="td max-w-xs truncate font-mono text-xs text-navy/60">{r.details ? JSON.stringify(r.details) : ''}</td></tr>)}</tbody>
      </Table>
      {rows.length === 0 && <p className="mt-4 text-sm text-navy/55">No matching entries.</p>}
    </>
  );
}
