import { Link } from 'react-router-dom';
import { Badge, CourseImage, Empty, ErrorNote, PageHeader, ProgressBar, Spinner } from '@/components/ui';
import { useLearnerData } from '@/lib/learner';
import { MODE_LABEL, enrolBadge } from '@/lib/utils';

export default function MyCourses() {
  const { data: d, loading, error } = useLearnerData();
  if (loading) return <Spinner />;
  if (error || !d) return <ErrorNote message={error ?? 'Could not load courses'} />;
  return (
    <>
      <PageHeader title="My courses" subtitle="Everything you are enrolled in, with your current status." actions={<Link to="/courses" className="btn-primary">Browse catalogue</Link>} />
      {d.enrolments.length === 0 ? <Empty title="No courses yet" action={<Link to="/courses" className="btn-primary">Explore courses</Link>}>Start with Common Core Training, the foundation for every role.</Empty> : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {d.enrolments.map((e) => {
            const c = d.courses.find((x) => x.id === e.course_id)!;
            return (
              <Link key={e.id} to={`/app/courses/${c.slug}`} className="card group overflow-hidden !p-0 transition hover:shadow-lift">
                <CourseImage course={c} className="h-32 w-full" />
                <div className="p-5">
                  <Badge tone={enrolBadge(e).tone}>{enrolBadge(e).label}</Badge>
                  <h3 className="mt-2 font-semibold group-hover:text-teal">{c.title}</h3>
                  <p className="text-xs text-navy/55">{MODE_LABEL[e.mode]} · {c.duration_label}</p>
                  <div className="mt-4 flex items-center gap-3"><div className="flex-1"><ProgressBar value={e.progress_pct} /></div><span className="text-xs font-semibold tabular-nums">{e.progress_pct}%</span></div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
