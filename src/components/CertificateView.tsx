import { QRCodeSVG } from 'qrcode.react';
import { Award } from 'lucide-react';
import { CERT_LABEL, cn, fmtDate, verifyUrl } from '@/lib/utils';
import type { Certificate } from '@/lib/types';

/** Print-ready A4-landscape-proportioned certificate. Gold is used only here, for achievement. */
export default function CertificateView({ cert, className }: { cert: Certificate; className?: string }) {
  const pending = cert.status === 'awaiting_approval';
  const bad = cert.status === 'revoked' || cert.status === 'expired';
  const url = verifyUrl(cert.cert_no);
  return (
    <div className={cn('print-cert relative mx-auto aspect-[1.414/1] w-full max-w-4xl overflow-hidden rounded-md bg-white shadow-lift', className)}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#EAF4F8_0%,transparent_60%)]" />
      <div className="absolute inset-[2.2%] border-[3px] border-navy" />
      <div className="absolute inset-[3.4%] border border-gold" />
      {(['left-[3.4%] top-[3.4%]', 'right-[3.4%] top-[3.4%] rotate-90', 'bottom-[3.4%] right-[3.4%] rotate-180', 'bottom-[3.4%] left-[3.4%] -rotate-90'] as const).map((pos) => (
        <svg key={pos} viewBox="0 0 40 40" className={cn('absolute h-6 w-6 sm:h-10 sm:w-10', pos)} aria-hidden>
          <path d="M2 38 V2 H38" fill="none" stroke="#C9A227" strokeWidth="3" />
          <path d="M9 38 V9 H38" fill="none" stroke="#C9A227" strokeWidth="1" />
          <rect x="12" y="12" width="6" height="6" transform="rotate(45 15 15)" fill="#C9A227" />
        </svg>
      ))}
      <div className="relative flex h-full flex-col items-center justify-between px-[8%] py-[6.5%] text-center">
        <img src="/logo.png" alt="VTIARA Training Academy" className="h-11 w-auto sm:h-24" width={702} height={229} />
        <div>
          <p className="text-[8px] font-semibold uppercase tracking-[0.3em] text-accent sm:text-xs">Certificate of Completion</p>
          <p className="mt-1 text-[9px] text-navy/60 sm:mt-2 sm:text-sm">This is to certify that</p>
          <p className="mt-0.5 font-display text-xl font-semibold text-navy sm:mt-1 sm:text-4xl">{cert.learner_name}</p>
          <p className="mt-1 text-[9px] text-navy/60 sm:mt-2 sm:text-sm">has successfully completed</p>
          <p className="mt-0.5 font-display text-sm font-semibold text-teal sm:mt-1 sm:text-2xl">{cert.course_title}</p>
          <p className="mt-0.5 flex items-center justify-center gap-1 text-[9px] font-semibold text-amber-700 sm:mt-1 sm:text-sm"><Award className="h-2.5 w-2.5 sm:h-4 sm:w-4" />{cert.certificate_title}{cert.role_label ? ` · ${cert.role_label}` : ''}</p>
        </div>
        <div className="grid w-full grid-cols-[1fr_auto_1fr] items-end gap-2 text-left">
          <div className="space-y-0.5 text-[7px] text-navy/70 sm:space-y-1 sm:text-xs">
            <p><span className="text-navy/45">Certificate ID</span><br /><span className="break-all font-mono font-semibold text-navy">{cert.cert_no}</span></p>
            <p><span className="text-navy/45">Completed</span> <strong className="text-navy">{fmtDate(cert.issued_on)}</strong></p>
            <p><span className="text-navy/45">Valid until</span> <strong className="text-navy">{cert.valid_until ? fmtDate(cert.valid_until) : cert.status === 'awaiting_approval' ? '—' : 'Not specified'}</strong></p>
          </div>
          <div className="flex flex-col items-center">
            <div className="rounded-lg bg-white p-1 ring-1 ring-navy/10 sm:p-1.5"><QRCodeSVG value={url} size={72} level="M" fgColor="#0D2137" className="h-10 w-10 sm:h-[72px] sm:w-[72px]" /></div>
            <p className="mt-0.5 hidden max-w-[11rem] break-all text-[8px] text-navy/45 sm:block">{url}</p>
          </div>
          <div className="text-right">
            <div className="ml-auto h-px w-20 bg-navy/40 sm:w-40" /><p className="mt-1 text-[7px] font-semibold text-navy/70 sm:text-xs">Academy Head</p><p className="text-[6px] text-navy/45 sm:text-[10px]">VTIARA Training Academy</p>
          </div>
        </div>
      </div>
      {(pending || bad) && (
        <div className={cn('absolute inset-0 flex items-center justify-center bg-white/55 backdrop-blur-[1px]')}>
          <span className={cn('-rotate-12 rounded-xl border-4 px-4 py-1 font-display text-xl font-bold uppercase tracking-widest sm:px-8 sm:py-2 sm:text-5xl', pending ? 'border-gold text-amber-600' : 'border-red-500 text-red-500')}>{CERT_LABEL[cert.status]}</span>
        </div>
      )}
    </div>
  );
}
