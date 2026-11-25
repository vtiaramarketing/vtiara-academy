import { useMemo, useState } from 'react';
import { backend, useQuery } from '@/lib/db';
import { Badge, Button, Empty, ErrorNote, Field, Modal, PageHeader, Spinner, Table, useAction } from '@/components/ui';
import { waLink, telLink } from '@/lib/settings';
import { fmtDateTime } from '@/lib/utils';
import type { Enquiry, EnquiryStatus } from '@/lib/types';

const STATUS: Record<EnquiryStatus, { label: string; tone: 'blue' | 'gold' | 'green' | 'red' | 'slate'; help: string }> = {
  new: { label: 'New', tone: 'blue', help: 'Nobody has contacted this person yet.' },
  contacted: { label: 'Contacted', tone: 'gold', help: 'We have replied or called.' },
  counselling_scheduled: { label: 'Counselling scheduled', tone: 'gold', help: 'A counselling call is booked.' },
  enrolled: { label: 'Enrolled', tone: 'green', help: 'They joined a course.' },
  not_interested: { label: 'Not interested', tone: 'slate', help: 'They chose not to proceed.' },
  closed: { label: 'Closed', tone: 'slate', help: 'No further action needed.' },
};
const TYPE = { general: 'General', counselling_call: 'Counselling call', course: 'Course enquiry' } as const;

export default function Enquiries() {
  const { busy, run } = useAction();
  const [filter, setFilter] = useState<EnquiryStatus | 'all'>('all');
  const [open, setOpen] = useState<Enquiry | null>(null);
  const [status, setStatus] = useState<EnquiryStatus>('new');
  const [notes, setNotes] = useState('');
  const { data, loading, error, reload } = useQuery(() => backend.select<Enquiry>('enquiries', { order: ['created_at', false] }), []);
  const rows = useMemo(() => (data ?? []).filter((e) => filter === 'all' || e.status === filter), [data, filter]);
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorNote message={error ?? 'Could not load enquiries'} />;
  const fresh = data.filter((e) => e.status === 'new').length;
  const show = (e: Enquiry) => { setOpen(e); setStatus(e.status); setNotes(e.admin_notes ?? ''); };
  const save = async () => {
    if (!open) return;
    const ok = await run(() => backend.update('enquiries', { id: open.id }, { status, admin_notes: notes.trim() || null }), 'Enquiry updated');
    if (ok) { setOpen(null); reload(); }
  };
  return (
    <>
      <PageHeader title="Enquiries" subtitle={`${fresh} new · ${data.length} total. Reply on the channel each person chose.`} />
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {(['all', ...Object.keys(STATUS)] as const).map((k) => (
          <button key={k} onClick={() => setFilter(k as EnquiryStatus | 'all')} aria-pressed={filter === k} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${filter === k ? 'border-teal bg-teal text-white' : 'border-navy/15 bg-white text-navy/75 hover:border-teal'}`}>
            {k === 'all' ? 'All' : STATUS[k as EnquiryStatus].label}
          </button>
        ))}
      </div>
      {rows.length === 0 ? <Empty title={data.length ? 'No enquiries with this status' : 'No enquiries yet'}>Enquiries from the website form appear here.</Empty> : (
        <Table>
          <thead><tr><th className="th">Received</th><th className="th">Name</th><th className="th">Interest</th><th className="th">Prefers</th><th className="th">Status</th><th className="th"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody className="divide-y divide-navy/5">
            {rows.map((e) => (
              <tr key={e.id}>
                <td className="td whitespace-nowrap text-xs text-navy/65">{fmtDateTime(e.created_at)}</td>
                <td className="td"><span className="font-medium">{e.name}</span><span className="block text-xs text-navy/60">{e.phone}</span></td>
                <td className="td text-sm">{e.course_label ?? TYPE[e.enquiry_type]}</td>
                <td className="td text-sm capitalize">{e.preferred_contact}</td>
                <td className="td"><Badge tone={STATUS[e.status].tone}>{STATUS[e.status].label}</Badge></td>
                <td className="td text-right"><button className="font-semibold text-teal" onClick={() => show(e)} aria-label={`Open enquiry from ${e.name}`}>Open</button></td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `Enquiry from ${open.name}` : ''}>
        {open && (
          <div className="space-y-4 text-sm">
            <dl className="grid grid-cols-[110px_1fr] gap-y-1.5">
              <dt className="text-navy/60">Phone</dt><dd><a className="font-semibold text-teal" href={telLink(open.phone) ?? undefined}>{open.phone}</a></dd>
              <dt className="text-navy/60">Email</dt><dd>{open.email ? <a className="font-semibold text-teal" href={`mailto:${open.email}`}>{open.email}</a> : 'Not given'}</dd>
              <dt className="text-navy/60">Interested in</dt><dd>{open.course_label ?? TYPE[open.enquiry_type]}</dd>
              <dt className="text-navy/60">Prefers</dt><dd className="capitalize">{open.preferred_contact}</dd>
              <dt className="text-navy/60">Received</dt><dd>{fmtDateTime(open.created_at)}</dd>
            </dl>
            {open.message && <p className="rounded-xl bg-pale p-3">{open.message}</p>}
            <div className="flex flex-wrap gap-2">
              {waLink(open.phone) && <a className="btn-outline btn-sm" href={waLink(open.phone, `Hi ${open.name}, this is VTIARA Training Academy replying to your enquiry.`) ?? undefined} target="_blank" rel="noreferrer">Reply on WhatsApp</a>}
              {open.email && <a className="btn-outline btn-sm" href={`mailto:${open.email}`}>Reply by email</a>}
            </div>
            <Field label="Status" hint={STATUS[status].help}>
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value as EnquiryStatus)}>{Object.entries(STATUS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}</select>
            </Field>
            <Field label="Internal notes"><textarea className="input min-h-20" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
            <div className="flex justify-end gap-2"><button className="btn-outline" onClick={() => setOpen(null)}>Cancel</button><Button className="btn-primary" loading={busy} onClick={save}>Save</Button></div>
          </div>
        )}
      </Modal>
    </>
  );
}
