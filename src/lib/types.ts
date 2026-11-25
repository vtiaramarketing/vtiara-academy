export type RoleKey = 'super_admin' | 'academy_admin' | 'trainer' | 'assessor' | 'learner';
export type LearningMode = 'online' | 'academy' | 'blended';

export type EnrolmentStatus =
  | 'not_started' | 'in_progress' | 'session_booked' | 'assessment_unlocked'
  | 'awaiting_approval' | 'certified' | 'needs_retake' | 'expired';

export type CertStatus = 'valid' | 'expired' | 'revoked' | 'awaiting_approval';

export interface Profile {
  id: string; full_name: string; email: string | null; mobile: string | null; city: string | null;
  preferred_language: string | null; learner_code: string | null; job_role: string | null; branch_id: string | null;
  avatar_path: string | null; consent_privacy: boolean; consent_comms: boolean; is_active: boolean; created_at: string;
}
export interface Branch { id: string; name: string; city: string | null; address: string | null; maps_url: string | null; phone: string | null; hours: string | null; is_active: boolean }
export interface Course {
  id: string; slug: string; title: string; code: string; category: 'Clinical and Support' | 'Front Office and Management';
  role_key: string | null; role_label: string | null; status: 'draft' | 'published' | 'coming_soon' | 'archived'; sort_order: number;
  duration_hours: number; duration_label: string | null; level: 'Foundation' | 'Intermediate' | 'Advanced';
  languages: string[]; learning_modes: LearningMode[]; certificate_title: string | null; certificate_validity_months: number | null;
  requires_attendance: boolean; requires_practical: boolean; requires_trainer_approval: boolean;
  short_description: string | null; overview: string | null; audience: string | null; eligibility: string[];
  learning_outcomes: string[]; requirements_text: string[]; pass_rules: Record<string, unknown>; faq: { q: string; a: string }[];
  image_path: string | null;
  fee_amount: number | null; fee_currency: string; fee_inclusions: string[]; fee_note: string | null; payment_status: 'contact_us' | 'coming_soon';
  validity_policy: string | null; expiry_reminder_days: number; prerequisite_course_id: string | null;
}
export interface CourseModule { id: string; course_id: string; title: string; description: string | null; position: number; is_published: boolean }
export interface Lesson {
  id: string; module_id: string; course_id: string; title: string; description: string | null;
  video_path: string | null; duration_min: number; transcript: string | null; position: number;
  lesson_type: LessonType; body: string | null; external_url: string | null; video_url: string | null; video_provider: string | null; is_published: boolean;
  content_status: ContentStatus; content_version: number; reviewed_by: string | null; reviewed_on: string | null; next_review_on: string | null;
}
export type ContentStatus = 'draft' | 'published' | 'review_required';
export type LessonType = 'video' | 'text' | 'pdf' | 'link';
export interface LessonResource { id: string; lesson_id: string; title: string; kind: string; file_path: string }
export interface Enrolment {
  id: string; user_id: string; course_id: string; mode: LearningMode; status: EnrolmentStatus;
  progress_pct: number; enrolled_at: string; completed_at: string | null;
  access_status: AccessStatus; request_note: string | null; access_changed_by: string | null; access_changed_at: string | null;
}
export type AccessStatus = 'pending' | 'approved' | 'active' | 'completed' | 'cancelled';
export interface EnrolmentHistory { id: string; enrolment_id: string; from_status: AccessStatus | null; to_status: AccessStatus; changed_by: string | null; changed_by_name: string | null; note: string | null; created_at: string }
export interface Batch {
  id: string; course_id: string; branch_id: string | null; trainer_id: string | null; title: string; starts_on: string;
  start_time: string; end_time: string; capacity: number; mode: LearningMode; location: string | null;
  what_to_bring: string | null; practical_requirements: string | null; status: string;
}
export interface BatchAvailability extends Batch { branch_name: string | null; trainer_name: string | null; seats_taken: number; waitlist_count: number }
export interface Booking { id: string; batch_id: string; user_id: string; enrolment_id: string | null; status: 'booked' | 'waitlist' | 'cancelled' | 'attended' | 'no_show'; created_at: string }
export interface Attendance { id: string; batch_id: string; user_id: string; session_date: string; status: 'present' | 'absent' | 'no_show' }
export interface Assessment {
  id: string; course_id: string; title: string; time_limit_min: number; pass_mark: number; num_questions: number;
  retake_after_days: number; compulsory_category: string | null; status: string;
  approved_by: string | null; approved_on: string | null; last_reviewed_on: string | null;
}
export interface PublicQuestion { id: string; assessment_id: string; category: string | null; prompt: string; position: number }
export interface PublicOption { id: string; question_id: string; label: string; position: number }
export interface Attempt {
  id: string; assessment_id: string; user_id: string; enrolment_id: string | null; status: 'in_progress' | 'submitted' | 'expired';
  started_at: string; submitted_at: string | null; score_pct: number | null; passed: boolean | null;
  section_scores: Record<string, { correct: number; total: number }> | null;
}
export interface ReviewItem {
  question_id: string; category: string | null; prompt: string; explanation: string | null;
  selected_option_id: string | null; correct_option_id: string; is_correct: boolean;
}
export interface AttemptResult { attempt_id: string; score_pct: number; passed: boolean; section_scores: Attempt['section_scores']; review: ReviewItem[] }
export interface Checklist { id: string; course_id: string; title: string; description: string | null; requires_evidence: boolean; min_score_pct: number | null }
export interface ChecklistItem { id: string; checklist_id: string; label: string; is_critical: boolean; position: number }
export interface ItemResult { item_id: string; pass: boolean; note: string }
export interface PracticalAssessment {
  id: string; enrolment_id: string; checklist_id: string; learner_id: string; assessor_id: string | null; assessor_name: string | null;
  item_results: ItemResult[]; score_pct: number | null; result: 'pending' | 'passed' | 'failed'; trainer_notes?: string | null;
  learner_feedback: string | null; evidence_paths?: string[]; retake_reason: string | null; completed_on: string | null;
  approval_status: 'pending' | 'approved' | 'rejected'; approved_by?: string | null; approved_at: string | null;
}
export interface TrainerFeedback { id: string; enrolment_id: string | null; learner_id: string; trainer_id: string | null; trainer_name: string | null; message: string; created_at: string }
export interface Certificate {
  id: string; cert_no: string; enrolment_id: string | null; learner_id: string; course_id: string; learner_name: string;
  course_title: string; role_label: string | null; certificate_title: string | null; status: CertStatus;
  issued_on: string | null; valid_until: string | null; revoked_reason: string | null; created_at: string;
}
export interface Verification { cert_no: string; learner_name: string; course_title: string; certificate_title: string | null; issued_on: string | null; valid_until: string | null; status: CertStatus }
export interface Notification { id: string; user_id: string; title: string; body: string | null; link: string | null; is_read: boolean; created_at: string }
export interface AuditLog { id: string; actor_id: string | null; actor_name: string | null; action: string; entity: string | null; entity_id: string | null; details: unknown; created_at: string }
export interface LessonQuestion { id: string; lesson_id: string; user_id: string; question: string; answer: string | null; answered_by: string | null; created_at: string }

