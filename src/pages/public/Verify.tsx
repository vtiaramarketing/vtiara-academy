import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BadgeCheck, ShieldAlert, ShieldX, Clock, Search, Lock } from 'lucide-react';
import { backend } from '@/lib/db';
import { Spinner } from '@/components/ui';
import { CERT_LABEL, cn, fmtDate } from '@/lib/utils';
import type { Verification } from '@/lib/types';
import { usePageMeta } from '@/lib/seo';

export default function Verify() {
  usePageMeta('Verify a certificate', 'Check a VTIARA Training Academy certificate by ID or QR code. Shows the name, course, dates and validity status only.');
  const { certNo } = useParams();
  const nav = useNavigate();
  const [input, setInput] = useState(certNo ?? '');
  const [result, setResult] = useState<Verification | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setInput(certNo ?? '');
    if (!certNo) { setResult(undefined); return; }
    setBusy(true); setErr(null);
    backend.rpc<Verification[]>('verify_certificate', { p_cert_no: certNo })
      .then((r) => setResult(r?.[0] ?? null))
      .catch((e) => setErr(e.message))
      .finally(() => setBusy(false));
  }, [certNo]);

  const tone = result?.status === 'valid' ? 'ok' : result?.status === 'awaiting_approval' ? 'wait' : 'bad';
  const Icon = tone === 'ok' ? BadgeCheck : tone === 'wait' ? Clock : ShieldX;

  return (
    <div className="section max-w-3xl py-14">
      <p className="eyebrow">Certificate verification</p>
      <h1 className="mt-2 font-display text-4xl font-semibold">Verify a VTIARA certificate</h1>
      <p className="mt-2 text-navy/70">Enter the certificate ID printed under the QR code, or scan the QR code to land here directly.</p>

      <form className="mt-8 flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); if (input.trim()) nav(`/verify/${encodeURIComponent(input.trim())}`); }}>
        <input className="input sm:flex-1" value={input} onChange={(e) => setInput(e.target.value)} placeholder="VTA-CC-2026-0001-XXXX" aria-label="Certificate ID" autoFocus />
        <button className="btn-primary"><Search className="h-4 w-4" />Verify</button>
      </form>

      <div className="mt-8" aria-live="polite">
        {busy && <Spinner label="Checking certificate…" />}
        {err && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{err}</p>}
        {!busy && result === null && (
          <div className="card flex items-start gap-4 border-red-100">
            <ShieldAlert className="h-8 w-8 shrink-0 text-red-500" />
            <div><p className="font-semibold">No certificate found for “{certNo}”</p><p className="mt-1 text-sm text-navy/65">Check the ID for typing mistakes. If you believe this is an error, contact the academy.</p></div>
          </div>
        )}
        {!busy && result && (
          <div className={cn('overflow-hidden rounded-3xl border shadow-card', tone === 'ok' ? 'border-emerald-200' : tone === 'wait' ? 'border-gold/50' : 'border-red-200')}>
            <div className={cn('flex items-center gap-4 px-6 py-5', tone === 'ok' ? 'bg-emerald-50' : tone === 'wait' ? 'bg-gold-soft' : 'bg-red-50')}>
              <Icon className={cn('h-10 w-10', tone === 'ok' ? 'text-emerald-600' : tone === 'wait' ? 'text-amber-600' : 'text-red-600')} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-navy/55">Validity status</p>
                <p className="font-display text-2xl font-semibold">{CERT_LABEL[result.status]}</p>
              </div>
            </div>
            <dl className="grid gap-5 bg-white p-6 sm:grid-cols-2">
              <Row k="Learner" v={result.learner_name} />
              <Row k="Course" v={result.certificate_title ? `${result.course_title} — ${result.certificate_title}` : result.course_title} />
              <Row k="Issue date" v={fmtDate(result.issued_on)} />
              <Row k="Valid until" v={result.valid_until ? fmtDate(result.valid_until) : result.status === 'awaiting_approval' ? '—' : 'Not specified'} />
              <Row k="Certificate ID" v={result.cert_no} mono />
              <Row k="Issued by" v="VTIARA Training Academy" />
            </dl>
          </div>
        )}
      </div>

      <div className="mt-8 flex items-start gap-3 rounded-2xl bg-pale p-4 text-sm text-navy/70">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
        <p>For privacy, verification shows only the learner’s name, course, issue and expiry dates and validity status. Scores, documents and contact details are never shown. See the <Link to="/certificate-terms" className="font-semibold text-teal">certificate verification terms</Link>.</p>
      </div>
    </div>
  );
}
const Row = ({ k, v, mono }: { k: string; v: string; mono?: boolean }) => (
  <div><dt className="text-xs font-semibold uppercase tracking-wider text-navy/50">{k}</dt><dd className={cn('mt-1 font-semibold', mono && 'break-all font-mono text-sm')}>{v}</dd></div>
);
