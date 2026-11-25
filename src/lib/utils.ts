import type { AccessStatus, CertStatus, EnrolmentStatus, LearningMode, LessonType } from './types';

export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export const DISCLAIMER =
  'Completion of a VTIARA Training Academy course does not authorise a learner to diagnose, prescribe, or perform procedures outside their approved role, clinic policy, Medical Advisor direction, and applicable law.';

export const fmtDate = (d?: string | null) =>
  d ? new Date(d.length === 10 ? d + 'T00:00:00' : d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
export const fmtTime = (t?: string | null) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};
export const fmtDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—';

export const ACCESS_LABEL: Record<AccessStatus, string> = { pending: 'Awaiting approval', approved: 'Approved', active: 'Active', completed: 'Completed', cancelled: 'Cancelled' };
export const ACCESS_TONE: Record<AccessStatus, 'slate' | 'blue' | 'teal' | 'gold' | 'green' | 'red'> = { pending: 'gold', approved: 'blue', active: 'green', completed: 'teal', cancelled: 'red' };
export const LESSON_TYPE_LABEL: Record<LessonType, string> = { video: 'Video', text: 'Reading', pdf: 'PDF / resource', link: 'External link' };

export const MODE_LABEL: Record<LearningMode, string> = { online: 'Learn Online', academy: 'Attend Academy', blended: 'Blended Learning' };
export const MODE_SHORT: Record<LearningMode, string> = { online: 'Online', academy: 'Academy', blended: 'Blended' };

export const STATUS_LABEL: Record<EnrolmentStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  session_booked: 'Academy session booked',
  assessment_unlocked: 'Assessment unlocked',
  awaiting_approval: 'Passed — awaiting trainer approval',
  certified: 'Certified',
  needs_retake: 'Needs retake',
  expired: 'Certificate expired',
};
export const STATUS_TONE: Record<EnrolmentStatus, 'slate' | 'blue' | 'teal' | 'gold' | 'green' | 'red'> = {
  not_started: 'slate', in_progress: 'blue', session_booked: 'teal', assessment_unlocked: 'teal',
  awaiting_approval: 'gold', certified: 'green', needs_retake: 'red', expired: 'red',
};
export const CERT_LABEL: Record<CertStatus, string> = { valid: 'Valid', expired: 'Expired', revoked: 'Revoked', awaiting_approval: 'Awaiting approval' };
export const CERT_TONE: Record<CertStatus, 'green' | 'red' | 'gold' | 'slate'> = { valid: 'green', expired: 'red', revoked: 'red', awaiting_approval: 'gold' };

export const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin', academy_admin: 'Academy Admin', trainer: 'Trainer', assessor: 'Assessor', learner: 'Learner',
};

/** What a learner should do next, given their enrolment state. */
export function nextAction(status: EnrolmentStatus, mode: LearningMode, requiresAttendance: boolean): string {
  switch (status) {
    case 'not_started': return mode === 'academy' ? 'Book your academy session' : 'Start your first lesson';
    case 'in_progress': return requiresAttendance && mode !== 'online' ? 'Finish your lessons, then book an academy session' : 'Continue your lessons';
    case 'session_booked': return 'Attend your academy session — your trainer will mark attendance';
    case 'assessment_unlocked': return 'Take your MCQ assessment';
    case 'awaiting_approval': return 'Your trainer is reviewing your practical work';
    case 'needs_retake': return 'Review the feedback and retake when eligible';
    case 'certified': return 'Download or share your certificate';
    case 'expired': return 'Renew your certificate by retaking the assessment';
  }
}

/** Soft, deterministic image placeholder gradient per course. */
export function courseGradient(code: string): string {
  const g: Record<string, string> = {
    CC: 'from-teal to-accent', ST: 'from-navy to-teal', SN: 'from-teal-dark to-navy', HK: 'from-accent to-teal',
    TC: 'from-navy-600 to-accent', DT: 'from-slate-400 to-slate-500', FD: 'from-slate-400 to-slate-500', BM: 'from-slate-400 to-slate-500',
  };
  return g[code] ?? 'from-teal to-accent';
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = filename; a.click(); URL.revokeObjectURL(a.href);
}

export const pct = (a: number, b: number) => (b ? Math.round((100 * a) / b) : 0);
export const verifyUrl = (certNo: string) => `${window.location.origin}/verify/${encodeURIComponent(certNo)}`;

const OPEN: AccessStatus[] = ['active', 'completed'];
export const hasAccess = (e: { access_status: AccessStatus }) => OPEN.includes(e.access_status);
/** Label/tone for an enrolment: shows the approval state until the enrolment is active. */
export const enrolBadge = (e: { access_status: AccessStatus; status: EnrolmentStatus }) =>
  hasAccess(e) ? { label: STATUS_LABEL[e.status], tone: STATUS_TONE[e.status] } : { label: ACCESS_LABEL[e.access_status], tone: ACCESS_TONE[e.access_status] };
export const ACCESS_NEXT: Record<AccessStatus, string> = {
  pending: 'Your enrolment request is awaiting approval',
  approved: 'Your enrolment is approved. Waiting for activation',
  cancelled: 'This enrolment is not active. Request enrolment again or contact the academy',
  active: '', completed: '',
};
