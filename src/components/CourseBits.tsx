import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Award, Clock, Globe2, Layers, Check } from 'lucide-react';
import { Badge, Button, CourseImage, Disclaimer, Modal, useAction } from './ui';
import { backend, useQuery } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import { MODE_LABEL, cn } from '@/lib/utils';
import type { Certificate, Course, LearningMode } from '@/lib/types';

export const validityText = (c: Pick<Course, 'certificate_validity_months'>) =>
  c.certificate_validity_months == null ? 'Not specified' : `Valid ${c.certificate_validity_months} months`;

const MODE_BLURB: Record<LearningMode, string> = {
  online: 'Recorded lessons and materials at your own pace. Any practical element is still completed in person.',
  academy: 'Attend scheduled academy sessions. Recorded lessons are optional revision.',
  blended: 'Recorded lessons first, then academy sessions and supervised practice. Recommended.',
};

/** Common Core (or any configured prerequisite) must be certified before role-specific enrolment. The server enforces it; this explains it. */
export function usePrerequisite(course: Pick<Course, 'prerequisite_course_id'>) {
  const { user } = useAuth();
  const { data } = useQuery(async () => {
    if (!course.prerequisite_course_id) return null;
    const [pre] = await backend.select<Course>('courses', { eq: { id: course.prerequisite_course_id } });
    if (!pre) return null;
    const certs = user ? await backend.select<Certificate>('certificates', { eq: { learner_id: user.id, course_id: pre.id, status: 'valid' } }) : [];
    return { pre, met: certs.length > 0 };
  }, [course.prerequisite_course_id, user?.id]);
  return data ?? null;
}

export function PrerequisiteNotice({ course }: { course: Course }) {
  const req = usePrerequisite(course);
  if (!req || req.met) return null;
  return (
    <div className="rounded-2xl border border-gold/50 bg-gold-soft/60 p-4 text-sm text-navy" role="note">
      <p className="font-semibold">Start with {req.pre.title}</p>
      <p className="mt-1 text-navy/75">Every role-specific course builds on {req.pre.title}. Complete it and earn its certificate first, then you can enrol in {course.title}.</p>
      <Link to={`/courses/${req.pre.slug}`} className="mt-2 inline-block font-semibold text-teal hover:underline">View {req.pre.title} →</Link>
    </div>
  );
}

export function CourseCard({ course }: { course: Course }) {
  const soon = course.status === 'coming_soon';
  return (
    <article className={cn('card group flex flex-col overflow-hidden !p-0 transition hover:-translate-y-0.5 hover:shadow-lift', soon && 'opacity-90')}>
      <div className="relative">
        <CourseImage course={course} className="h-40 w-full" />
        {soon && <span className="absolute right-3 top-3 rounded-full bg-gold px-3 py-1 text-xs font-bold text-navy">Coming Soon</span>}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="eyebrow">{course.category}</p>
        <h3 className="mt-1 font-display text-lg font-semibold leading-snug">
          <Link to={`/courses/${course.slug}`} className="hover:text-teal">{course.title}</Link>
        </h3>
        <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-navy/65">
          <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-accent" /><dt className="sr-only">Duration</dt><dd>{course.duration_label}</dd></div>
          <div className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5 text-accent" /><dt className="sr-only">Level</dt><dd>{course.level}</dd></div>
          {!soon && <div className="flex items-center gap-1.5"><Award className="h-3.5 w-3.5 text-gold" /><dt className="sr-only">Certificate</dt><dd>{validityText(course)}</dd></div>}
          <div className="flex items-center gap-1.5"><Globe2 className="h-3.5 w-3.5 text-accent" /><dt className="sr-only">Languages</dt><dd>{course.languages.join(', ')}</dd></div>
        </dl>
        <div className="mt-3 flex flex-wrap gap-1.5">{course.learning_modes.map((m) => <Badge key={m} tone="blue">{MODE_LABEL[m]}</Badge>)}</div>
        <p className="mt-3 flex-1 text-sm text-navy/70">{course.short_description}</p>
        <div className="mt-5 flex gap-2">
          {soon ? (
            <button className="btn-outline flex-1 cursor-not-allowed opacity-60" disabled>Coming Soon</button>
          ) : (
            <>
              <Link to={`/courses/${course.slug}`} className="btn-primary flex-1">View course</Link>
              <Link to={`/courses/${course.slug}?enrol=1`} className="btn-outline">Enquire</Link>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

export function EnrolModal({ course, open, onClose }: { course: Course; open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const { busy, run } = useAction();
  const [mode, setMode] = useState<LearningMode>(course.learning_modes.includes('blended') ? 'blended' : course.learning_modes[0]);
  const [agree, setAgree] = useState(false);
  const req = usePrerequisite(course);
  const blocked = !!req && !req.met;

  const confirm = async () => {
    if (!user) { nav('/signup', { state: { from: `/courses/${course.slug}?enrol=1` } }); return; }
    const ok = await run(() => backend.rpc('enrol_in_course', { p_course: course.id, p_mode: mode }), 'Enrolment request sent');
    if (ok) { onClose(); nav(`/app/courses/${course.slug}`); }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Request enrolment: ${course.title}`}>
      <p className="text-sm text-navy/70">Choose how you want to learn. An academy admin reviews every request, and lessons open once your enrolment is active.</p>
      <div className="mt-4 space-y-2" role="radiogroup" aria-label="Learning mode">
        {course.learning_modes.map((m) => (
          <button key={m} role="radio" aria-checked={mode === m} onClick={() => setMode(m)}
            className={cn('flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition', mode === m ? 'border-teal bg-teal/5 ring-1 ring-teal' : 'border-navy/10 hover:border-teal/50')}>
            <span className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border', mode === m ? 'border-teal bg-teal text-white' : 'border-navy/25')}>{mode === m && <Check className="h-3 w-3" />}</span>
            <span><span className="block text-sm font-semibold">{MODE_LABEL[m]}{m === 'blended' && <span className="ml-2 text-xs font-medium text-accent">Recommended</span>}</span><span className="block text-xs text-navy/65">{MODE_BLURB[m]}</span></span>
          </button>
        ))}
      </div>
      {blocked && <div className="mt-4"><PrerequisiteNotice course={course} /></div>}
      <Disclaimer className="mt-4" />
      <label className="mt-4 flex items-start gap-2.5 text-sm">
        <input type="checkbox" className="mt-1 h-4 w-4 rounded border-navy/30 text-teal" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>I have read the course introduction and understand the requirements and scope of practice.</span>
      </label>
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-outline" onClick={onClose}>Cancel</button>
        <Button className="btn-primary" disabled={!agree || blocked} loading={busy} onClick={confirm}>{user ? 'Send enrolment request' : 'Continue to register'}</Button>
      </div>
    </Modal>
  );
}
