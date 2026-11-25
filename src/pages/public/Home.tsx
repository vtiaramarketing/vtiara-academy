import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, MapPin, Quote, ArrowRight, Award, BadgeCheck, ChevronDown, ClipboardCheck, GraduationCap, HeartPulse, QrCode, Search, Stethoscope, UserRound, BookOpen, Users, CheckCircle2, MessageCircle } from 'lucide-react';
import { backend, useQuery } from '@/lib/db';
import { CourseCard } from '@/components/CourseBits';
import { Spinner, Disclaimer, Empty } from '@/components/ui';
import { ContactCtas } from '@/components/Cta';
import TrainerPhoto from '@/components/TrainerPhoto';
import EnquiryForm from '@/components/EnquiryForm';
import { usePageMeta } from '@/lib/seo';
import { useSettings } from '@/lib/settings';
import { cn, fmtDate, fmtTime } from '@/lib/utils';
import type { BatchAvailability, Course, TrainerProfile, Testimonial } from '@/lib/types';

import PathFinder from './PathFinder';
import { UI_CATEGORIES, inCategory, type UiCategory } from '@/lib/pathways';

const BENEFITS = [
  { icon: HeartPulse, title: 'Clinic-led practical training', text: 'Learn the way care is really delivered at VTIARA, on the clinic floor and in supervised sessions.' },
  { icon: UserRound, title: 'Learn from experienced tutors', text: 'Trainers who work to this standard every day teach, coach and assess you in person.' },
  { icon: ClipboardCheck, title: 'Structured assessments and feedback', text: 'Quizzes, practical checklists and written tutor feedback show exactly where to improve.' },
  { icon: BadgeCheck, title: 'Verified completion certificates', text: 'Every certificate has a number and QR code that anyone can check online.' },
];
const JOURNEY = [
  { icon: Search, t: 'Discover a course' }, { icon: MessageCircle, t: 'Request enrolment' }, { icon: BookOpen, t: 'Learn the lessons' },
  { icon: Users, t: 'Attend practical sessions' }, { icon: ClipboardCheck, t: 'Complete assessments' }, { icon: Award, t: 'Earn a verified certificate' },
];

const FAQ = [
  ['Who can join the academy?', 'The academy is open to VTIARA team members and to future trainees from outside the clinic. Each course lists its own eligibility.'],
  ['Do I get a certificate automatically after the MCQ test?', 'No. For courses that need attendance, practical assessment or supervised work, your certificate is issued only after your trainer has reviewed and approved everything.'],
  ['Can I complete a course fully online?', 'Some courses offer an online path, but practical assessments are always held in person at the academy.'],
  ['What if I fail the assessment?', 'You can retake it after the waiting period set for that course, if any. Your trainer may add feedback to help you.'],
  ['How do I verify a certificate?', 'Scan the QR code on the certificate, or enter the certificate ID on the verification page. You will see the name, course, dates and validity status only.'],
  ['Does a certificate allow me to diagnose or prescribe?', 'No. A VTIARA certificate never authorises diagnosing, prescribing or working beyond your approved role scope, clinic policy and applicable law.'],
];

