import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Compass } from 'lucide-react';
import { EXPERIENCE_OPTIONS, FOCUS_OPTIONS, recommend } from '@/lib/pathways';
import { cn } from '@/lib/utils';
import type { Course } from '@/lib/types';

/** Three quick questions that point a learner to the right existing courses. */
export default function PathFinder({ courses }: { courses: Course[] }) {
  const [focus, setFocus] = useState('');
  const [exp, setExp] = useState('');
  const picks = focus && exp ? recommend(courses, focus, exp).slice(0, 3) : [];
  const Opt = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) => (
    <button type="button" onClick={onClick} aria-pressed={on} className={cn('chip', on && 'chip-on')}>{children}</button>
  );
  return (
    <div className="card !p-6 sm:!p-8">
      <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-6">
          <div>
            <p id="pf-focus" className="font-semibold">What kind of training are you looking for?</p>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-labelledby="pf-focus">
              {FOCUS_OPTIONS.map((o) => <Opt key={o.id} on={focus === o.id} onClick={() => setFocus(o.id)}>{o.label}</Opt>)}
            </div>
          </div>
          <div>
            <p id="pf-exp" className="font-semibold">Where are you today?</p>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-labelledby="pf-exp">
              {EXPERIENCE_OPTIONS.map((o) => <Opt key={o.id} on={exp === o.id} onClick={() => setExp(o.id)}>{o.label}</Opt>)}
            </div>
          </div>
          <Link to="/enquire?intent=call" className="inline-flex items-center gap-2 text-sm font-semibold text-teal hover:underline">Not sure? Talk to a counsellor <ArrowRight className="h-4 w-4" aria-hidden /></Link>
        </div>
        <div className="rounded-2xl bg-mist p-5" aria-live="polite">
          {picks.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-8 text-center">
              <Compass className="h-8 w-8 text-teal/60" aria-hidden />
              <p className="mt-3 font-semibold">Your recommended path appears here</p>
              <p className="mt-1 max-w-xs text-sm text-ink/60">Choose an option on the left. Every role starts with Common Core.</p>
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold text-teal">Suggested for you</p>
              <ol className="mt-3 space-y-2.5">
                {picks.map((c, i) => (
                  <li key={c.id}>
                    <Link to={`/courses/${c.slug}`} className="card card-hover flex items-center gap-3 !p-3.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">{i + 1}</span>
                      <span className="min-w-0 flex-1"><span className="block font-semibold leading-tight">{c.title}</span><span className="text-xs text-ink/60">{c.duration_label} · {c.level}</span></span>
                      <ArrowRight className="h-4 w-4 text-teal" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
