import { backend, useQuery } from './db';
import { useAuth } from './auth';
import type {
  Assessment, Attempt, BatchAvailability, Booking, Certificate, Checklist, Course, Enrolment, Lesson, PracticalAssessment, TrainerFeedback,
} from './types';

export interface LearnerData {
  courses: Course[];
  enrolments: Enrolment[];
  bookings: Booking[];
  batches: BatchAvailability[];
  attempts: Attempt[];
  assessments: Assessment[];
  certificates: Certificate[];
  feedback: TrainerFeedback[];
  practicals: Omit<PracticalAssessment, 'trainer_notes'>[];
  checklists: Checklist[];
  progressByCourse: Record<string, number>;
}

export function useLearnerData() {
  const { user } = useAuth();
  const q = useQuery<LearnerData>(async () => {
    await backend.rpc('sync_certificate_statuses').catch(() => {});
    const uid = user!.id;
    const [courses, enrolments, bookings, batches, attempts, assessments, certificates, feedback, practicals, checklists] = await Promise.all([
      backend.select<Course>('courses', { order: ['sort_order'] }),
      backend.select<Enrolment>('course_enrolments', { eq: { user_id: uid } }),
      backend.select<Booking>('batch_bookings', { eq: { user_id: uid } }),
      backend.select<BatchAvailability>('v_batch_availability', { order: ['starts_on'] }),
      backend.select<Attempt>('assessment_attempts', { eq: { user_id: uid }, order: ['started_at', false] }),
      backend.select<Assessment>('assessments'),
      backend.select<Certificate>('certificates', { eq: { learner_id: uid }, order: ['created_at', false] }),
      backend.select<TrainerFeedback>('trainer_feedback', { eq: { learner_id: uid }, order: ['created_at', false] }),
      backend.select<any>('v_my_practicals'),
      backend.select<Checklist>('practical_checklists'),
    ]);
    return { courses, enrolments, bookings, batches, attempts, assessments, certificates, feedback, practicals, checklists, progressByCourse: {} };
  }, [user?.id]);
  return q;
}

export async function firstIncompleteLesson(courseId: string, userId: string): Promise<Lesson | undefined> {
  const [mods, lessons, done] = await Promise.all([
    backend.select<any>('course_modules', { eq: { course_id: courseId }, order: ['position'] }),
    backend.select<Lesson>('lessons', { eq: { course_id: courseId } }),
    backend.select<any>('lesson_progress', { eq: { user_id: userId, course_id: courseId } }),
  ]);
  const doneIds = new Set(done.map((d) => d.lesson_id));
  const ordered = mods.flatMap((m: any) => lessons.filter((l) => l.module_id === m.id).sort((a, b) => a.position - b.position));
  return ordered.find((l) => !doneIds.has(l.id)) ?? ordered[0];
}

export const firstName = (n?: string | null) => (n ?? '').replace(/\(.*\)/, '').trim().split(' ')[0] || 'there';