export interface SessionUser { id: string; email: string | null; roles: RoleKey[]; profile: Profile | null }

export interface AcademySettings {
  id: number; academy_name: string; tagline: string | null;
  academy_address: string | null; academy_maps_url: string | null; academy_phone: string | null; academy_whatsapp: string | null; academy_email: string | null; academy_hours: string | null;
  clinic_name: string; clinic_website: string | null; clinic_address: string | null; clinic_maps_url: string | null; clinic_phone: string | null; clinic_whatsapp: string | null; clinic_email: string | null; clinic_hours: string | null;
  instagram_url: string | null; facebook_url: string | null; youtube_url: string | null; linkedin_url: string | null;
  whatsapp_message: string | null; needs_confirmation: string[];
}
export interface TrainerProfile {
  id: string; full_name: string; title: string | null; qualification: string | null; specialisation: string | null; bio: string | null;
  photo_url: string | null; photo_path: string | null; source_url: string | null; is_medical_advisor: boolean; sort_order: number; is_published: boolean; needs_confirmation: boolean;
}
export type EnquiryStatus = 'new' | 'contacted' | 'counselling_scheduled' | 'enrolled' | 'not_interested' | 'closed';
export interface Enquiry {
  id: string; name: string; phone: string; email: string | null; course_id: string | null; course_label: string | null;
  preferred_contact: 'whatsapp' | 'phone' | 'email'; enquiry_type: 'general' | 'counselling_call' | 'course'; message: string | null; consent: boolean;
  status: EnquiryStatus; admin_notes: string | null; contacted_at: string | null; created_at: string; updated_at: string;
}
export interface Testimonial {
  id: string; author_name: string; author_role: string | null; course_id: string | null; quote: string; photo_path: string | null;
  consent_confirmed: boolean; is_published: boolean; sort_order: number;
}
