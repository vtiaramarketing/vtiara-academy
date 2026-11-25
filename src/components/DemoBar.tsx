import { useState } from 'react';
import { FlaskConical, ChevronUp, FastForward, RotateCcw } from 'lucide-react';
import { isDemo } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import { demoFastForward, demoLoginAs, resetDemo, DEMO_PASSWORD, DEMO_OTP } from '@/lib/demoBackend';
import { useNavigate } from 'react-router-dom';
import content from '@/data/content.json';
import { ROLE_LABEL } from '@/lib/utils';

/** Floating helper shown only in demo mode: switch persona to walk the full journey without logging out/in. */
export default function DemoBar() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const nav = useNavigate();
  if (!isDemo) return null;
  const go = (key: string, to: string) => { demoLoginAs(key); nav(to); setOpen(false); };
  return (
    <div className="no-print fixed bottom-4 left-4 z-40 max-w-[calc(100vw-2rem)]">
      {open && (
        <div className="mb-2 w-80 max-w-full rounded-2xl border border-navy/10 bg-white p-4 shadow-lift">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">Demo personas</p>
          <p className="mb-3 mt-0.5 text-xs text-navy/60">Data lives in this browser only. Password for all: <code className="rounded bg-pale px-1">{DEMO_PASSWORD}</code> · OTP: <code className="rounded bg-pale px-1">{DEMO_OTP}</code></p>
          <div className="space-y-1">
            {content.demoUsers.map((u) => {
              const to = u.role === 'learner' ? '/app/dashboard' : '/admin';
              const active = user?.email === u.email;
              return (
                <button key={u.key} onClick={() => go(u.key, to)} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-pale ${active ? 'bg-pale font-semibold' : ''}`}>
                  <span className="truncate">{u.name.replace(/ \(.*\)/, '')}</span>
                  <span className="ml-2 shrink-0 text-xs text-teal">{ROLE_LABEL[u.role]}{u.key === 'learner2' ? ' ✓ cert' : ''}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex gap-2 border-t border-navy/10 pt-3">
            <button onClick={() => demoFastForward(4)} className="btn-outline btn-sm flex-1" title="Skip the 3-day retake wait"><FastForward className="h-3.5 w-3.5" />+4 days</button>
            <button onClick={() => { if (confirm('Reset all demo data?')) { resetDemo(); nav('/'); } }} className="btn-outline btn-sm flex-1"><RotateCcw className="h-3.5 w-3.5" />Reset</button>
          </div>
        </div>
      )}
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 rounded-full bg-navy px-4 py-2.5 text-xs font-semibold text-white shadow-lift hover:bg-navy-700">
        <FlaskConical className="h-4 w-4 text-gold" />Demo mode<ChevronUp className={`h-3.5 w-3.5 transition ${open ? '' : 'rotate-180'}`} />
      </button>
    </div>
  );
}
