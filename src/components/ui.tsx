import { cloneElement, createContext, isValidElement, useCallback, useContext, useEffect, useId, useRef, useState, type ReactElement, type ReactNode, type ButtonHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Info, Loader2, ShieldCheck, X, GraduationCap, Syringe, Sparkles, Brush, Headphones, Stethoscope, Briefcase, Users } from 'lucide-react';
import { cn, courseGradient, DISCLAIMER } from '@/lib/utils';
import type { Course } from '@/lib/types';

/* ───────── Brand ───────── */
export function Logo({ light = false, small = false }: { light?: boolean; small?: boolean }) {
  return (
    <Link to="/" className="inline-flex items-center" aria-label="VTIARA Training Academy home">
      <img
        src={light ? '/logo-light.png' : '/logo.png'}
        alt="VTIARA Training Academy"
        className={small ? 'h-9 w-auto' : 'h-11 w-auto'}
        width={702}
        height={229}
      />
    </Link>
  );
}

const ROLE_ICON: Record<string, typeof Sparkles> = {
  all: ShieldCheck, skin_therapist: Sparkles, staff_nurse: Syringe, housekeeping: Brush, telecaller: Headphones,
  dermatologist: Stethoscope, front_desk: Users, branch_manager: Briefcase,
};
export function RoleIcon({ role, className }: { role?: string | null; className?: string }) {
  const I = ROLE_ICON[role ?? ''] ?? GraduationCap;
  return <I className={className} aria-hidden />;
}

export function CourseImage({ course, className }: { course: Pick<Course, 'code' | 'role_key' | 'title'> & Partial<Course>; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    if (course.image_path) import('@/lib/db').then(({ backend }) => backend.storage.signedUrl('course-thumbnails', course.image_path!).then((u) => live && setSrc(u)));
    return () => { live = false; };
  }, [course.image_path]);
  if (src) return <img src={src} alt={course.title} className={cn('object-cover', className)} />;
  return (
    <div className={cn('relative overflow-hidden bg-gradient-to-br', courseGradient(course.code), className)} role="img" aria-label={`${course.title} image placeholder`}>
      <svg className="absolute inset-0 h-full w-full opacity-[0.12]" aria-hidden><defs><pattern id={'p' + course.code} width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.6" fill="#fff" /></pattern></defs><rect width="100%" height="100%" fill={`url(#p${course.code})`} /></svg>
      <RoleIcon role={course.role_key} className="absolute bottom-3 right-3 h-16 w-16 text-white/25" />
      <span className="absolute left-4 top-4 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-white backdrop-blur">{course.code}</span>
    </div>
  );
}

/* ───────── Primitives ───────── */
export function Button({ loading, children, className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button {...p} disabled={p.disabled || loading} className={className}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{children}
    </button>
  );
}

