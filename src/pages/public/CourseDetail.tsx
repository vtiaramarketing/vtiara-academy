import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Award, CalendarDays, CheckCircle2, ChevronDown, Clock, Globe2, Layers, MapPin, UserRound, Users, Timer, Target, RefreshCw } from 'lucide-react';
import { backend, useQuery } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import { Badge, CourseImage, Disclaimer, Empty, Notice, Spinner, Tabs } from '@/components/ui';
import { EnrolModal, PrerequisiteNotice, validityText } from '@/components/CourseBits';
import { ContactCtas, FeeBox } from '@/components/Cta';
import { usePageMeta } from '@/lib/seo';
import { MODE_LABEL, cn, fmtDate, fmtTime } from '@/lib/utils';
import type { Assessment, BatchAvailability, Checklist, Course, CourseModule, Enrolment } from '@/lib/types';

interface OutlineLesson { id: string; module_id: string; title: string; description: string | null; duration_min: number; position: number }
type Tab = 'overview' | 'curriculum' | 'requirements' | 'assessment' | 'batches' | 'faq';

export default function CourseDetail() {
  const { slug } = useParams();
  const [sp, setSp] = useSearchParams();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [enrol, setEnrol] = useState(false);

  const { data, loading } = useQuery(async () => {
    const [course] = await backend.select<Course>('courses', { eq: { slug } });
    if (!course) return null;
    const [modules, outline, batches, assessments, checklists, mine] = await Promise.all([
      backend.select<CourseModule>('course_modules', { eq: { course_id: course.id }, order: ['position'] }),
      backend.select<OutlineLesson>('v_lesson_outline', { eq: { course_id: course.id }, order: ['position'] }),
      backend.select<BatchAvailability>('v_batch_availability', { eq: { course_id: course.id }, order: ['starts_on'] }),
      backend.select<Assessment>('assessments', { eq: { course_id: course.id } }),
      backend.select<Checklist>('practical_checklists', { eq: { course_id: course.id } }),
      user ? backend.select<Enrolment>('course_enrolments', { eq: { user_id: user.id, course_id: course.id } }) : Promise.resolve([]),
    ]);
    return { course, modules, outline, batches: batches.filter((b) => b.status !== 'completed'), assessment: assessments[0], checklists, enrolled: mine[0] };
  }, [slug, user?.id]);

  useEffect(() => { if (sp.get('enrol') && data?.course.status === 'published') { setEnrol(true); sp.delete('enrol'); setSp(sp, { replace: true }); } }, [data, sp, setSp]);

  usePageMeta(data ? `${data.course.title} course` : 'Course', data?.course.short_description ?? 'VTIARA Training Academy course details, curriculum, fees and upcoming batches.', { noindex: !loading && !data });
  if (loading) return <Spinner />;
  if (!data) return <div className="section py-20"><Empty title="Course not found" action={<Link to="/courses" className="btn-primary">Back to courses</Link>} /></div>;
  const { course: c, modules, outline, batches, assessment, checklists } = data;
  const enrolled = data.enrolled && data.enrolled.access_status !== 'cancelled' ? data.enrolled : undefined;
  const soon = c.status === 'coming_soon';
  const trainers = [...new Set(batches.map((b) => b.trainer_name).filter(Boolean))] as string[];
  const lessonCount = outline.length;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' }, { id: 'curriculum', label: 'Curriculum' }, { id: 'requirements', label: 'Requirements' },
    { id: 'assessment', label: 'Assessment and Certificate' }, { id: 'batches', label: 'Academy Batches' }, { id: 'faq', label: 'FAQ' },
  ];

  const faq = [
    ['Do I need prior experience?', c.eligibility.length ? c.eligibility.join('. ') + '.' : 'No specific prior experience is listed for this course.'],
    ['Will I get a certificate automatically after the MCQ test?', c.requires_trainer_approval ? 'No. After you pass the assessment, your trainer reviews your attendance and practical work. You will see “Passed — awaiting trainer approval” until everything is approved and your certificate is issued.' : 'Your certificate is issued once all requirements are complete.'],
    ['How long is the certificate valid?', c.certificate_validity_months == null ? 'The validity period for this certificate has not been announced yet.' : `${c.certificate_validity_months} months from the date of issue.`],
    ['Which learning modes are available?', c.learning_modes.map((m) => MODE_LABEL[m]).join(', ') + '. Practical assessments are always completed in person.'],
    ['Can I diagnose, prescribe or treat after completing this course?', 'No. Learners must not diagnose, prescribe, or work beyond their approved role scope. Always follow clinic policy and the Medical Advisor’s direction.'],
  ];

  return (
    <>
      <section className="bg-navy text-white">
        <div className="section grid gap-8 py-10 lg:grid-cols-[1fr_380px] lg:py-14">
          <div>
            <nav className="mb-4 text-sm text-white/60" aria-label="Breadcrumb"><Link to="/courses" className="hover:text-white">Courses</Link> / {c.category}</nav>
            <h1 className="font-display text-3xl font-semibold text-white sm:text-4xl">{c.title}</h1>
            <p className="mt-3 max-w-2xl text-white/75">{c.short_description}</p>
            <dl className="mt-6 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
              {([[Clock, 'Duration', c.duration_label], [Layers, 'Level', c.level], [Globe2, 'Languages', c.languages.join(', ')], [Award, 'Certificate', soon ? 'To be announced' : validityText(c)]] as [typeof Clock, string, string | null][]).map(([I, k, v]) => (
                <div key={k}><dt className="flex items-center gap-1.5 text-xs text-white/55"><I className="h-3.5 w-3.5 text-accent" />{k}</dt><dd className="mt-0.5 text-sm font-semibold">{v}</dd></div>
              ))}
            </dl>
            <div className="mt-5 flex flex-wrap gap-2">{c.learning_modes.map((m) => <span key={m} className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">{MODE_LABEL[m]}</span>)}</div>
            <div className="mt-8">
              {soon ? <span className="inline-flex rounded-xl bg-gold px-5 py-2.5 text-sm font-bold text-navy">Coming Soon</span>
                : enrolled ? <Link to={`/app/courses/${c.slug}`} className="btn-gold !px-6 !py-3">{enrolled.access_status === 'pending' ? 'Enrolment request sent' : 'Go to my course'}</Link>
                : <button onClick={() => setEnrol(true)} className="btn-gold !px-6 !py-3 text-base">Enrol Now</button>}
              <ContactCtas course={c} dark className="mt-4" />
            </div>
          </div>
          <CourseImage course={c} className="hidden h-64 w-full rounded-3xl lg:block" />
        </div>
      </section>

      <div className="section py-8">
        <Tabs tabs={tabs} value={tab} onChange={setTab} />
        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0">
            {tab === 'overview' && (
              <div className="space-y-8">
                <Block title="Course overview"><p className="text-navy/80">{c.overview}</p></Block>
                {c.audience && <Block title="Who this course is for"><p className="text-navy/80">{c.audience}</p></Block>}
                {c.learning_outcomes.length > 0 && <Block title="Learning outcomes"><Check items={c.learning_outcomes} /></Block>}
                <PrerequisiteNotice course={c} />
                <Disclaimer />
              </div>
            )}
            {tab === 'curriculum' && (
              <Block title={`Curriculum${lessonCount ? ` · ${modules.length} modules · ${lessonCount} lessons` : ''}`}>
                {modules.length === 0 ? <Empty title="Curriculum coming soon" /> : (
                  <div className="space-y-3">
                    {modules.map((m, i) => (
                      <details key={m.id} className="group rounded-2xl border border-navy/10 bg-white" open={i === 0}>
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-semibold">
                          <span><span className="mr-2 text-accent">Module {i + 1}</span>{m.title}</span><ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
                        </summary>
                        <ul className="divide-y divide-navy/5 border-t border-navy/5">
                          {outline.filter((l) => l.module_id === m.id).map((l: any) => (
                            <li key={l.id} className="flex items-start justify-between gap-4 px-5 py-3 text-sm"><span><span className="font-medium">{l.title}</span><span className="block text-xs text-navy/55">{l.description}</span></span><span className="shrink-0 text-xs text-navy/50">{l.duration_min} min</span></li>
                          ))}
                        </ul>
                      </details>
                    ))}
                  </div>
                )}
              </Block>
            )}
            {tab === 'requirements' && (
              <div className="space-y-8">
                {c.eligibility.length > 0 && <Block title="Eligibility"><Check items={c.eligibility} /></Block>}
                {c.requirements_text.length > 0 && <Block title="What you must complete"><Check items={c.requirements_text} gold /></Block>}
                <Notice title="Role scope">Learners must not diagnose, prescribe, or work beyond their approved role scope.</Notice>
                <Disclaimer />
              </div>
            )}
            {tab === 'assessment' && (
              <div className="space-y-8">
                <Block title="Assessment">
                  {assessment ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Fact icon={Target} label="Pass mark" value={`${assessment.pass_mark}%`} />
                      <Fact icon={Layers} label="Questions" value={`${assessment.num_questions} MCQs`} />
                      <Fact icon={Timer} label="Time limit" value={`${assessment.time_limit_min} minutes`} />
                      <Fact icon={RefreshCw} label="Retake" value={assessment.retake_after_days ? `After ${assessment.retake_after_days} days` : 'Per academy policy'} />
                    </div>
                  ) : <p className="text-sm text-navy/60">Assessment details will be published soon.</p>}
                  {assessment?.compulsory_category && <p className="mt-3 text-sm text-navy/70">The <strong>{assessment.compulsory_category}</strong> section is compulsory and must be passed on its own.</p>}
                </Block>
                {checklists.length > 0 && <Block title="Practical assessment"><ul className="space-y-2">{checklists.map((k) => <li key={k.id} className="rounded-xl bg-pale px-4 py-3 text-sm"><span className="font-semibold">{k.title}</span><span className="block text-navy/65">{k.description}{k.requires_evidence ? ' Evidence upload required.' : ''}</span></li>)}</ul></Block>}
                <Block title="Certificate requirements">
                  {c.requirements_text.length > 0 && <Check items={c.requirements_text} gold />}
                  <div className="mt-4 rounded-2xl border border-gold/50 bg-gold-soft/60 p-4 text-sm">
                    <p className="flex items-center gap-2 font-semibold"><Award className="h-4 w-4 text-amber-700" />{c.certificate_title} · {validityText(c)}</p>
                    <p className="mt-1 text-navy/75">{c.validity_policy && <span className="mb-1 block font-medium">Validity: {c.validity_policy}</span>}{c.requires_trainer_approval ? 'Certificates are never issued automatically for this course. After you pass the MCQ, your status reads “Awaiting trainer approval” until your trainer approves your practical work.' : 'Your certificate is issued once every requirement is complete.'} Each certificate carries a QR code for public verification.</p>
                  </div>
                </Block>
              </div>
            )}
            {tab === 'batches' && (
              <Block title="Available academy batches">
                {batches.length === 0 ? <Empty title="No upcoming batches yet">Contact the academy to be notified when the next batch opens.</Empty> : (
                  <div className="space-y-3">
                    {batches.map((b) => {
                      const left = b.capacity - b.seats_taken;
                      return (
                        <div key={b.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-navy/10 bg-white p-5">
                          <div>
                            <p className="font-semibold">{b.title}</p>
                            <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-navy/65">
                              <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-accent" />{fmtDate(b.starts_on)} · {fmtTime(b.start_time)}–{fmtTime(b.end_time)}</span>
                              <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-accent" />{b.branch_name}</span>
                              {b.trainer_name && <span className="inline-flex items-center gap-1.5"><UserRound className="h-4 w-4 text-accent" />{b.trainer_name}</span>}
                            </p>
                          </div>
                          <div className="text-right"><Badge tone={left > 0 ? 'green' : 'gold'}><Users className="h-3 w-3" />{left > 0 ? `${left} seats left` : 'Full · waitlist'}</Badge></div>
                        </div>
                      );
                    })}
                    <p className="text-sm text-navy/60">Enrol first, then book a batch from your academy page. {!user && <Link to="/signup" className="font-semibold text-teal">Register →</Link>}</p>
                  </div>
                )}
              </Block>
            )}
            {tab === 'faq' && (
              <Block title="Frequently asked questions">
                <div className="divide-y divide-navy/10 rounded-2xl border border-navy/10 bg-white">{faq.map(([q, a]) => <details key={q} className="group px-5 py-4"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold">{q}<ChevronDown className="h-4 w-4 shrink-0 transition group-open:rotate-180" /></summary><p className="mt-2 text-sm text-navy/70">{a}</p></details>)}</div>
              </Block>
            )}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="card">
              <p className="eyebrow">Trainer details</p>
              {trainers.length ? <ul className="mt-3 space-y-2">{trainers.map((t) => <li key={t} className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy text-sm font-bold text-gold">{t.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span><span className="text-sm font-semibold">{t}<span className="block text-xs font-normal text-navy/55">Academy trainer</span></span></li>)}</ul> : <p className="mt-2 text-sm text-navy/65">Trainers are assigned per batch.</p>}
              <p className="mt-3 text-xs text-navy/55">Clinical direction provided by the VTIARA Medical Advisor.</p>
            </div>
            {!soon && <FeeBox course={c} />}
            {!soon && !enrolled && <button onClick={() => setEnrol(true)} className="btn-primary w-full">Enrol Now</button>}
          </aside>
        </div>
      </div>
      {!soon && <EnrolModal course={c} open={enrol} onClose={() => setEnrol(false)} />}
    </>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="mb-3 font-display text-2xl font-semibold">{title}</h2>{children}</section>;
}
function Check({ items, gold }: { items: string[]; gold?: boolean }) {
  return <ul className="space-y-2">{items.map((i) => <li key={i} className="flex items-start gap-2.5 text-sm text-navy/80"><CheckCircle2 className={cn('mt-0.5 h-4 w-4 shrink-0', gold ? 'text-amber-600' : 'text-teal')} />{i}</li>)}</ul>;
}
function Fact({ icon: I, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return <div className="flex items-center gap-3 rounded-2xl bg-pale p-4"><I className="h-5 w-5 text-teal" /><div><p className="text-xs text-navy/55">{label}</p><p className="font-semibold">{value}</p></div></div>;
}
