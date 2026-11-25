import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, ChevronLeft, ChevronRight, Circle, Download, FileText, List, MessageCircle, PlayCircle, Send, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { backend, useQuery } from '@/lib/db';
import { Badge, Button, Disclaimer, ErrorNote, Notice, ProgressBar, Spinner, useAction } from '@/components/ui';
import { cn, fmtDate, LESSON_TYPE_LABEL } from '@/lib/utils';
import type { AccessStatus, Course, CourseModule, Enrolment, Lesson, LessonQuestion, LessonResource } from '@/lib/types';

const CLINICAL = /\b(diagnos|prescri|dose|dosage|tablet|medicine|medication|cream for|treat my|my skin|my hair|rash|infection|allerg|symptom)/i;

export default function LessonPlayer() {
  const { slug, lessonId } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const { busy, run } = useAction();
  const [drawer, setDrawer] = useState(false);
  const [tab, setTab] = useState<'about' | 'transcript' | 'ask'>('about');

  const { data, loading, error, reload } = useQuery(async () => {
    const [course] = await backend.select<Course>('courses', { eq: { slug } });
    if (!course) return null;
    const [enrol] = await backend.select<Enrolment>('course_enrolments', { eq: { user_id: user!.id, course_id: course.id } });
    const [modules, lessons, done] = await Promise.all([
      backend.select<CourseModule>('course_modules', { eq: { course_id: course.id }, order: ['position'] }),
      backend.select<Lesson>('lessons', { eq: { course_id: course.id } }),
      backend.select<{ lesson_id: string }>('lesson_progress', { eq: { user_id: user!.id, course_id: course.id } }),
    ]);
    return { course, enrol, modules, lessons, done: new Set(done.map((d) => d.lesson_id)) };
  }, [slug, user?.id]);

  const ordered = useMemo(() => data ? data.modules.flatMap((m) => data.lessons.filter((l) => l.module_id === m.id).sort((a, b) => a.position - b.position)) : [], [data]);
  const current = ordered.find((l) => l.id === lessonId) ?? ordered[0];

  useEffect(() => { if (data && !lessonId && current) nav(`/app/learn/${slug}/${current.id}`, { replace: true }); }, [data, lessonId, current, slug, nav]);
  useEffect(() => { setDrawer(false); setTab('about'); window.scrollTo(0, 0); }, [lessonId]);

  const { data: extra, reload: reloadExtra } = useQuery(async () => {
    if (!current) return null;
    const [resources, questions] = await Promise.all([
      backend.select<LessonResource>('lesson_resources', { eq: { lesson_id: current.id } }),
      backend.select<LessonQuestion>('lesson_questions', { eq: { lesson_id: current.id, user_id: user!.id }, order: ['created_at', false] }),
    ]);
    const video = current.video_path ? await backend.storage.signedUrl('course-videos', current.video_path) : null;
    return { resources, questions, video };
  }, [current?.id]);

  if (loading) return <Spinner />;
  if (error || !data) return <ErrorNote message={error ?? 'Course not found'} />;
  if (!data.enrol) return <div className="card text-center"><p className="font-semibold">Enrol to access lessons.</p><Link to={`/courses/${slug}?enrol=1`} className="btn-primary mt-4">Enrol now</Link></div>;
  if (!['active', 'completed'].includes(data.enrol.access_status)) return <AccessGate status={data.enrol.access_status} slug={slug!} />;
  if (!current) return <div className="card text-center">No lessons have been published for this course yet.</div>;

  const idx = ordered.findIndex((l) => l.id === current.id);
  const prev = ordered[idx - 1]; const next = ordered[idx + 1];
  const isDone = data.done.has(current.id);
  const pct = Math.round((100 * data.done.size) / Math.max(ordered.length, 1));

  const complete = async () => {
    const ok = await run(() => backend.rpc('complete_lesson', { p_lesson: current.id }), isDone ? undefined : 'Lesson marked complete');
    if (ok) { reload(); if (next) nav(`/app/learn/${slug}/${next.id}`); else nav(`/app/courses/${slug}`); }
  };

  const sidebar = (
    <div className="space-y-4">
      <div><p className="text-sm font-semibold">{data.course.title}</p><div className="mt-2 flex items-center gap-2"><div className="flex-1"><ProgressBar value={pct} /></div><span className="text-xs font-semibold">{pct}%</span></div><p className="mt-1 text-xs text-navy/55">{data.done.size} of {ordered.length} lessons complete</p></div>
      {data.modules.map((m, mi) => (
        <div key={m.id}>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-navy/50">Module {mi + 1} · {m.title}</p>
          <ul className="space-y-0.5">
            {data.lessons.filter((l) => l.module_id === m.id).sort((a, b) => a.position - b.position).map((l) => (
              <li key={l.id}>
                <Link to={`/app/learn/${slug}/${l.id}`} className={cn('flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-sm', l.id === current.id ? 'bg-teal/10 font-semibold text-teal' : 'hover:bg-pale')} aria-current={l.id === current.id ? 'true' : undefined}>
                  {data.done.has(l.id) ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-navy/30" />}
                  <span className="flex-1">{l.title}<span className="block text-xs font-normal text-navy/50">{LESSON_TYPE_LABEL[l.lesson_type]} · {l.duration_min} min</span></span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <aside className="hidden lg:block"><div className="card sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto !p-4">{sidebar}</div></aside>
      {drawer && <div className="fixed inset-0 z-40 lg:hidden"><div className="absolute inset-0 bg-navy/50" onClick={() => setDrawer(false)} /><div className="absolute inset-y-0 left-0 w-[88%] max-w-sm overflow-y-auto bg-white p-4"><button onClick={() => setDrawer(false)} className="mb-3 rounded-lg p-1.5 hover:bg-pale" aria-label="Close lessons"><X /></button>{sidebar}</div></div>}

      <div className="min-w-0 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <nav className="min-w-0 truncate text-sm text-navy/55"><Link to={`/app/courses/${slug}`} className="hover:text-teal">{data.course.title}</Link></nav>
          <button className="btn-outline btn-sm lg:hidden" onClick={() => setDrawer(true)}><List className="h-4 w-4" />Lessons</button>
        </div>

        {/* lesson content by type */}
        <LessonMedia lesson={current} signedVideo={extra?.video ?? null} fallback={
            <div className="relative flex aspect-video items-center justify-center bg-gradient-to-br from-navy via-navy-600 to-teal">
              <svg className="absolute inset-0 h-full w-full opacity-[0.07]" aria-hidden><defs><pattern id="lp" width="30" height="30" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.5" fill="#fff" /></pattern></defs><rect width="100%" height="100%" fill="url(#lp)" /></svg>
              <div className="relative text-center text-white"><PlayCircle className="mx-auto h-16 w-16 text-gold sm:h-20 sm:w-20" /><p className="mt-3 font-display text-lg font-semibold sm:text-2xl">{current.title}</p><p className="mt-1 text-sm text-white/65">Recorded class placeholder · {current.duration_min} min</p><p className="mx-auto mt-2 max-w-sm text-xs text-white/45">Upload a video in Admin → Courses → Lesson to replace this.</p></div>
            </div>
        } />

        <div className="card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="eyebrow">Lesson {idx + 1} of {ordered.length}</p><h1 className="mt-1 font-display text-2xl font-semibold">{current.title}</h1></div>
            {isDone && <Badge tone="green"><CheckCircle2 className="h-3 w-3" />Completed</Badge>}
          </div>

          <div role="tablist" className="mt-5 flex gap-1 border-b border-navy/10">
            {([['about', 'About', FileText], ['transcript', 'Transcript', FileText], ['ask', 'Ask trainer', MessageCircle]] as const).map(([id, l, I]) => (
              <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={cn('flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-semibold', tab === id ? 'border-teal text-teal' : 'border-transparent text-navy/55')}><I className="h-4 w-4" />{l}</button>
            ))}
          </div>

          <div className="mt-5">
            {tab === 'about' && (
              <div className="space-y-5">
                <p className="text-navy/80">{current.description}</p>
                <div>
                  <p className="mb-2 text-sm font-semibold">Handouts</p>
                  {(extra?.resources ?? []).length === 0 ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-navy/20 px-4 py-3 text-sm text-navy/60"><span className="flex items-center gap-2"><FileText className="h-4 w-4" />Handout (PDF) for this lesson — placeholder</span><span className="text-xs">Not uploaded yet</span></div>
                  ) : extra!.resources.map((r) => <ResourceLink key={r.id} r={r} />)}
                </div>
              </div>
            )}
            {tab === 'transcript' && <div className="max-h-72 overflow-y-auto rounded-xl bg-pale p-4 text-sm leading-relaxed text-navy/80">{current.transcript || 'Transcript not available yet.'}</div>}
            {tab === 'ask' && <AskTrainer lessonId={current.id} questions={extra?.questions ?? []} onSent={reloadExtra} />}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          {prev ? <Link to={`/app/learn/${slug}/${prev.id}`} className="btn-outline"><ChevronLeft className="h-4 w-4" />Previous</Link> : <span />}
          <Button onClick={complete} loading={busy} className={isDone ? 'btn-outline' : 'btn-primary'}>
            <CheckCircle2 className="h-4 w-4" />{isDone ? (next ? 'Next lesson' : 'Back to course') : next ? 'Mark complete & next' : 'Mark complete & finish'}
          </Button>
          {next ? <Link to={`/app/learn/${slug}/${next.id}`} className="btn-outline">Next<ChevronRight className="h-4 w-4" /></Link> : <span />}
        </div>
        <Disclaimer />
      </div>
    </div>
  );
}

function ResourceLink({ r }: { r: LessonResource }) {
  const open = async () => { const u = await backend.storage.signedUrl('course-resources', r.file_path); if (u) window.open(u, '_blank'); };
  return <button onClick={open} className="flex w-full items-center justify-between gap-3 rounded-xl bg-pale px-4 py-3 text-left text-sm font-medium hover:bg-accent/10"><span className="flex items-center gap-2"><FileText className="h-4 w-4 text-teal" />{r.title}</span><Download className="h-4 w-4 text-teal" /></button>;
}

function AskTrainer({ lessonId, questions, onSent }: { lessonId: string; questions: LessonQuestion[]; onSent: () => void }) {
  const [text, setText] = useState('');
  const [warn, setWarn] = useState<string | null>(null);
  const { busy, run } = useAction();
  const send = async () => {
    if (CLINICAL.test(text)) { setWarn('This looks like a clinical or personal-health question. The trainer cannot answer those here. Please ask a doctor, or keep questions about the course content.'); return; }
    setWarn(null);
    const ok = await run(() => backend.insert('lesson_questions', { lesson_id: lessonId, question: text.trim() }), 'Question sent to your trainer');
    if (ok) { setText(''); onSent(); }
  };
  return (
    <div className="space-y-4">
      <Notice tone="gold" title="Course questions only">Use this for questions about the lesson or course logistics. Do not ask for medical advice, diagnosis or treatment guidance.</Notice>
      <textarea className="input min-h-24" placeholder="e.g. Could you repeat the five moments of hand hygiene?" value={text} onChange={(e) => { setText(e.target.value); setWarn(null); }} aria-label="Your question" />
      {warn && <ErrorNote message={warn} />}
      <Button className="btn-primary" disabled={text.trim().length < 5} loading={busy} onClick={send}><Send className="h-4 w-4" />Send to trainer</Button>
      {questions.length > 0 && <ul className="space-y-3 border-t border-navy/10 pt-4">{questions.map((q) => <li key={q.id} className="rounded-xl bg-pale p-3 text-sm"><p className="font-medium">{q.question}</p><p className="mt-1 text-navy/70">{q.answer ?? <em className="text-navy/45">Waiting for your trainer… · asked {fmtDate(q.created_at)}</em>}</p></li>)}</ul>}
    </div>
  );
}

const VIDEO_FILE = /\.(mp4|webm|ogg|m3u8)(\?|$)/i;
const isHttps = (u: string | null): u is string => !!u && /^https:\/\//i.test(u);

/** Turns normal YouTube / Vimeo page links into embeddable player URLs; other links pass through. */
export function toEmbedUrl(raw: string): string {
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\.|^m\./, '');
    let id: string | null = null;
    if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
    else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      if (u.pathname === '/watch') id = u.searchParams.get('v');
      else {
        const m = u.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{6,})/);
        if (m) id = m[1];
      }
    }
    if (id && /^[\w-]{6,}$/.test(id)) return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&playsinline=1`;
    if (host === 'vimeo.com') {
      const m = u.pathname.match(/^\/(\d+)/);
      if (m) return `https://player.vimeo.com/video/${m[1]}${u.searchParams.get('h') ? `?h=${u.searchParams.get('h')}` : ''}`;
    }
  } catch { /* fall through */ }
  return raw;
}

