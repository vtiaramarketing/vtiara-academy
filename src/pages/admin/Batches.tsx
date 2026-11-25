import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { backend, useQuery } from '@/lib/db';
import { Badge, Button, ErrorNote, Field, Modal, PageHeader, Spinner, Table, useAction } from '@/components/ui';
import { fmtDate, fmtTime } from '@/lib/utils';
import type { Batch, BatchAvailability, Booking, Branch, Course, Profile } from '@/lib/types';

const blank = (c?: string): Partial<Batch> => ({ course_id: c, title: '', starts_on: '', start_time: '10:00', end_time: '17:00', capacity: 12, mode: 'academy', status: 'open' });
export default function Batches() {
  const { isAdmin } = useAuth();
  const { busy, run } = useAction();
  const [edit, setEdit] = useState<Partial<Batch> | null>(null);
  const [roster, setRoster] = useState<BatchAvailability | null>(null);
  const { data, loading, error, reload } = useQuery(async () => {
    const [batches, courses, branches, roles, profiles, bookings, att] = await Promise.all([
      backend.select<BatchAvailability>('v_batch_availability', { order: ['starts_on'] }), backend.select<Course>('courses'), backend.select<Branch>('branches'),
      backend.select<{ user_id: string; role_key: string }>('user_roles'), backend.select<Profile>('profiles'),
      backend.select<Booking>('batch_bookings'), backend.select<{ batch_id: string; user_id: string; status: string }>('attendance'),
    ]);
    return { batches, courses, branches, trainers: roles.filter((r) => r.role_key === 'trainer').map((r) => r.user_id), profiles, bookings, att };
  }, []);
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorNote message={error ?? 'Could not load batches'} />;
  const nameOf = (id: string) => data.profiles.find((p) => p.id === id)?.full_name ?? 'Learner';
  const save = async () => { if (!edit?.title?.trim() || !edit.starts_on || !edit.course_id) return; const { branch_name, trainer_name, seats_taken, waitlist_count, ...row } = edit as any;
    const ok = await run(async () => { edit.id ? await backend.update('batches', { id: edit.id }, row) : await backend.insert('batches', row); }, 'Batch saved'); if (ok) { setEdit(null); reload(); } };
  const mark = (b: string, u: string, status: string) => run(() => backend.rpc('mark_attendance', { p_batch: b, p_user: u, p_status: status }), 'Attendance recorded').then(reload);
  const setBk = (b: string, u: string, status: string) => run(() => backend.rpc('set_booking_status', { p_batch: b, p_user: u, p_status: status })).then(reload);
  const list = roster ? data.bookings.filter((x) => x.batch_id === roster.id && x.status !== 'cancelled') : [];
  return (
    <>
      <PageHeader title="Batches" subtitle="Academy sessions, rosters and attendance." actions={isAdmin ? <button className="btn-primary" onClick={() => setEdit(blank(data.courses.find((c) => c.requires_attendance)?.id))}>New batch</button> : undefined} />
      <Table>
        <thead><tr><th className="th">Batch</th><th className="th">Date</th><th className="th">Branch</th><th className="th">Trainer</th><th className="th">Seats</th><th className="th" /></tr></thead>
        <tbody className="divide-y divide-navy/5">{data.batches.map((b) => <tr key={b.id}><td className="td font-medium">{b.title}<span className="block text-xs text-navy/50">{data.courses.find((c) => c.id === b.course_id)?.title}</span></td><td className="td">{fmtDate(b.starts_on)}<span className="block text-xs text-navy/50">{fmtTime(b.start_time)}–{fmtTime(b.end_time)}</span></td><td className="td">{b.branch_name}</td><td className="td">{b.trainer_name ?? '—'}</td><td className="td"><Badge tone={b.seats_taken >= b.capacity ? 'red' : 'green'}>{b.seats_taken}/{b.capacity}</Badge>{b.waitlist_count > 0 && <span className="ml-2 text-xs text-navy/55">+{b.waitlist_count} waiting</span>}</td><td className="td whitespace-nowrap text-right font-semibold text-teal"><button className="mr-3" onClick={() => setRoster(b)}>Roster</button>{isAdmin && <button onClick={() => setEdit(b)}>Edit</button>}</td></tr>)}</tbody>
      </Table>
      <Modal open={!!roster} onClose={() => setRoster(null)} title={roster ? `Roster: ${roster.title}` : ''} wide>
        {roster && (list.length === 0 ? <p className="text-sm text-navy/60">No bookings yet.</p> : <ul className="divide-y divide-navy/5">{list.map((x) => { const present = data.att.find((a) => a.batch_id === roster.id && a.user_id === x.user_id)?.status; return <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><span><strong>{nameOf(x.user_id)}</strong> <Badge tone={x.status === 'waitlist' ? 'gold' : x.status === 'attended' ? 'green' : x.status === 'no_show' ? 'red' : 'blue'}>{x.status.replace('_', ' ')}</Badge></span>
          <span className="flex gap-2">{x.status === 'waitlist' && <button className="btn-outline btn-sm" onClick={() => setBk(roster.id, x.user_id, 'booked')}>Confirm seat</button>}{x.status !== 'waitlist' && <><button className={present === 'present' ? 'btn-primary btn-sm' : 'btn-outline btn-sm'} onClick={() => mark(roster.id, x.user_id, 'present')}>Present</button><button className={present === 'no_show' || present === 'absent' ? 'btn-primary btn-sm !bg-red-600' : 'btn-outline btn-sm'} onClick={() => mark(roster.id, x.user_id, 'no_show')}>No-show</button></>}</span></li>; })}</ul>)}
      </Modal>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit batch' : 'New batch'} wide>
        {edit && <div className="space-y-4"><div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title"><input className="input" value={edit.title ?? ''} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></Field>
          <Field label="Course"><select className="input" value={edit.course_id ?? ''} onChange={(e) => setEdit({ ...edit, course_id: e.target.value })}>{data.courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></Field>
          <Field label="Date"><input type="date" className="input" value={edit.starts_on ?? ''} onChange={(e) => setEdit({ ...edit, starts_on: e.target.value })} /></Field>
          <Field label="Capacity"><input type="number" min={1} className="input" value={edit.capacity ?? 12} onChange={(e) => setEdit({ ...edit, capacity: Number(e.target.value) })} /></Field>
          <Field label="Start"><input type="time" className="input" value={(edit.start_time ?? '').slice(0, 5)} onChange={(e) => setEdit({ ...edit, start_time: e.target.value })} /></Field>
          <Field label="End"><input type="time" className="input" value={(edit.end_time ?? '').slice(0, 5)} onChange={(e) => setEdit({ ...edit, end_time: e.target.value })} /></Field>
          <Field label="Branch"><select className="input" value={edit.branch_id ?? ''} onChange={(e) => setEdit({ ...edit, branch_id: e.target.value || null })}><option value="">None</option>{data.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
          <Field label="Trainer"><select className="input" value={edit.trainer_id ?? ''} onChange={(e) => setEdit({ ...edit, trainer_id: e.target.value || null })}><option value="">Unassigned</option>{data.trainers.map((t) => <option key={t} value={t}>{nameOf(t)}</option>)}</select></Field>
          <Field label="Status"><select className="input" value={edit.status ?? 'open'} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>{['open', 'full', 'completed', 'cancelled'].map((s) => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Location"><input className="input" value={edit.location ?? ''} onChange={(e) => setEdit({ ...edit, location: e.target.value })} /></Field>
        </div>
          <Field label="What to bring"><textarea className="input" rows={2} value={edit.what_to_bring ?? ''} onChange={(e) => setEdit({ ...edit, what_to_bring: e.target.value })} /></Field>
          <Field label="Practical requirements"><textarea className="input" rows={2} value={edit.practical_requirements ?? ''} onChange={(e) => setEdit({ ...edit, practical_requirements: e.target.value })} /></Field>
          <div className="flex justify-end gap-2"><button className="btn-outline" onClick={() => setEdit(null)}>Cancel</button><Button className="btn-primary" loading={busy} onClick={save}>Save batch</Button></div></div>}
      </Modal>
    </>
  );
}
