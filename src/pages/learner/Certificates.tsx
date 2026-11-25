import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, ExternalLink, Printer } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { backend, useQuery } from '@/lib/db';
import { Badge, Disclaimer, Empty, ErrorNote, Notice, PageHeader, Spinner, useToast } from '@/components/ui';
import ExpiryBanner from '@/components/ExpiryBanner';
import CertificateView from '@/components/CertificateView';
import { CERT_LABEL, CERT_TONE, cn, fmtDate, verifyUrl } from '@/lib/utils';
import type { Certificate } from '@/lib/types';

export default function Certificates() {
  const { user } = useAuth();
  const toast = useToast();
  const [sel, setSel] = useState<string | null>(null);
  const { data, loading, error } = useQuery(async () => {
    await backend.rpc('sync_certificate_statuses').catch(() => {});
    return backend.select<Certificate>('certificates', { eq: { learner_id: user!.id }, order: ['created_at', false] });
  }, [user?.id]);

  if (loading) return <Spinner />;
  if (error || !data) return <ErrorNote message={error ?? 'Could not load certificates'} />;
  const issued = data.filter((c) => c.status !== 'awaiting_approval');
  const cert = issued.find((c) => c.id === sel) ?? issued[0];

  const copy = async (c: Certificate) => {
    try { await navigator.clipboard.writeText(verifyUrl(c.cert_no)); toast('Verification link copied'); } catch { toast('Could not copy — select the link manually', 'err'); }
  };

  return (
    <>
      <PageHeader title="Certificate wallet" subtitle="Certificates are issued only after every requirement for the course is complete and approved." />
      <div className="mb-4 no-print"><ExpiryBanner linkToCerts={false} /></div>
      {data.length === 0 || issued.length === 0 ? (
        <Empty title="No certificates yet" action={<Link to="/app/courses" className="btn-primary">My courses</Link>}>
          Finish your lessons, attend your session, pass the assessment and get trainer approval. Your certificate appears here the moment it is issued.
        </Empty>
      ) : (
        <div className="space-y-6">
          {issued.length > 1 && (
            <div className="flex flex-wrap gap-2">{issued.map((c) => <button key={c.id} onClick={() => setSel(c.id)} className={cn('rounded-full border px-4 py-1.5 text-sm font-medium', c.id === cert.id ? 'border-navy bg-navy text-white' : 'border-navy/15 hover:border-teal')}>{c.course_title}</button>)}</div>
          )}
          <CertificateView cert={cert} />
          <div className="no-print flex flex-wrap items-center justify-center gap-3">
            <Badge tone={CERT_TONE[cert.status]}>{CERT_LABEL[cert.status]}</Badge>
            <button className="btn-primary" onClick={() => window.print()}><Printer className="h-4 w-4" />Print / save as PDF</button>
            <button className="btn-outline" onClick={() => copy(cert)}><Copy className="h-4 w-4" />Copy verification link</button>
            <Link to={`/verify/${encodeURIComponent(cert.cert_no)}`} className="btn-outline"><ExternalLink className="h-4 w-4" />Open public verification</Link>
          </div>
          {cert.status === 'revoked' && <Notice tone="gold" title="This certificate has been revoked">{cert.revoked_reason ?? 'Contact the academy for details.'}</Notice>}
          {cert.status === 'expired' && <Notice tone="gold" title="This certificate has expired">Valid until {fmtDate(cert.valid_until)}. Contact the academy about refresher training.</Notice>}
          <div className="no-print"><Disclaimer /></div>
        </div>
      )}
      {data.some((c) => c.status === 'awaiting_approval') && (
        <div className="no-print mt-6"><Notice tone="gold" title="Awaiting approval">A certificate is pending for: {data.filter((c) => c.status === 'awaiting_approval').map((c) => c.course_title).join(', ')}. It will appear here once your trainer approves.</Notice></div>
      )}
    </>
  );
}