export default function Home() {
  const { data, loading } = useQuery(() => backend.select<Course>('courses', { eq: { status: 'published' }, order: ['sort_order'] }), []);
  usePageMeta('Clinical and front-office training in Bangalore', 'VTIARA Training Academy offers role-based training and verified certificates for clinic teams in Bangalore. Learn online, at the academy or blended. Enquire on WhatsApp or book a counselling call.');
  const { settings } = useSettings();
  const { data: batches } = useQuery(async () => {
    const [b, cs] = await Promise.all([backend.select<BatchAvailability>('v_batch_availability', { order: ['starts_on'] }), backend.select<Course>('courses', {})]);
    const today = new Date().toISOString().slice(0, 10);
    return b.filter((x) => x.starts_on >= today && !['completed', 'cancelled'].includes(x.status)).slice(0, 3).map((x) => ({ ...x, course: cs.find((c) => c.id === x.course_id) }));
  }, []);
  const { data: team } = useQuery(() => backend.select<TrainerProfile>('trainer_profiles', { eq: { is_published: true }, order: ['sort_order'] }), []);
  const { data: stories } = useQuery(() => backend.select<Testimonial>('testimonials', { eq: { is_published: true }, order: ['sort_order'] }), []);
  const [certNo, setCertNo] = useState('');
  const [open, setOpen] = useState<number | null>(0);
  const [cat, setCat] = useState<UiCategory | 'all'>('all');
  const [more, setMore] = useState<string | null>(null);
  const nav = useNavigate();
  const courses = data ?? [];
  const featured = courses.filter((c) => inCategory(c, cat)).slice(0, 6);

  return (
    <>
      {/* 1. Hero */}
      <section className="relative overflow-hidden bg-navy text-white" aria-label="Introduction">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-teal/30 blur-3xl" />
        <div className="section relative grid items-center gap-12 py-16 lg:grid-cols-[1.1fr_.9fr] lg:py-24">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-sm font-medium text-gold"><GraduationCap className="h-4 w-4" aria-hidden />{settings.academy_name} · Bangalore</p>
            <h1 className="h-hero !text-white">Build practical skills for a career in aesthetic and clinical care.</h1>
            <p className="lead mt-6 max-w-xl !text-white/75">Clinic-backed training, supervised practice and verified certificates, designed around the real roles in a VTIARA clinic.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/courses" className="btn-gold !px-6 !py-3 text-base">Explore courses <ArrowRight className="h-4 w-4" aria-hidden /></Link>
              <Link to="/enquire?intent=call" className="btn border border-white/25 !px-6 !py-3 text-base text-white hover:bg-white/10">Speak to an academy counsellor</Link>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/75">
              {['Practical training', 'Expert tutors', 'Verifiable certificates', 'Bangalore branches'].map((t) => <li key={t} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-accent" aria-hidden />{t}</li>)}
            </ul>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 sm:p-8">
            <p className="text-sm font-semibold text-accent">Your path to certification</p>
            <ol className="mt-5 space-y-4">
              {[['Common Core', 'Foundation for every role'], ['Role training', 'Online, academy or blended'], ['Supervised practice', 'Observed by a VTIARA tutor'], ['Assessment', 'Quiz and practical checklist'], ['Verified certificate', 'Number and QR code']].map(([t, d], i) => (
                <li key={t} className="flex items-center gap-4">
                  <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold', i === 4 ? 'bg-gold text-navy' : 'bg-white/10 text-white')}>{i === 4 ? <Award className="h-4 w-4" aria-hidden /> : i + 1}</span>
                  <span><span className={cn('block font-semibold', i === 4 && 'text-gold')}>{t}</span><span className="text-sm text-white/60">{d}</span></span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* 2. Trust strip: only figures we can stand behind. Others are marked as to be confirmed. */}
      <section className="section relative z-10 -mt-8" aria-label="Academy at a glance">
        <div className="card grid gap-6 !p-6 sm:grid-cols-2 lg:grid-cols-4 lg:!p-8">
          <div className="sm:col-span-2 lg:col-span-1"><p className="text-sm font-semibold text-teal">Learn with</p><p className="mt-1 text-lg font-bold leading-snug">VTIARA Hair &amp; Skin Clinic</p></div>
          <div><p className="text-3xl font-bold text-navy">{loading ? '…' : courses.length}</p><p className="text-sm text-ink/60">Courses available</p></div>
          <div><p className="text-3xl font-bold text-navy">3</p><p className="text-sm text-ink/60">Ways to learn: online, academy, blended</p></div>
          <div><p className="text-lg font-bold text-navy/40">To be confirmed</p><p className="text-sm text-ink/60">Learners trained and certificates issued</p></div>
        </div>
      </section>

      {/* 3. Find your training path */}
      <section className="section pt-20 sm:pt-24" aria-labelledby="path-h">
        <div className="max-w-2xl"><p className="eyebrow">Find your training path</p><h2 id="path-h" className="h-section mt-2">Not sure where to start? Answer two questions.</h2></div>
        <div className="mt-8"><PathFinder courses={courses} /></div>
      </section>

      {/* 4. Featured courses */}
      <section id="courses" className="section scroll-mt-20 pt-20 sm:pt-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="eyebrow">Featured courses</p><h2 className="h-section mt-2">Start with Common Core, then your role</h2></div>
          <Link to="/courses" className="btn-outline">View all courses <ArrowRight className="h-4 w-4" aria-hidden /></Link>
        </div>
        <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          {(['all', ...UI_CATEGORIES] as const).map((c) => <button key={c} onClick={() => setCat(c)} aria-pressed={cat === c} className={cn('chip', cat === c && 'chip-on')}>{c === 'all' ? 'All courses' : c}</button>)}
        </div>
        {loading ? <div className="mt-8"><Spinner /></div> : featured.length === 0
          ? <div className="mt-8"><Empty title="No courses in this category yet">Try another category, or talk to a counsellor about what is coming next.</Empty></div>
          : <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{featured.map((c) => <CourseCard key={c.id} course={c} />)}</div>}
      </section>

      {/* 5. Why VTIARA Academy */}
      <section id="why" className="mt-20 scroll-mt-20 bg-mist py-20 sm:mt-24">
        <div className="section">
          <div className="max-w-2xl"><p className="eyebrow">Why learn at VTIARA Academy</p><h2 className="h-section mt-2">Training that matches real clinic work</h2></div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((b) => (
              <div key={b.title} className="card card-hover"><div className="mb-4 inline-flex rounded-xl bg-teal/10 p-3 text-teal"><b.icon className="h-5 w-5" aria-hidden /></div><h3 className="text-lg font-bold leading-snug">{b.title}</h3><p className="mt-2 text-sm text-ink/70">{b.text}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Learning journey */}
      <section id="how" className="section scroll-mt-20 pt-20 sm:pt-24">
        <div className="max-w-2xl"><p className="eyebrow">How it works</p><h2 className="h-section mt-2">From first look to verified certificate</h2></div>
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {JOURNEY.map((j, i) => (
            <li key={j.t} className="card !p-5">
              <div className="flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy text-white"><j.icon className="h-4 w-4" aria-hidden /></span><span className="text-sm font-bold text-navy/25">0{i + 1}</span></div>
              <p className="mt-4 font-semibold leading-snug">{j.t}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Upcoming batches */}
      <section id="batches" className="section scroll-mt-20 pt-20 sm:pt-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="eyebrow">Upcoming batches</p><h2 className="h-section mt-2">Next academy sessions</h2></div>
          <Link to="/enquire" className="btn-outline">Ask about a batch <ArrowRight className="h-4 w-4" aria-hidden /></Link>
        </div>
        {!batches ? <div className="mt-8"><Spinner /></div> : batches.length === 0 ? (
          <div className="mt-8"><Empty title="No batches scheduled right now">New academy batches are announced here. Send us an enquiry and we will tell you when the next one opens.</Empty></div>
        ) : (
          <ul className="mt-8 grid gap-5 md:grid-cols-3">
            {batches.map((b) => {
              const left = b.capacity - b.seats_taken;
              return (
                <li key={b.id} className="card card-hover fade-up flex flex-col !p-5">
                  <p className="eyebrow">{b.course?.title ?? 'Academy batch'}</p>
                  <h3 className="mt-1 font-bold">{b.title}</h3>
                  <p className="mt-3 flex items-center gap-2 text-sm text-ink/70"><CalendarDays className="h-4 w-4 text-teal" aria-hidden />{fmtDate(b.starts_on)} · {fmtTime(b.start_time)}–{fmtTime(b.end_time)}</p>
                  {(b.branch_name || b.location) && <p className="mt-1 flex items-center gap-2 text-sm text-ink/70"><MapPin className="h-4 w-4 text-teal" aria-hidden />{b.branch_name ?? b.location}</p>}
                  <p className={cn('mt-3 text-xs font-semibold', left > 0 ? 'text-green-700' : 'text-amber-700')}>{left > 0 ? `${left} seats left` : 'Full · join the waitlist'}</p>
                  <Link to={b.course ? `/courses/${b.course.slug}` : '/courses'} className="btn-primary mt-4">View course and enrol</Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 7. Trainers */}
      <section id="trainers" className="section scroll-mt-20 pt-20 sm:pt-24">
        <div className="grid items-start gap-10 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <p className="eyebrow">Trainers and mentors</p>
            <h2 className="h-section mt-2">Taught by the people who work to this standard every day</h2>
            <p className="lead mt-4">Every course is delivered by VTIARA trainers and directed by the clinic&apos;s Medical Advisor, so what you learn matches how care is delivered, and where your role stops.</p>
            <div className="mt-6"><Disclaimer /></div>
          </div>
          {team && team.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2">
              {team.map((t) => (
                <li key={t.id} className="card card-hover !p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <TrainerPhoto t={t} className="h-14 w-14 shrink-0 text-lg" />
                    <div><p className="font-bold leading-tight">{t.full_name}</p>{t.title && <p className="text-xs text-ink/60">{t.title}</p>}</div>
                  </div>
                  {t.qualification && <p className="text-xs font-semibold text-teal">{t.qualification}</p>}
                  {t.specialisation && <p className="mt-1 text-sm text-ink/70">{t.specialisation}</p>}
                  {t.bio && (more === t.id
                    ? <p className="mt-2 text-sm text-ink/70">{t.bio}</p>
                    : <button className="mt-2 text-sm font-semibold text-teal hover:underline" onClick={() => setMore(t.id)} aria-expanded="false">View trainer profile</button>)}
                  {t.bio && more === t.id && <button className="mt-2 text-sm font-semibold text-teal hover:underline" onClick={() => setMore(null)} aria-expanded="true">Hide profile</button>}
                  {t.needs_confirmation && <p className="mt-2 text-xs text-amber-700">Details to be confirmed</p>}
                </li>
              ))}
            </ul>
          ) : (
            <div className="card !p-6"><div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-navy text-gold"><Stethoscope className="h-5 w-5" aria-hidden /></div><p className="font-bold">Clinical direction from the VTIARA Medical Advisor</p><p className="mt-1 text-sm text-ink/65">Trainer profiles are being added.</p></div>
          )}
        </div>
      </section>

      {/* 8. Student stories: only real, consented testimonials are shown */}
      <section id="stories" className="section scroll-mt-20 pt-20 sm:pt-24" aria-labelledby="stories-h">
        <p className="eyebrow">Student stories</p><h2 id="stories-h" className="h-section mt-2">What our learners say</h2>
        {stories && stories.length > 0 ? (
          <ul className="mt-8 grid gap-5 md:grid-cols-3">
            {stories.map((t) => (
              <li key={t.id} className="card card-hover"><Quote className="h-6 w-6 text-gold" aria-hidden /><blockquote className="mt-3 text-ink/80">{t.quote}</blockquote><p className="mt-4 text-sm font-bold">{t.author_name}{t.author_role && <span className="block text-xs font-normal text-ink/60">{t.author_role}</span>}</p></li>
            ))}
          </ul>
        ) : (
          <div className="mt-8"><Empty title="Student stories are coming soon">We only share learner stories with their written consent. They will appear here once published.</Empty></div>
        )}
      </section>

      {/* 9. Counselling CTA */}
      <section id="enquire" className="section scroll-mt-20 pt-20 sm:pt-24">
        <div className="grid gap-10 rounded-3xl bg-mist p-6 sm:p-10 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <p className="eyebrow">Course counselling</p>
            <h2 className="h-section mt-2">Not sure which programme is right for you?</h2>
            <p className="lead mt-3">Speak with a VTIARA Academy counsellor. Tell us your role and goals, and we will suggest a path, share fees and tell you about the next batch.</p>
            <ContactCtas className="mt-6" />
          </div>
          <EnquiryForm intent="counselling_call" />
        </div>
      </section>

      {/* 10. Certificate verification */}
      <section className="section pt-20 sm:pt-24">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy to-teal-dark p-8 text-white sm:p-12">
          <QrCode className="absolute -right-6 -top-6 h-48 w-48 text-white/5" aria-hidden />
          <div className="relative max-w-xl">
            <p className="text-sm font-semibold text-gold">Certificate verification</p>
            <h2 className="h-section mt-2 !text-white">Every VTIARA certificate can be verified</h2>
            <p className="mt-2 text-white/75">Enter the certificate number or scan its QR code. We show the name, course, dates and validity only.</p>
            <form className="mt-6 flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); if (certNo.trim()) nav(`/verify/${encodeURIComponent(certNo.trim())}`); }}>
              <input className="input sm:flex-1" placeholder="e.g. VTA-CC-2026-0001-XXXX" value={certNo} onChange={(e) => setCertNo(e.target.value)} aria-label="Certificate number" />
              <button className="btn-gold"><Search className="h-4 w-4" aria-hidden />Verify</button>
            </form>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section pt-20 sm:pt-24">
        <div className="mx-auto max-w-3xl">
          <p className="eyebrow">FAQ</p><h2 className="h-section mt-2">Questions, answered</h2>
          <div className="mt-8 divide-y divide-navy/10 rounded-2xl border border-navy/10 bg-white">
            {FAQ.map(([q, a], i) => (
              <div key={q}>
                <button className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
                  {q}<ChevronDown className={cn('h-5 w-5 shrink-0 text-teal transition-transform duration-200', open === i && 'rotate-180')} aria-hidden />
                </button>
                {open === i && <p className="fade-up px-5 pb-5 text-sm text-ink/70">{a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
