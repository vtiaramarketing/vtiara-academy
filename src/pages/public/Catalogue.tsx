import { useMemo, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { backend, useQuery } from '@/lib/db';
import { CourseCard } from '@/components/CourseBits';
import { Empty, Spinner, ErrorNote, Disclaimer } from '@/components/ui';
import { MODE_LABEL } from '@/lib/utils';
import type { Course, LearningMode } from '@/lib/types';
import { usePageMeta } from '@/lib/seo';
import { UI_CATEGORIES, inCategory, type UiCategory } from '@/lib/pathways';
import { useSearchParams } from 'react-router-dom';

const DURATIONS = [
  { id: 'any', label: 'Any duration', test: () => true },
  { id: 'short', label: 'Up to 40 hours', test: (c: Course) => c.duration_hours > 0 && c.duration_hours <= 40 },
  { id: 'mid', label: '41 – 100 hours', test: (c: Course) => c.duration_hours > 40 && c.duration_hours <= 100 },
  { id: 'long', label: 'More than 100 hours', test: (c: Course) => c.duration_hours > 100 },
];

export default function Catalogue() {
  usePageMeta('Courses', 'Browse VTIARA Training Academy courses: Common Core and role-specific training for clinical, support and front-office roles in Bangalore.');
  const { data, loading, error } = useQuery(() => backend.select<Course>('courses', { order: ['sort_order'] }), []);
  const [sp0] = useSearchParams();
  const [q, setQ] = useState(sp0.get('q') ?? '');
  const [role, setRole] = useState('all');
  const [mode, setMode] = useState('all');
  const [duration, setDuration] = useState('any');
  const [level, setLevel] = useState('all');
  const [lang, setLang] = useState('all');
  const [cert, setCert] = useState('all');
  const [sp] = useSearchParams();
  const initial = sp.get('cat');
  const [category, setCategory] = useState<'all' | UiCategory>(UI_CATEGORIES.includes(initial as UiCategory) ? (initial as UiCategory) : 'all');

  const courses = (data ?? []).filter((c) => c.status !== 'draft' && c.status !== 'archived');
  const roles = useMemo(() => [...new Map(courses.map((c) => [c.role_key, c.role_label])).entries()].filter(([k]) => k), [courses.length]);
  const langs = useMemo(() => [...new Set(courses.flatMap((c) => c.languages))], [courses.length]);

  const list = courses.filter((c) =>
    inCategory(c, category) &&
    (!q || (c.title + ' ' + c.short_description).toLowerCase().includes(q.toLowerCase())) &&
    (role === 'all' || c.role_key === role) &&
    (mode === 'all' || c.learning_modes.includes(mode as LearningMode)) &&
    DURATIONS.find((d) => d.id === duration)!.test(c) &&
    (level === 'all' || c.level === level) &&
    (lang === 'all' || c.languages.includes(lang)) &&
    (cert === 'all' || (cert === 'yes' ? c.status === 'published' : c.status === 'coming_soon')));

  const active = [role, mode, duration === 'any' ? 'all' : duration, level, lang, cert].some((v) => v !== 'all') || q || category !== 'all';
  const reset = () => { setQ(''); setRole('all'); setMode('all'); setDuration('any'); setLevel('all'); setLang('all'); setCert('all'); setCategory('all'); };
  const sel = 'input !py-2';

  return (
    <div className="section py-12">
      <p className="eyebrow">Course catalogue</p>
      <h1 className="h-section mt-2">Find your role path</h1>
      <p className="mt-2 max-w-2xl text-navy/70">Every role starts with Common Core. Then choose the training for the work you do.</p>

      <div className="mt-8 flex flex-wrap gap-2" role="tablist" aria-label="Category">
        {(['all', ...UI_CATEGORIES] as const).map((c) => (
          <button key={c} role="tab" aria-selected={category === c} onClick={() => setCategory(c)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${category === c ? 'bg-navy text-white' : 'bg-pale text-navy/70 hover:bg-accent/10'}`}>{c === 'all' ? 'All courses' : c}</button>
        ))}
      </div>

      <div className="card mt-4 !p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy/40" />
          <input className="input !pl-10" placeholder="Search courses, e.g. hygiene, laser, calls…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search courses" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
          <select className={sel} value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role"><option value="all">All roles</option>{roles.map(([k, l]) => <option key={k!} value={k!}>{l}</option>)}</select>
          <select className={sel} value={mode} onChange={(e) => setMode(e.target.value)} aria-label="Learning mode"><option value="all">All learning modes</option>{(Object.keys(MODE_LABEL) as LearningMode[]).map((m) => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}</select>
          <select className={sel} value={duration} onChange={(e) => setDuration(e.target.value)} aria-label="Duration">{DURATIONS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}</select>
          <select className={sel} value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Level"><option value="all">All levels</option>{['Foundation', 'Intermediate', 'Advanced'].map((l) => <option key={l}>{l}</option>)}</select>
          <select className={sel} value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Language"><option value="all">All languages</option>{langs.map((l) => <option key={l}>{l}</option>)}</select>
          <select className={sel} value={cert} onChange={(e) => setCert(e.target.value)} aria-label="Certificate availability"><option value="all">Certificate: any</option><option value="yes">Certificate available now</option><option value="soon">Coming soon</option></select>
        </div>
        {active && <button onClick={reset} className="btn-ghost btn-sm mt-3"><X className="h-3.5 w-3.5" />Clear filters</button>}
      </div>

      <p className="mt-6 flex items-center gap-2 text-sm text-navy/60"><SlidersHorizontal className="h-4 w-4" />{list.length} course{list.length === 1 ? '' : 's'}</p>
      {loading ? <Spinner /> : error ? <ErrorNote message={error} /> : list.length === 0 ? (
        <div className="mt-4"><Empty title="No courses match those filters" action={<button className="btn-primary" onClick={reset}>Clear filters</button>} /></div>
      ) : (
        <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{list.map((c) => <CourseCard key={c.id} course={c} />)}</div>
      )}
      <Disclaimer className="mt-12" />
    </div>
  );
}