const TONES = {
  slate: 'bg-slate-100 text-slate-700', blue: 'bg-accent/10 text-teal-dark', teal: 'bg-teal/10 text-teal-dark',
  gold: 'bg-gold-soft text-amber-800 ring-1 ring-gold/50', green: 'bg-emerald-50 text-emerald-700', red: 'bg-red-50 text-red-700', navy: 'bg-navy text-white',
};
export function Badge({ tone = 'slate', children, className }: { tone?: keyof typeof TONES; children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', TONES[tone], className)}>{children}</span>;
}

export function ProgressBar({ value, tone = 'teal', label }: { value: number; tone?: 'teal' | 'gold'; label?: string }) {
  return (
    <div role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? 'Progress'} className="h-2 w-full overflow-hidden rounded-full bg-navy/10">
      <div className={cn('h-full rounded-full transition-all', tone === 'gold' ? 'bg-gold' : 'bg-gradient-to-r from-teal to-accent')} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return <div className="flex items-center justify-center gap-2 py-16 text-sm text-navy/60" role="status"><Loader2 className="h-5 w-5 animate-spin text-teal" />{label}</div>;
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-navy/15 bg-pale/50 px-6 py-12 text-center">
      <p className="font-semibold text-navy">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-md text-sm text-navy/60">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return <div role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{message}</div>;
}

export function Notice({ tone = 'info', children, title }: { tone?: 'info' | 'gold' | 'green'; children: ReactNode; title?: string }) {
  const s = { info: 'bg-pale text-navy border-accent/30', gold: 'bg-gold-soft text-navy border-gold/50', green: 'bg-emerald-50 text-emerald-900 border-emerald-200' }[tone];
  const I = tone === 'green' ? CheckCircle2 : Info;
  return (
    <div className={cn('flex gap-3 rounded-2xl border px-4 py-3 text-sm', s)}>
      <I className="mt-0.5 h-4 w-4 shrink-0 text-teal" aria-hidden />
      <div>{title && <p className="font-semibold">{title}</p>}<div className={title ? 'mt-0.5' : ''}>{children}</div></div>
    </div>
  );
}

export function Disclaimer({ className }: { className?: string }) {
  return (
    <div className={cn('flex gap-3 rounded-2xl border border-gold/50 bg-gold-soft/70 px-4 py-3 text-sm text-navy', className)}>
      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
      <p><span className="font-semibold">Scope of practice. </span>{DISCLAIMER}</p>
    </div>
  );
}

export function Field({ label, hint, error, children, htmlFor, required }: { label: string; hint?: string; error?: string; children: ReactNode; htmlFor?: string; required?: boolean }) {
  const auto = useId();
  const id = htmlFor ?? auto;
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  // Wire the label, hint and error to a single child control so screen readers announce them together.
  const child = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id: (children.props as Record<string, unknown>).id ?? id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
        'aria-required': required ? true : undefined,
      })
    : children;
  const controlId = isValidElement(children) ? String((children.props as Record<string, unknown>).id ?? id) : id;
  return (
    <div>
      <label className="label" htmlFor={controlId}>{label}{required && <span aria-hidden className="text-red-600"> *</span>}</label>
      {child}
      {hint && !error && <p id={`${id}-hint`} className="mt-1 text-xs text-navy/60">{hint}</p>}
      {error && <p id={`${id}-err`} className="mt-1 text-xs text-red-700" role="alert">{error}</p>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, eyebrow }: { title: string; subtitle?: string; actions?: ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-navy/65">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, tone = 'teal', icon }: { label: string; value: ReactNode; hint?: string; tone?: 'teal' | 'gold' | 'red'; icon?: ReactNode }) {
  const c = { teal: 'bg-teal/10 text-teal', gold: 'bg-gold-soft text-amber-700', red: 'bg-red-50 text-red-600' }[tone];
  return (
    <div className="card flex items-start gap-4 !p-5">
      {icon && <div className={cn('rounded-xl p-2.5', c)}>{icon}</div>}
      <div className="min-w-0">
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <p className="text-sm text-navy/65">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-navy/45">{hint}</p>}
      </div>
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div role="tablist" className="-mx-1 flex gap-1 overflow-x-auto border-b border-navy/10 px-1">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={cn('whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition', value === t.id ? 'border-teal text-teal' : 'border-transparent text-navy/55 hover:text-navy')}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    (node?.querySelector<HTMLElement>('[data-autofocus]') ?? node?.querySelector<HTMLElement>(FOCUSABLE) ?? node)?.focus();
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
      if (e.key !== 'Tab' || !node) return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (!items.length) { e.preventDefault(); return; }
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', h);
    return () => { document.removeEventListener('keydown', h); previous?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/50 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} className={cn('max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 shadow-lift outline-none sm:rounded-3xl', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={titleId} className="font-display text-xl font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-navy/60 hover:bg-pale" aria-label="Close dialog"><X className="h-5 w-5" aria-hidden /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto rounded-2xl border border-navy/5 bg-white shadow-card"><table className="w-full min-w-[640px] divide-y divide-navy/5">{children}</table></div>;
}

/* ───────── Toasts ───────── */
type Toast = { id: number; msg: string; tone: 'ok' | 'err' };
const ToastCtx = createContext<(msg: string, tone?: 'ok' | 'err') => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((msg: string, tone: 'ok' | 'err' = 'ok') => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, msg, tone }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 4500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="no-print pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={cn('pointer-events-auto flex max-w-md items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lift', t.tone === 'ok' ? 'bg-navy' : 'bg-red-600')}>
            {t.tone === 'ok' ? <CheckCircle2 className="h-4 w-4 text-gold" /> : <AlertTriangle className="h-4 w-4" />}{t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (fn: () => Promise<unknown>, success?: string) => {
    setBusy(true);
    try { await fn(); if (success) toast(success); return true; }
    catch (e: any) { toast(e?.message ?? 'Something went wrong', 'err'); return false; }
    finally { setBusy(false); }
  }, [toast]);
  return { busy, run };
}

export function ConfirmButton({ children, onConfirm, className, message }: { children: ReactNode; onConfirm: () => void; className?: string; message: string }) {
  return <button className={className} onClick={() => window.confirm(message) && onConfirm()}>{children}</button>;
}
