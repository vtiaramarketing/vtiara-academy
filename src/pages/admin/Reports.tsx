import { backend, useQuery } from '@/lib/db';
import { ErrorNote, PageHeader, Spinner, Table } from '@/components/ui';
import { downloadCsv, pct } from '@/lib/utils';
import type { Assessment, Attempt, Certificate, Course, Enrolment } from '@/lib/types';

export default function Reports() {
  const { data, loading, error } = useQuery(async () => {
    const [courses, enrols, attempts, assessments, certs] = await Promise.all([
      backend.select<Course>('courses'), backend.select<Enrolment>('course_enrolments'), backend.select<Attempt>('assessment_attempts'),
      backend.select<Assessment>('assessments'), backend.select<Certificate>('certificates'),
    ]);
    return { courses, enrols, attempts, assessments, certs };
  }, []);
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorNote message={error ?? 'Could not load reports'} />;
  const rows = data.courses.filter((c) => c.status !== 'coming_soon').map((c) => {
    const en = data.enrols.filter((e) => e.course_id === c.id);
    const aIds = data.assessments.filter((a) => a.course_id === c.id).map((a) => a.id);
    const at = data.attempts.filter((a) => aIds.includes(a.assessment_id) && a.status === 'submitted');
    const cert = data.certs.filter((x) => x.course_id === c.id);
    return {
      Course: c.title, Enrolled: en.length, 'In progress': en.filter((e) => !['certified', 'not_started'].includes(e.status)).length,
      Certified: en.filter((e) => e.status === 'certified').length, 'Completion %': pct(en.filter((e) => e.status === 'certified').length, en.length),
      Attempts: at.length, 'Pass rate %': pct(at.filter((a) => a.passed).length, at.length), 'Avg score %': at.length ? Math.round(at.reduce((s, a) => s + Number(a.score_pct ?? 0), 0) / at.length) : 0,
      'Certificates valid': cert.filter((x) => x.status === 'valid').length, Revoked: cert.filter((x) => x.status === 'revoked').length, Expired: cert.filter((x) => x.status === 'expired').length,
    };
  });
  return (
    <>
      <PageHeader title="Reports" subtitle="Enrolment, assessment and certificate performance by course." actions={<button className="btn-outline" onClick={() => downloadCsv('academy-report.csv', rows)}>Export CSV</button>} />
      <Table>
        <thead><tr>{Object.keys(rows[0] ?? { Course: '' }).map((k) => <th key={k} className="th">{k}</th>)}</tr></thead>
        <tbody className="divide-y divide-navy/5">{rows.map((r) => <tr key={r.Course}>{Object.values(r).map((v, i) => <td key={i} className={i === 0 ? 'td font-medium' : 'td tabular-nums'}>{v}</td>)}</tr>)}</tbody>
      </Table>
    </>
  );
}
