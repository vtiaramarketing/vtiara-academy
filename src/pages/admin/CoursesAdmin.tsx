import { useState, type ChangeEvent } from 'react';
import { backend, useQuery } from '@/lib/db';
import { Badge, Button, CourseImage, ErrorNote, Field, Modal, Notice, PageHeader, Spinner, Table, useAction, useToast } from '@/components/ui';
import { LESSON_TYPE_LABEL } from '@/lib/utils';
import type { ContentStatus, Course, CourseModule, Lesson, LessonType } from '@/lib/types';

const STATUSES = ['draft', 'published', 'coming_soon', 'archived'] as const;
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

export default function CoursesAdmin() {
  const { busy, run } = useAction();
  const toast = useToast();
  const [thumb, setThumb] = useState<File | null>(null);
  const [edit, setEdit] = useState<Partial<Course> | null>(null);
  const [content, setContent] = useState<Course | null>(null);
  const [newMod, setNewMod] = useState('');
  const [lesson, setLesson] = useState<Partial<Lesson> | null>(null); const [lessonErr, setLessonErr] = useState('');
  const { data, loading, error, reload } = useQuery(async () => {
    const [courses, modules, lessons] = await Promise.all([backend.select<Course>('courses', { order: ['sort_order'] }), backend.select<CourseModule>('course_modules', { order: ['position'] }), backend.select<Lesson>('lessons', { order: ['position'] })]);
    return { courses, modules, lessons };
  }, []);
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorNote message={error ?? 'Could not load courses'} />;
  const save = async () => {
    if (!edit?.title?.trim() || !edit.code?.trim()) return;
    const row: Record<string, unknown> = { ...edit, slug: edit.slug || slugify(edit.title), languages: edit.languages ?? ['English'], learning_modes: edit.learning_modes ?? ['online'], eligibility: edit.eligibility ?? [], learning_outcomes: edit.learning_outcomes ?? [], requirements_text: edit.requirements_text ?? [] };
    if (row.fee_amount === '' || Number.isNaN(row.fee_amount)) row.fee_amount = null;
    if (thumb && (!/^image\/(jpeg|png|webp)$/.test(thumb.type) || thumb.size > 3 * 1024 * 1024)) { toast('Thumbnail must be a JPG, PNG or WebP under 3 MB', 'err'); return; }
    const ok = await run(async () => {
      if (edit.id) {
        if (thumb) row.image_path = await backend.storage.upload('course-thumbnails', `${edit.id}/${Date.now()}-${thumb.name.replace(/[^a-z0-9._-]/gi, '_')}`, thumb);
        await backend.update('courses', { id: edit.id }, row);
      } else await backend.insert('courses', row);
    }, 'Course saved'); if (ok) { setEdit(null); setThumb(null); reload(); }
  };
  const mods = content ? data.modules.filter((m) => m.course_id === content.id) : [];
  const addModule = async () => { if (!content || !newMod.trim()) return; await run(() => backend.insert('course_modules', { course_id: content.id, title: newMod.trim(), position: mods.length + 1, is_published: false })); setNewMod(''); reload(); };
  const rm = async (table: string, id: string) => { await run(() => backend.remove(table, { id })); reload(); };
  const togglePublish = async (table: 'course_modules' | 'lessons', id: string, on: boolean) => { await run(() => backend.update(table, { id }, table === 'lessons' ? { content_status: on ? 'published' : 'draft' } : { is_published: on }), on ? 'Published' : 'Unpublished'); reload(); };
  const markReviewed = async (l: Lesson) => { const today = new Date().toISOString().slice(0, 10); const next = new Date(); next.setFullYear(next.getFullYear() + 1); await run(() => backend.update('lessons', { id: l.id }, { reviewed_on: today, next_review_on: next.toISOString().slice(0, 10), content_status: l.content_status === 'review_required' ? 'published' : l.content_status }), 'Marked as reviewed'); reload(); };
  /** Swap positions with the neighbour, then renumber so positions stay 1..n. */
  const move = async (table: 'course_modules' | 'lessons', list: { id: string }[], id: string, dir: -1 | 1) => {
    const i = list.findIndex((x) => x.id === id); const j = i + dir; if (i < 0 || j < 0 || j >= list.length) return;
    const order = [...list]; [order[i], order[j]] = [order[j], order[i]];
    await run(async () => { for (let k = 0; k < order.length; k++) await backend.update(table, { id: order[k].id }, { position: k + 1 }); });
    reload();
  };
  const saveLesson = async () => {
    if (!lesson?.title?.trim()) { setLessonErr('Title is required.'); return; }
    const t = lesson.lesson_type ?? 'video';
    const https = (u?: string | null) => !u || /^https:\/\//i.test(u);
    if (!https(lesson.external_url) || !https(lesson.video_url)) { setLessonErr('Links must start with https://'); return; }
    if ((t === 'pdf' || t === 'link') && !lesson.external_url) { setLessonErr('Add the link for this lesson.'); return; }
    if (t === 'text' && !lesson.body?.trim()) { setLessonErr('Add the lesson text.'); return; }
    setLessonErr('');
    const row = { title: lesson.title.trim(), description: lesson.description ?? null, lesson_type: t, duration_min: Number(lesson.duration_min) || 10, body: t === 'text' ? lesson.body : null,
      external_url: t === 'pdf' || t === 'link' ? lesson.external_url : null, video_url: t === 'video' ? (lesson.video_url || null) : null, video_provider: t === 'video' ? (lesson.video_provider || null) : null,
      content_status: lesson.content_status ?? 'draft', content_version: Number(lesson.content_version) || 1, reviewed_by: lesson.reviewed_by || null, reviewed_on: lesson.reviewed_on || null, next_review_on: lesson.next_review_on || null };
    const ok = await run(async () => { lesson.id ? await backend.update('lessons', { id: lesson.id }, row) : await backend.insert('lessons', { ...row, module_id: lesson.module_id, course_id: lesson.course_id, position: lesson.position }); }, 'Lesson saved');
    if (ok) { setLesson(null); reload(); }
  };
  const set = (k: keyof Course) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { const t = e.target as HTMLInputElement; setEdit({ ...edit, [k]: t.type === 'checkbox' ? t.checked : t.type === 'number' ? Number(t.value) : t.value }); };
  return (
    <>
      <PageHeader title="Courses" subtitle="Fees, validity, prerequisites, thumbnails and lesson reviews. Courses without content stay Coming Soon." actions={<button className="btn-primary" onClick={() => setEdit({ status: 'draft', level: 'Foundation', category: 'Clinical and Support', duration_hours: 10, certificate_validity_months: 12, sort_order: 100, languages: ['English'], learning_modes: ['online'], pass_rules: {}, faq: [] })}>New course</button>} />
      {data.lessons.some((l) => l.content_status === 'review_required') && <div className="mb-4"><Notice tone="gold" title="Lessons need review">{data.lessons.filter((l) => l.content_status === 'review_required').length} lesson(s) are marked "Review required". They stay visible to learners until you change their status. Open a course's Content to review them.</Notice></div>}
      <Table><thead><tr><th className="th">Course</th><th className="th">Hours</th><th className="th">Requirements</th><th className="th">Status</th><th className="th" /></tr></thead>
        <tbody className="divide-y divide-navy/5">{data.courses.map((c) => <tr key={c.id}><td className="td font-medium">{c.title}<span className="block text-xs text-navy/50">{c.code}</span></td><td className="td">{c.duration_hours}</td><td className="td text-xs">{[c.requires_attendance && 'Attendance', c.requires_practical && 'Practical', c.requires_trainer_approval && 'Trainer approval'].filter(Boolean).join(' · ') || 'Online only'}</td><td className="td"><Badge tone={c.status === 'published' ? 'green' : c.status === 'coming_soon' ? 'gold' : 'slate'}>{c.status.replace('_', ' ')}</Badge></td><td className="td whitespace-nowrap text-right font-semibold text-teal"><button className="mr-3" onClick={() => setContent(c)}>Content</button><button onClick={() => setEdit(c)}>Edit</button></td></tr>)}</tbody></Table>

      <Modal open={!!edit} onClose={() => { setEdit(null); setThumb(null); }} title={edit?.id ? 'Edit course' : 'New course'} wide>
        {edit && <div className="space-y-4"><div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title"><input className="input" value={edit.title ?? ''} onChange={set('title')} /></Field>
          <Field label="Code" hint="Used in certificate numbers"><input className="input" value={edit.code ?? ''} onChange={set('code')} /></Field>
          <Field label="Status"><select className="input" value={edit.status} onChange={set('status')}>{STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select></Field>
          <Field label="Level"><select className="input" value={edit.level} onChange={set('level')}>{['Foundation', 'Intermediate', 'Advanced'].map((s) => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Duration (hours)"><input type="number" className="input" value={edit.duration_hours ?? 0} onChange={set('duration_hours')} /></Field>
          <Field label="Duration label"><input className="input" value={edit.duration_label ?? ''} onChange={set('duration_label')} /></Field>
          <Field label="Certificate title"><input className="input" value={edit.certificate_title ?? ''} onChange={set('certificate_title')} /></Field>
          <Field label="Validity (months)" hint="Leave empty until the academy confirms a validity period"><input type="number" className="input" value={edit.certificate_validity_months ?? ''} onChange={(e) => setEdit({ ...edit, certificate_validity_months: e.target.value === '' ? null : Number(e.target.value) })} /></Field>
        </div>
          <fieldset className="rounded-2xl border border-navy/10 p-4">
            <legend className="px-2 text-sm font-semibold">Fees and enrolment</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Course fee (INR)" hint="Leave empty to show 'Fee shared on enquiry'."><input type="number" min={0} className="input" value={edit.fee_amount ?? ''} onChange={(e) => setEdit({ ...edit, fee_amount: e.target.value === '' ? null : Number(e.target.value) })} /></Field>
              <Field label="Payment state"><select className="input" value={edit.payment_status ?? 'contact_us'} onChange={set('payment_status')}><option value="contact_us">Contact us to enrol</option><option value="coming_soon">Online payment coming soon</option></select></Field>
              <Field label="Fee includes" hint="One per line"><textarea className="input" rows={3} value={(edit.fee_inclusions ?? []).join('\n')} onChange={(e) => setEdit({ ...edit, fee_inclusions: lines(e.target.value) })} /></Field>
              <Field label="Fee note"><textarea className="input" rows={3} value={edit.fee_note ?? ''} onChange={set('fee_note')} /></Field>
              <Field label="Prerequisite course" hint="Learners must hold this certificate before enrolling."><select className="input" value={edit.prerequisite_course_id ?? ''} onChange={(e) => setEdit({ ...edit, prerequisite_course_id: e.target.value || null })}><option value="">None</option>{data.courses.filter((c) => c.id !== edit.id).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></Field>
            </div>
          </fieldset>
          <fieldset className="rounded-2xl border border-navy/10 p-4">
            <legend className="px-2 text-sm font-semibold">Certificate validity</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Validity policy" hint="Shown to learners, e.g. refresher needed every 12 months."><textarea className="input" rows={2} value={edit.validity_policy ?? ''} onChange={set('validity_policy')} /></Field>
              <Field label="Send expiry reminder (days before)"><input type="number" min={1} max={365} className="input" value={edit.expiry_reminder_days ?? 30} onChange={set('expiry_reminder_days')} /></Field>
            </div>
          </fieldset>
          <fieldset className="rounded-2xl border border-navy/10 p-4">
            <legend className="px-2 text-sm font-semibold">Thumbnail</legend>
            {edit.id ? (
              <div className="flex flex-wrap items-center gap-4">
                <CourseImage course={{ ...(edit as Course), code: edit.code ?? 'NEW', title: edit.title ?? 'Course', role_key: edit.role_key ?? null }} className="h-20 w-36 rounded-xl" />
                <Field label="Upload image" hint="JPG, PNG or WebP, up to 3 MB. Replaces the placeholder."><input type="file" accept="image/jpeg,image/png,image/webp" className="input" onChange={(e) => setThumb(e.target.files?.[0] ?? null)} /></Field>
              </div>
            ) : <p className="text-sm text-navy/65">Save the course first, then reopen it to upload a thumbnail.</p>}
          </fieldset>
          <Field label="Short description"><textarea className="input" rows={2} value={edit.short_description ?? ''} onChange={set('short_description')} /></Field>
          <Field label="Overview"><textarea className="input" rows={3} value={edit.overview ?? ''} onChange={set('overview')} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Learning outcomes" hint="One per line"><textarea className="input" rows={4} value={(edit.learning_outcomes ?? []).join('\n')} onChange={(e) => setEdit({ ...edit, learning_outcomes: lines(e.target.value) })} /></Field>
            <Field label="Eligibility" hint="One per line"><textarea className="input" rows={4} value={(edit.eligibility ?? []).join('\n')} onChange={(e) => setEdit({ ...edit, eligibility: lines(e.target.value) })} /></Field>
          </div>
          <div className="flex flex-wrap gap-5 text-sm">{(['requires_attendance', 'requires_practical', 'requires_trainer_approval'] as const).map((k) => <label key={k} className="flex items-center gap-2"><input type="checkbox" className="accent-teal" checked={!!edit[k]} onChange={set(k)} />{k.replace('requires_', 'Requires ').replace('_', ' ')}</label>)}</div>
          <div className="flex flex-wrap gap-5 text-sm">{(['online', 'academy', 'blended'] as const).map((m) => <label key={m} className="flex items-center gap-2"><input type="checkbox" className="accent-teal" checked={(edit.learning_modes ?? []).includes(m)} onChange={(e) => setEdit({ ...edit, learning_modes: e.target.checked ? [...(edit.learning_modes ?? []), m] : (edit.learning_modes ?? []).filter((x) => x !== m) })} />{m}</label>)}</div>
          <div className="flex justify-end gap-2"><button className="btn-outline" onClick={() => { setEdit(null); setThumb(null); }}>Cancel</button><Button className="btn-primary" loading={busy} onClick={save}>Save course</Button></div></div>}
      </Modal>

      <Modal open={!!content} onClose={() => setContent(null)} title={content ? `Content: ${content.title}` : ''} wide>
        {content && <div className="space-y-5">
          <p className="text-xs text-navy/55">New modules and lessons start unpublished. Learners only see published items, and only when their enrolment is active.</p>
          {mods.map((m, mi) => { const ls = data.lessons.filter((l) => l.module_id === m.id).sort((a, b) => a.position - b.position); return (
            <div key={m.id} className="rounded-2xl border border-navy/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{mi + 1}. {m.title} <Badge tone={m.is_published ? 'green' : 'slate'}>{m.is_published ? 'Published' : 'Draft'}</Badge></p>
                <span className="flex items-center gap-3 text-xs font-semibold">
                  <button disabled={mi === 0} onClick={() => move('course_modules', mods, m.id, -1)} aria-label="Move module up" className="disabled:opacity-30">↑</button>
                  <button disabled={mi === mods.length - 1} onClick={() => move('course_modules', mods, m.id, 1)} aria-label="Move module down" className="disabled:opacity-30">↓</button>
                  <button className="text-teal" onClick={() => togglePublish('course_modules', m.id, !m.is_published)}>{m.is_published ? 'Unpublish' : 'Publish'}</button>
                  <button className="text-red-600" onClick={() => { if (confirm('Delete this module and its lessons?')) rm('course_modules', m.id); }}>Delete</button>
                </span>
              </div>
              <ul className="mt-2 divide-y divide-navy/5 text-sm">{ls.map((l, li) => (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>{l.title} <Badge>{LESSON_TYPE_LABEL[l.lesson_type]}</Badge> <Badge tone={l.content_status === 'published' ? 'green' : l.content_status === 'review_required' ? 'gold' : 'slate'}>{l.content_status === 'review_required' ? 'Review required' : l.content_status === 'published' ? 'Published' : 'Draft'}</Badge>{l.next_review_on && l.next_review_on < new Date().toISOString().slice(0, 10) && <Badge tone="red">Review overdue</Badge>}</span>
                  <span className="flex items-center gap-3 text-xs font-semibold">
                    <button disabled={li === 0} onClick={() => move('lessons', ls, l.id, -1)} aria-label="Move lesson up" className="disabled:opacity-30">↑</button>
                    <button disabled={li === ls.length - 1} onClick={() => move('lessons', ls, l.id, 1)} aria-label="Move lesson down" className="disabled:opacity-30">↓</button>
                    <button className="text-teal" onClick={() => { setLessonErr(''); setLesson(l); }}>Edit</button>
                    <button className="text-teal" onClick={() => markReviewed(l)}>Mark reviewed</button>
                    <button className="text-teal" onClick={() => togglePublish('lessons', l.id, l.content_status !== 'published')}>{l.content_status === 'published' ? 'Unpublish' : 'Publish'}</button>
                    <button className="text-red-600" onClick={() => { if (confirm('Delete this lesson?')) rm('lessons', l.id); }}>Remove</button>
                  </span></li>))}</ul>
              <button className="btn-outline btn-sm mt-3" onClick={() => { setLessonErr(''); setLesson({ module_id: m.id, course_id: m.course_id, position: ls.length + 1, lesson_type: 'video', duration_min: 10, title: '', content_status: 'draft', content_version: 1 }); }}>Add lesson</button>
            </div>); })}
          <div className="flex gap-2"><input className="input" placeholder="New module title" value={newMod} onChange={(e) => setNewMod(e.target.value)} /><button className="btn-primary" onClick={addModule}>Add module</button></div>
          <p className="text-xs text-navy/55">Videos are never stored in the database. Use a secure https video URL from your video provider, or upload to the private course-videos bucket.</p></div>}
      </Modal>

      <Modal open={!!lesson} onClose={() => setLesson(null)} title={lesson?.id ? 'Edit lesson' : 'Add lesson'} wide>
        {lesson && <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title"><input className="input" value={lesson.title ?? ''} onChange={(e) => setLesson({ ...lesson, title: e.target.value })} /></Field>
            <Field label="Type"><select className="input" value={lesson.lesson_type ?? 'video'} onChange={(e) => setLesson({ ...lesson, lesson_type: e.target.value as LessonType })}>{(Object.keys(LESSON_TYPE_LABEL) as LessonType[]).map((t) => <option key={t} value={t}>{LESSON_TYPE_LABEL[t]}</option>)}</select></Field>
            <Field label="Duration (minutes)"><input type="number" min={1} className="input" value={lesson.duration_min ?? 10} onChange={(e) => setLesson({ ...lesson, duration_min: Number(e.target.value) })} /></Field>
          </div>
          <Field label="Description"><textarea className="input" rows={2} value={lesson.description ?? ''} onChange={(e) => setLesson({ ...lesson, description: e.target.value })} /></Field>
          {(lesson.lesson_type ?? 'video') === 'video' && <div className="grid gap-4 sm:grid-cols-2"><Field label="Secure video URL (https)"><input className="input" value={lesson.video_url ?? ''} onChange={(e) => setLesson({ ...lesson, video_url: e.target.value })} placeholder="https://" /></Field><Field label="Provider reference" hint="e.g. Vimeo, Mux"><input className="input" value={lesson.video_provider ?? ''} onChange={(e) => setLesson({ ...lesson, video_provider: e.target.value })} /></Field></div>}
          {(lesson.lesson_type === 'pdf' || lesson.lesson_type === 'link') && <Field label={lesson.lesson_type === 'pdf' ? 'Document link (https)' : 'External link (https)'}><input className="input" value={lesson.external_url ?? ''} onChange={(e) => setLesson({ ...lesson, external_url: e.target.value })} placeholder="https://" /></Field>}
          {lesson.lesson_type === 'text' && <Field label="Lesson text"><textarea className="input" rows={8} value={lesson.body ?? ''} onChange={(e) => setLesson({ ...lesson, body: e.target.value })} /></Field>}
          <fieldset className="rounded-2xl border border-navy/10 p-4">
            <legend className="px-2 text-sm font-semibold">Content review</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Status" hint="Review required keeps the lesson visible but flags it here."><select className="input" value={lesson.content_status ?? 'draft'} onChange={(e) => setLesson({ ...lesson, content_status: e.target.value as ContentStatus })}><option value="draft">Draft (hidden from learners)</option><option value="published">Published</option><option value="review_required">Review required</option></select></Field>
              <Field label="Version"><input type="number" min={1} className="input" value={lesson.content_version ?? 1} onChange={(e) => setLesson({ ...lesson, content_version: Number(e.target.value) })} /></Field>
              <Field label="Reviewed by"><input className="input" value={lesson.reviewed_by ?? ''} onChange={(e) => setLesson({ ...lesson, reviewed_by: e.target.value })} /></Field>
              <Field label="Review date"><input type="date" className="input" value={lesson.reviewed_on ?? ''} onChange={(e) => setLesson({ ...lesson, reviewed_on: e.target.value })} /></Field>
              <Field label="Next review due"><input type="date" className="input" value={lesson.next_review_on ?? ''} onChange={(e) => setLesson({ ...lesson, next_review_on: e.target.value })} /></Field>
            </div>
          </fieldset>
          {lessonErr && <p className="text-sm text-red-600" role="alert">{lessonErr}</p>}
          <div className="flex justify-end gap-2"><button className="btn-outline" onClick={() => setLesson(null)}>Cancel</button><Button className="btn-primary" loading={busy} onClick={saveLesson}>Save lesson</Button></div>
        </div>}
      </Modal>
    </>
  );
}
