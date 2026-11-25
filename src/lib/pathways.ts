import type { Course } from './types';

/** UI categories shown to learners. They are derived from the role a course belongs to, so no database change is needed. */
export const UI_CATEGORIES = ['Clinical', 'Aesthetics', 'Patient support', 'Operations', 'Management'] as const;
export type UiCategory = (typeof UI_CATEGORIES)[number];

const ROLE_CATEGORY: Record<string, UiCategory> = {
  staff_nurse: 'Clinical', dermatologist: 'Clinical', skin_therapist: 'Aesthetics',
  telecaller: 'Patient support', front_desk: 'Patient support', housekeeping: 'Operations', branch_manager: 'Management',
};
/** Common Core (role "all") is the foundation for everyone, so it appears under every category. */
export const categoryOf = (c: Pick<Course, 'role_key'>): UiCategory | 'All roles' => (c.role_key && ROLE_CATEGORY[c.role_key]) || 'All roles';
export const inCategory = (c: Pick<Course, 'role_key'>, cat: UiCategory | 'all') => cat === 'all' || categoryOf(c) === cat || categoryOf(c) === 'All roles';

export const FOCUS_OPTIONS: { id: 'clinical' | 'aesthetic' | 'operations' | 'management'; label: string; cats: UiCategory[] }[] = [
  { id: 'clinical', label: 'Clinical care', cats: ['Clinical'] },
  { id: 'aesthetic', label: 'Aesthetic treatments', cats: ['Aesthetics'] },
  { id: 'operations', label: 'Patient support and operations', cats: ['Patient support', 'Operations'] },
  { id: 'management', label: 'Management', cats: ['Management'] },
];
export const EXPERIENCE_OPTIONS = [
  { id: 'beginner', label: 'I am new to this' },
  { id: 'experienced', label: 'I already work in this field' },
] as const;

/** Suggest Common Core first for beginners, then the courses in the chosen focus area. */
export function recommend(courses: Course[], focus: string, experience: string): Course[] {
  const f = FOCUS_OPTIONS.find((x) => x.id === focus);
  if (!f) return [];
  const role = courses.filter((c) => f.cats.includes(categoryOf(c) as UiCategory));
  const core = courses.filter((c) => categoryOf(c) === 'All roles');
  return experience === 'beginner' ? [...core, ...role] : [...role, ...core];
}
