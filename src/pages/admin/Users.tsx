import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { backend, useQuery } from '@/lib/db';
import { Badge, Button, ErrorNote, Field, Modal, Notice, PageHeader, Spinner, Table, useAction, useToast } from '@/components/ui';
import { downloadCsv, ROLE_LABEL } from '@/lib/utils';
import type { Branch, Profile, RoleKey } from '@/lib/types';

const ROLES: RoleKey[] = ['learner', 'trainer', 'assessor', 'academy_admin', 'super_admin'];
export default function Users() {
  const { user, hasRole } = useAuth();
  const toast = useToast();
  const { busy, run } = useAction();
  const [q, setQ] = useState(''); const [role, setRole] = useState('');
  const [edit, setEdit] = useState<Profile | null>(null);
  const [creating, setCreating] = useState(false);
  const [nc, setNc] = useState<{ reg: string | null; doc: string | null; url: string | null } | null>(null);
  const [nf, setNf] = useState({ email: '', full_name: '', mobile: '', city: 'Bangalore', job_role: 'Skin Therapist', role: 'learner', password: '' });
  const { data, loading, error, reload } = useQuery(async () => {
    const [profiles, roles, branches] = await Promise.all([backend.select<Profile>('profiles', { order: ['full_name'] }), backend.select<{ user_id: string; role_key: RoleKey }>('user_roles'), backend.select<Branch>('branches')]);
    return { profiles, roles, branches };
  }, []);
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorNote message={error ?? 'Could not load users'} />;
  const rolesOf = (id: string) => data.roles.filter((r) => r.user_id === id).map((r) => r.role_key);
  const rows = data.profiles.filter((p) => (!q || `${p.full_name} ${p.email} ${p.mobile} ${p.learner_code}`.toLowerCase().includes(q.toLowerCase())) && (!role || (role === 'learner' ? rolesOf(p.id).length === 0 || rolesOf(p.id).includes('learner') : rolesOf(p.id).includes(role as RoleKey))));
  const open = async (p: Profile) => {
    setEdit(p); setNc(null);
    if (p.job_role === 'Staff Nurse') { try { const r = await backend.rpc<any[]>('get_nursing_credentials', { p_user: p.id }); setNc({ reg: r?.[0]?.nursing_reg_no ?? null, doc: r?.[0]?.nursing_doc_path ?? null, url: r?.[0]?.nursing_doc_path ? await backend.storage.signedUrl('learner-documents', r[0].nursing_doc_path) : null }); } catch { /* not permitted */ } }
  };
  const saveProfile = async () => { if (!edit) return; const ok = await run(() => backend.rpc('admin_update_profile', { p_user: edit.id, p_full_name: edit.full_name, p_mobile: edit.mobile, p_city: edit.city, p_branch: edit.branch_id, p_job_role: edit.job_role, p_learner_code: edit.learner_code, p_is_active: edit.is_active }), 'User updated'); if (ok) { setEdit(null); reload(); } };
  const toggleRole = async (id: string, r: RoleKey) => {
    if ((r === 'super_admin' || r === 'academy_admin') && !hasRole('super_admin')) { toast('Only a Super Admin can change admin roles', 'err'); return; }
    if (id === user!.id && r === 'super_admin') { toast('You cannot remove your own Super Admin role', 'err'); return; }
    await run(async () => { rolesOf(id).includes(r) ? await backend.remove('user_roles', { user_id: id, role_key: r }) : await backend.insert('user_roles', { user_id: id, role_key: r, assigned_by: user!.id }); }); reload();
  };
  const create = async () => { if (!nf.email.trim() || !nf.full_name.trim()) { toast('Name and email are required', 'err'); return; } const ok = await run(() => backend.manageUser('create', nf), 'User created'); if (ok) { setCreating(false); reload(); } };
  return (
    <>
      <PageHeader title="Users" subtitle="Learners, trainers, assessors and admins." actions={<><button className="btn-outline" onClick={() => downloadCsv('users.csv', rows.map((p) => ({ name: p.full_name, email: p.email, mobile: p.mobile, role: p.job_role, city: p.city, active: p.is_active, roles: rolesOf(p.id).join('|') })))}>Export CSV</button><button className="btn-primary" onClick={() => setCreating(true)}>Add user</button></>} />
      <div className="mb-4 flex flex-wrap gap-3"><input className="input max-w-xs" placeholder="Search name, email, mobile, ID" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search users" /><select className="input max-w-[200px]" value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role"><option value="">All roles</option>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></div>
      <Table>
        <thead><tr><th className="th">Name</th><th className="th">Contact</th><th className="th">Job role</th><th className="th">Access</th><th className="th">Status</th><th className="th" /></tr></thead>
        <tbody className="divide-y divide-navy/5">{rows.map((p) => <tr key={p.id}><td className="td font-medium">{p.full_name}<span className="block text-xs text-navy/50">{p.learner_code}</span></td><td className="td text-xs">{p.email}<br />{p.mobile}</td><td className="td">{p.job_role}</td><td className="td"><div className="flex flex-wrap gap-1">{rolesOf(p.id).filter((r) => r !== 'learner').map((r) => <Badge key={r} tone="teal">{ROLE_LABEL[r]}</Badge>)}{rolesOf(p.id).filter((r) => r !== 'learner').length === 0 && <Badge>Learner</Badge>}</div></td><td className="td">{p.is_active ? <Badge tone="green">Active</Badge> : <Badge tone="red">Disabled</Badge>}</td><td className="td text-right"><button className="font-semibold text-teal" onClick={() => open(p)}>Manage</button></td></tr>)}</tbody>
      </Table>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.full_name ?? ''} wide>
        {edit && <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name"><input className="input" value={edit.full_name} onChange={(e) => setEdit({ ...edit, full_name: e.target.value })} /></Field>
            <Field label="Mobile"><input className="input" value={edit.mobile ?? ''} onChange={(e) => setEdit({ ...edit, mobile: e.target.value })} /></Field>
            <Field label="City"><input className="input" value={edit.city ?? ''} onChange={(e) => setEdit({ ...edit, city: e.target.value })} /></Field>
            <Field label="Job role"><input className="input" value={edit.job_role ?? ''} onChange={(e) => setEdit({ ...edit, job_role: e.target.value })} /></Field>
            <Field label="Branch"><select className="input" value={edit.branch_id ?? ''} onChange={(e) => setEdit({ ...edit, branch_id: e.target.value || null })}><option value="">None</option>{data.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
            <Field label="Learner ID"><input className="input" value={edit.learner_code ?? ''} onChange={(e) => setEdit({ ...edit, learner_code: e.target.value })} /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-teal" checked={edit.is_active} onChange={(e) => setEdit({ ...edit, is_active: e.target.checked })} />Account active</label>
          <div><p className="label">Roles</p><div className="flex flex-wrap gap-2">{ROLES.filter((r) => r !== 'learner').map((r) => <button key={r} onClick={() => toggleRole(edit.id, r)} className={rolesOf(edit.id).includes(r) ? 'btn-primary btn-sm' : 'btn-outline btn-sm'}>{ROLE_LABEL[r]}</button>)}</div></div>
          {edit.job_role === 'Staff Nurse' && <Notice title="Nursing Council registration">{nc ? <>Number: <strong>{nc.reg ?? 'not provided'}</strong>. {nc.url ? <a className="font-semibold text-teal" href={nc.url} target="_blank" rel="noreferrer">Open document</a> : 'No document uploaded.'}</> : 'Not available to your role.'}</Notice>}
          <div className="flex flex-wrap justify-between gap-2"><button className="btn-outline" onClick={() => run(() => backend.manageUser('reset_access', { user_id: edit.id, email: edit.email }), 'Password reset sent')}>Send password reset</button><div className="flex gap-2"><button className="btn-outline" onClick={() => setEdit(null)}>Close</button><Button className="btn-primary" loading={busy} onClick={saveProfile}>Save</Button></div></div>
        </div>}
      </Modal>
      <Modal open={creating} onClose={() => setCreating(false)} title="Add user">
        <div className="space-y-4">
          {(['full_name', 'email', 'mobile', 'city', 'job_role'] as const).map((k) => <Field key={k} label={k.replace('_', ' ').replace(/^./, (c) => c.toUpperCase())}><input className="input" value={nf[k]} onChange={(e) => setNf({ ...nf, [k]: e.target.value })} /></Field>)}
          <Field label="Access role"><select className="input" value={nf.role} onChange={(e) => setNf({ ...nf, role: e.target.value })}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></Field>
          <Field label="Temporary password" hint="Leave blank to generate a temporary password."><input className="input" type="password" value={nf.password} onChange={(e) => setNf({ ...nf, password: e.target.value })} /></Field>
          <div className="flex justify-end gap-2"><button className="btn-outline" onClick={() => setCreating(false)}>Cancel</button><Button className="btn-primary" loading={busy} onClick={create}>Create</Button></div>
        </div>
      </Modal>
    </>
  );
}
