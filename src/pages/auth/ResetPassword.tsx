import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { backend } from '@/lib/db';
import { Button, ErrorNote, Field, Logo, useAction } from '@/components/ui';
import { usePageMeta } from '@/lib/seo';

export default function ResetPassword() {
  usePageMeta('Set a new password', 'Choose a new password for your VTIARA Training Academy account.', { noindex: true });
  const nav = useNavigate();
  const { busy, run } = useAction();
  const [pw, setPw] = useState(''); const [pw2, setPw2] = useState(''); const [err, setErr] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    if (pw.length < 8) return setErr('Use at least 8 characters.');
    if (pw !== pw2) return setErr('The two passwords do not match.');
    const ok = await run(() => backend.auth.updatePassword(pw), 'Password updated');
    if (ok) nav('/app/dashboard', { replace: true });
  };
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-6 flex justify-center"><Logo /></div>
      <form onSubmit={submit} className="card space-y-4">
        <h1 className="font-display text-2xl font-semibold">Set a new password</h1>
        <p className="text-sm text-navy/65">Open this page from the link in your reset email, then choose a new password.</p>
        {err && <ErrorNote message={err} />}
        <Field label="New password" htmlFor="np"><input id="np" type="password" autoComplete="new-password" className="input" value={pw} onChange={(e) => setPw(e.target.value)} required /></Field>
        <Field label="Confirm password" htmlFor="np2"><input id="np2" type="password" autoComplete="new-password" className="input" value={pw2} onChange={(e) => setPw2(e.target.value)} required /></Field>
        <Button className="btn-primary w-full" loading={busy} type="submit">Update password</Button>
        <p className="text-center text-sm"><Link to="/login" className="text-teal">Back to sign in</Link></p>
      </form>
    </div>
  );
}
