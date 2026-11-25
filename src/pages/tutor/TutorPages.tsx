import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, MessageCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { backend, useQuery } from '@/lib/db';
import { Badge, Empty, ErrorNote, PageHeader, ProgressBar, Spinner, StatusBadge, Table, useAction, useToast } from '@/components/ui';
import { fmtDate, STATUS_LABEL } from '@/lib/utils';
import type { BatchAvailability, Booking, Course, Enrolment, Lesson, LessonQuestion, Profile } from '@/lib/types';

/** Students enrolled in the tutor's own batches, with progress and at-risk flags. */
export function TutorStudents() {
  const { user } = useAuth();
  const { data, loading, error } = useQuery(async () => {
    const [batches, bookings, courses, profiles, enrols] = await Promise.all([
      backend.select<BatchAvailability>('v_batch_availability', { eq: { trainer_id: user!.id } }),
      backend.select<Booking>('batch_bookings'), backend.select<Course>('courses'), backend.select<Profile>('profiles'), backend.select<Enrolment>('course_enrolments'),
    ]);
    return { batches, bookings, courses, profiles, enrols };
  }, [user?.id]);
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorNote message={error ?? 'Could not load students'} />;
  const mine = new Set(data.batches.map((b) => b.id));
  const ids = [...new Set(data.bookings.filter((b) => mine.has(b.batch_id) && b.status !== 'cancelled').map((b) => b.user_id))];
  const courseIds = new Set(data.batches.map((b) => b.course_id));
  const rows = ids.map((id) => ({ p: data.profiles.find((x) => x.id === id), e: data.enrols.find((x) => x.user_id === id && courseIds.has(x.course_id)) }));
  return (
    <>
      <PageHeader title="Students" subtitle="Learners booked into your batches." />
      {rows.length === 0 ? <Empty title="No students yet">Learners appear here once they book one of your batches.</Empty> : (
        <Table>
          <thead><tr><th className="th">Student</th><th className="th">Course</th><th className="th">Progress</th><th className="th">Stage</th><th className="th" /></tr></thead>
          <tbody className="divide-y divide-navy/5">{rows.map(({ p, e }) => {
            const atRisk = !!e && e.progress_pct < 30 && e.access_status === 'active';
            return (
              <tr key={p?.id}>
                <td className="td font-medium">{p?.full_name ?? 'Learner'}{atRisk && <Badge tone="gold" className="ml-2"><AlertTriangle className="h-3 w-3" />Needs support</Badge>}</td>
                <td className="td">{data.courses.find((c) => c.id === e?.course_id)?.title ?? '—'}</td>
                <td className="td w-40">{e ? <><ProgressBar value={e.progress_pct} label="Course progress" /><span className="text-xs text-navy/60">{e.progress_pct}%</span></> : '—'}</td>
                <td className="td">{e ? STATUS_LABEL[e.status] : '—'}</td>
                <td className="td text-right">{e && <Link className="btn-outline btn-sm" to={`/tutor/practicals/${e.id}`}>Practical</Link>}</td>
              </tr>
            );
          })}</tbody>
        </Table>
      )}
    </>
  );
}

/** Lessons flagged for review so tutors can keep teaching content current. */
export function TutorLessonReview() {
  const { data, loading, error } = useQuery(async () => {
    const [lessons, courses] = await Promise.all([backend.select<Lesson>('lessons'), backend.select<Course>('courses')]);
    return { lessons, courses };
  }, []);
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorNote message={error ?? 'Could not load lessons'} />;
  const today = new Date().toISOString().slice(0, 10);
  const flagged = data.lessons.filter((l) => l.content_status === 'review_required' || (l.next_review_on && l.next_review_on <= today) || l.content_status === 'draft');
  return (
    <>
      <PageHeader title="Lesson review" subtitle="Lessons that are in draft, flagged for review, or past their review date." />
      {flagged.length === 0 ? <Empty title="Nothing to review">All lessons are published and up to date.</Empty> : (
        <Table>
          <thead><tr><th className="th">Lesson</th><th className="th">Course</th><th className="th">Status</th><th className="th">Last reviewed</th><th className="th">Next review</th></tr></thead>
          <tbody className="divide-y divide-navy/5">{flagged.map((l) => (
            <tr key={l.id}><td className="td font-medium">{l.title}</td><td className="td">{data.courses.find((c) => c.id === l.course_id)?.title}</td>
              <td className="td"><StatusBadge status={l.content_status} /></td><td className="td">{l.reviewed_on ? fmtDate(l.reviewed_on) : 'Not recorded'}</td><td className="td">{l.next_review_on ? fmtDate(l.next_review_on) : 'To be confirmed'}</td></tr>
          ))}</tbody>
        </Table>
      )}
    </>
  );
}

/** Questions learners asked on lessons, answered by tutors. */
export function TutorSupport() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useQuery(async () => {
    const [qs, lessons, profiles] = await Promise.all([backend.select<LessonQuestion>('lesson_questions', { order: ['created_at', false] }), backend.select<Lesson>('lessons'), backend.select<Profile>('profiles')]);
    return { qs, lessons, profiles };
  }, []);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const toast = useToast();
  const { run, busy } = useAction();
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorNote message={error ?? 'Could not load messages'} />;
  const open = data.qs.filter((q) => !q.answer);
  const answered = data.qs.filter((q) => q.answer);
  const answer = (q: LessonQuestion) => run(async () => {
    await backend.update('lesson_questions', { id: q.id }, { answer: drafts[q.id], answered_by: user!.id });
    toast('Reply sent'); reload();
  });
  return (
    <>
      <PageHeader title="Messages and support" subtitle="Questions learners asked while studying a lesson." />
      <h2 className="mb-3 flex items-center gap-2 font-semibold"><MessageCircle className="h-4 w-4 text-teal" />Waiting for a reply ({open.length})</h2>
      {open.length === 0 ? <Empty title="You are all caught up">New learner questions will appear here.</Empty> : (
        <ul className="space-y-3">{open.map((q) => (
          <li key={q.id} className="card !p-5">
            <p className="text-xs text-navy/55">{data.profiles.find((p) => p.id === q.user_id)?.full_name ?? 'Learner'} · {data.lessons.find((l) => l.id === q.lesson_id)?.title} · {fmtDate(q.created_at)}</p>
            <p className="mt-1 font-medium">{q.question}</p>
            <textarea className="input mt-3" rows={2} placeholder="Write a helpful, role-appropriate answer" value={drafts[q.id] ?? ''} onChange={(e) => setDrafts({ ...drafts, [q.id]: e.target.value })} aria-label="Your reply" />
            <button className="btn-primary btn-sm mt-2" disabled={busy || !(drafts[q.id] ?? '').trim()} onClick={() => answer(q)}>Send reply</button>
          </li>
        ))}</ul>
      )}
      {answered.length > 0 && <>
        <h2 className="mb-3 mt-8 flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Answered ({answered.length})</h2>
        <ul className="space-y-2">{answered.slice(0, 10).map((q) => <li key={q.id} className="card !p-4 text-sm"><p className="font-medium">{q.question}</p><p className="mt-1 text-navy/70">{q.answer}</p></li>)}</ul>
      </>}
    </>
  );
}

export type { Booking };