function LessonMedia({ lesson, signedVideo, fallback }: { lesson: Lesson; signedVideo: string | null; fallback: React.ReactNode }) {
  const frame = 'overflow-hidden rounded-3xl bg-navy shadow-lift';
  if (lesson.lesson_type === 'text') {
    return <div className="card"><p className="eyebrow">Reading</p><div className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-navy/85">{lesson.body || 'The text for this lesson has not been added yet.'}</div></div>;
  }
  if (lesson.lesson_type === 'pdf' || lesson.lesson_type === 'link') {
    const url = isHttps(lesson.external_url) ? lesson.external_url : null;
    return (
      <div className="card flex flex-wrap items-center justify-between gap-4">
        <div><p className="eyebrow">{LESSON_TYPE_LABEL[lesson.lesson_type]}</p><p className="mt-1 text-sm text-navy/70">{url ? 'Opens in a new tab.' : 'The link for this lesson has not been added yet.'}</p></div>
        {url && <a href={url} target="_blank" rel="noopener noreferrer" className="btn-primary"><Download className="h-4 w-4" />{lesson.lesson_type === 'pdf' ? 'Open document' : 'Open link'}</a>}
      </div>
    );
  }
  const src = isHttps(lesson.video_url) ? toEmbedUrl(lesson.video_url) : signedVideo;
  if (!src) return <div className={frame}>{fallback}</div>;
  return (
    <div className={frame}>
      {VIDEO_FILE.test(src) || src === signedVideo
        ? <video key={src} src={src} controls controlsList="nodownload" className="aspect-video w-full bg-black" />
        : <iframe key={src} src={src} title={lesson.title} className="aspect-video w-full bg-black" allow="accelerometer; autoplay; encrypted-media; fullscreen; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />}
      {isHttps(lesson.video_url) && !VIDEO_FILE.test(src) && <a href={lesson.video_url} target="_blank" rel="noopener noreferrer" className="block bg-navy px-4 py-2 text-center text-xs text-white/70 hover:text-white">Video not loading? Open it in a new tab</a>}
    </div>
  );
}

function AccessGate({ status, slug }: { status: AccessStatus; slug: string }) {
  const msg: Record<AccessStatus, string> = {
    pending: 'Your enrolment request is awaiting approval from the academy. You will be notified once it is approved and activated.',
    approved: 'Your enrolment is approved but not active yet. The academy will activate it and you will be notified.',
    cancelled: 'This enrolment was not approved or has been cancelled. Contact the academy if you think this is a mistake.',
    active: '', completed: '',
  };
  return (
    <div className="mx-auto max-w-lg"><Notice tone="gold" title="Lessons are not available yet">{msg[status]}<div className="mt-3"><Link to={`/app/courses/${slug}`} className="btn-outline btn-sm">Back to course</Link></div></Notice></div>
  );
}
