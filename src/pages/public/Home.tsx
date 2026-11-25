import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, MapPin, Quote, ArrowRight, Award, BadgeCheck, ChevronDown, GraduationCap, HeartPulse, MonitorPlay, Building, Layers, QrCode, Search, Stethoscope, UserRound, ShieldCheck } from 'lucide-react';
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

const TRUST = [
  { icon: ShieldCheck, title: 'Clinical Standards', text: 'Training built around infection control, consent, privacy and safe practice.' },
  { icon: UserRound, title: 'Experienced Trainers', text: 'Learn from VTIARA trainers who assess you in person, not just by quiz.' },
  { icon: HeartPulse, title: 'Practical Learning', text: 'Supervised floor practice, practical stations and logbooks where the role needs them.' },
  { icon: BadgeCheck, title: 'Verified Certificates', text: 'Every certificate carries a QR code anyone can verify in seconds.' },
];
const STEPS = ['Register', 'Choose your role path', 'Learn online or at the academy', 'Pass assessment and practical review', 'Earn your verified certificate'];
const MODES = [
  { icon: MonitorPlay, title: 'Learn Online', text: 'Recorded classes, handouts and transcripts at your own pace, anywhere.' },
  { icon: Building, title: 'Attend Academy', text: 'In-person sessions at the academy with trainers, ideal for hands-on skills.' },
  { icon: Layers, title: 'Blended Learning', text: 'Study online first, then attend the academy for practice and assessment.' },
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
  const nav = useNavigate();

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy text-white" aria-label="Introduction">
        <div className="pointer-events-none absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-teal/30 blur-3xl" />
        <svg className="absolute inset-0 h-full w-full opacity-[0.05]" aria-hidden><defs><pattern id="dots" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.5" fill="#fff" /></pattern></defs><rect width="100%" height="100%" fill="url(#dots)" /></svg>
        <div className="section relative grid items-center gap-12 py-20 lg:grid-cols-[1.15fr_.85fr] lg:py-28">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-gold"><GraduationCap className="h-3.5 w-3.5" />{settings.academy_name} · Bangalore</p>
            <h1 className="font-display text-4xl font-semibold leading-[1.1] text-white sm:text-5xl lg:text-6xl">Seven Roles. One Standard. <span className="text-gold">Certified Before Patients.</span></h1>
            <p className="mt-6 max-w-xl text-lg text-white/75">Structured online, academy, and supervised training for safe, consistent VTIARA care.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/courses" className="btn-gold !px-6 !py-3 text-base">Explore Courses <ArrowRight className="h-4 w-4" /></Link>
              <Link to="/login" className="btn border border-white/25 !px-6 !py-3 text-base text-white hover:bg-white/10">Sign In</Link>
            </div>
            <ContactCtas dark className="mt-4" />
          </div>
          {/* role path visual */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <p className="eyebrow mb-4 !text-accent">Your path to certification</p>
            <ol className="space-y-3">
              {['Common Core', 'Role Training', 'Supervised Practice', 'Assessment', 'Certificate'].map((s, i) => (
                <li key={s} className="flex items-center gap-3">
                  <span className={cn('flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold', i === 4 ? 'bg-gold text-navy' : 'bg-white/10 text-white')}>{i === 4 ? <Award className="h-4 w-4" /> : i + 1}</span>
                  <span className={cn('text-sm font-medium', i === 4 ? 'text-gold' : 'text-white/85')}>{s}</span>
                  {i < 4 && <span className="ml-auto h-px flex-1 bg-gradient-to-r from-white/20 to-transparent" />}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="section -mt-10 relative z-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST.map((t) => (
            <div key={t.title} className="card !p-5">
              <div className="mb-3 inline-flex rounded-xl bg-pale p-2.5 text-teal"><t.icon className="h-5 w-5" /></div>
              <h3 className="font-semibold">{t.title}</h3>
              <p className="mt-1 text-sm text-navy/65">{t.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="section scroll-mt-20 pt-24">
        <div className="max-w-2xl"><p className="eyebrow">How it works</p><h2 className="mt-2 font-display text-3xl font-semibold">Five steps from registration to a verified certificate</h2></div>
        <ol className="mt-10 grid gap-4 md:grid-cols-5">
          {STEPS.map((s, i) => (
            <li key={s} className="relative rounded-2xl bg-pale p-5">
              <span className="font-display text-4xl font-semibold text-teal/30">0{i + 1}</span>
              <p className="mt-1 font-semibold leading-snug">{s}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Upcoming batches */}
      <section id="batches" className="section scroll-mt-20 pt-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="eyebrow">Upcoming batches</p><h2 className="mt-2 font-display text-3xl font-semibold">Next academy sessions</h2></div>
          <Link to="/enquire" className="btn-outline">Ask about a batch <ArrowRight className="h-4 w-4" aria-hidden /></Link>
        </div>
        {!batches ? <Spinner /> : batches.length === 0 ? (
          <div className="mt-8"><Empty title="No batches scheduled right now">New academy batches are announced here. Send us an enquiry and we will tell you when the next one opens.</Empty></div>
        ) : (
          <ul className="mt-8 grid gap-5 md:grid-cols-3">
            {batches.map((b) => {
              const left = b.capacity - b.seats_taken;
              return (
                <li key={b.id} className="card fade-up flex flex-col !p-5">
                  <p className="eyebrow">{b.course?.title ?? 'Academy batch'}</p>
                  <h3 className="mt-1 font-semibold">{b.title}</h3>
                  <p className="mt-3 flex items-center gap-2 text-sm text-navy/70"><CalendarDays className="h-4 w-4 text-teal" aria-hidden />{fmtDate(b.starts_on)} · {fmtTime(b.start_time)}–{fmtTime(b.end_time)}</p>
                  {(b.branch_name || b.location) && <p className="mt-1 flex items-center gap-2 text-sm text-navy/70"><MapPin className="h-4 w-4 text-teal" aria-hidden />{b.branch_name ?? b.location}</p>}
                  <p className={cn('mt-3 text-xs font-semibold', left > 0 ? 'text-green-700' : 'text-amber-700')}>{left > 0 ? `${left} seats left` : 'Full · join the waitlist'}</p>
                  <Link to={b.course ? `/courses/${b.course.slug}` : '/courses'} className="btn-primary mt-4">View course and enrol</Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Featured courses */}
      <section className="section pt-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="eyebrow">Featured courses</p><h2 className="mt-2 font-display text-3xl font-semibold">Start with Common Core, then your role</h2></div>
          <Link to="/courses" className="btn-outline">View all courses <ArrowRight className="h-4 w-4" /></Link>
        </div>
        {loading ? <Spinner /> : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{(data ?? []).slice(0, 3).map((c) => <CourseCard key={c.id} course={c} />)}</div>
        )}
      </section>

      {/* Learning modes */}
      <section className="mt-24 bg-pale py-20">
        <div className="section">
          <div className="max-w-2xl"><p className="eyebrow">Learning modes</p><h2 className="mt-2 font-display text-3xl font-semibold">Learn the way your role needs</h2></div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {MODES.map((m) => (
              <div key={m.title} className="card"><m.icon className="h-8 w-8 text-teal" /><h3 className="mt-4 text-lg font-semibold">{m.title}</h3><p className="mt-1 text-sm text-navy/70">{m.text}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* Trainers & Medical Advisor */}
      <section className="section pt-24">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="eyebrow">Trainers and Medical Advisor</p>
            <h2 className="mt-2 font-display text-3xl font-semibold">Taught by the people who work to this standard every day</h2>
            <p className="mt-4 text-navy/70">Every course is delivered by VTIARA trainers and directed by the clinic's Medical Advisor, so what you learn matches how care is actually delivered, and where your role stops.</p>
            <div className="mt-6"><Disclaimer /></div>
          </div>
          {team && team.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2">
              {team.map((t) => (
                <li key={t.id} className="card !p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <TrainerPhoto t={t} className="h-14 w-14 shrink-0 text-lg" />
                    <div><p className="font-semibold leading-tight">{t.full_name}</p>{t.title && <p className="text-xs text-navy/65">{t.title}</p>}</div>
                  </div>
                  {t.qualification && <p className="text-xs font-semibold text-teal">{t.qualification}</p>}
                  {t.specialisation && <p className="mt-1 text-sm text-navy/70">{t.specialisation}</p>}
                  {t.bio && <p className="mt-2 text-sm text-navy/65">{t.bio}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <div className="card !p-5"><div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-navy text-gold"><Stethoscope className="h-5 w-5" aria-hidden /></div><p className="font-semibold">Clinical direction from the VTIARA Medical Advisor</p><p className="mt-0.5 text-sm text-navy/65">Trainer and advisor profiles are being added.</p></div>
          )}
        </div>
      </section>

      {/* Verify CTA */}
      <section className="section pt-24">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy to-teal-dark p-8 text-white sm:p-12">
          <QrCode className="absolute -right-6 -top-6 h-48 w-48 text-white/5" aria-hidden />
          <div className="relative max-w-xl">
            <p className="eyebrow !text-gold">Certificate verification</p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-white">Check a VTIARA certificate in seconds</h2>
            <p className="mt-2 text-white/75">Enter the certificate ID or scan its QR code. We show the name, course, dates and validity only.</p>
            <form className="mt-6 flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); if (certNo.trim()) nav(`/verify/${encodeURIComponent(certNo.trim())}`); }}>
              <input className="input sm:flex-1" placeholder="e.g. VTA-CC-2026-0001-XXXX" value={certNo} onChange={(e) => setCertNo(e.target.value)} aria-label="Certificate ID" />
              <button className="btn-gold"><Search className="h-4 w-4" />Verify</button>
            </form>
          </div>
        </div>
      </section>

      {/* Success stories: shown only when published with consent */}
      {stories && stories.length > 0 && (
        <section className="section pt-24" aria-labelledby="stories-h">
          <p className="eyebrow">Success stories</p><h2 id="stories-h" className="mt-2 font-display text-3xl font-semibold">What our learners say</h2>
          <ul className="mt-8 grid gap-5 md:grid-cols-3">
            {stories.map((t) => (
              <li key={t.id} className="card"><Quote className="h-6 w-6 text-gold" aria-hidden /><blockquote className="mt-3 text-sm text-navy/80">{t.quote}</blockquote><p className="mt-4 text-sm font-semibold">{t.author_name}{t.author_role && <span className="block text-xs font-normal text-navy/60">{t.author_role}</span>}</p></li>
            ))}
          </ul>
        </section>
      )}

      {/* Enquiry */}
      <section id="enquire" className="section scroll-mt-20 pt-24">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <p className="eyebrow">Enquire</p>
            <h2 className="mt-2 font-display text-3xl font-semibold">Not sure which course fits? Talk to us.</h2>
            <p className="mt-3 text-navy/70">Tell us your role and goals. We will suggest a path, share fees and tell you about the next batch.</p>
            <ContactCtas className="mt-6" />
          </div>
          <EnquiryForm />
        </div>
      </section>

      {/* FAQ */}
      <section className="section pt-24">
        <div className="mx-auto max-w-3xl">
          <p className="eyebrow">FAQ</p><h2 className="mt-2 font-display text-3xl font-semibold">Questions, answered</h2>
          <div className="mt-8 divide-y divide-navy/10 rounded-2xl border border-navy/10 bg-white">
            {FAQ.map(([q, a], i) => (
              <div key={q}>
                <button className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
                  {q}<ChevronDown className={cn('h-5 w-5 shrink-0 text-teal transition', open === i && 'rotate-180')} />
                </button>
                {open === i && <p className="px-5 pb-5 text-sm text-navy/70">{a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
