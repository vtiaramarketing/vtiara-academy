import { Link } from 'react-router-dom';
import { Hourglass } from 'lucide-react';
import { backend, useQuery } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import { fmtDate } from '@/lib/utils';
import type { Certificate, Course } from '@/lib/types';

const daysUntil = (d: string) => Math.ceil((Date.parse(d) - Date.now()) / 864e5);

/** Friendly heads-up for certificates that expire within each course's reminder window. */
export default function ExpiryBanner({ linkToCerts = true }: { linkToCerts?: boolean }) {
  const { user } = useAuth();
  const { data } = useQuery(async () => {
    if (!user) return [];
    const [certs, courses] = await Promise.all([backend.select<Certificate>('certificates', { eq: { learner_id: user.id, status: 'valid' } }), backend.select<Course>('courses', {})]);
    return certs.filter((c) => c.valid_until && daysUntil(c.valid_until) >= 0 && daysUntil(c.valid_until) <= (courses.find((x) => x.id === c.course_id)?.expiry_reminder_days ?? 30));
  }, [user?.id]);
  if (!data?.length) return null;
  return (
    <div role="status" className="flex items-start gap-3 rounded-2xl border border-gold/60 bg-gold-soft/70 p-4 text-sm text-navy">
      <Hourglass className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
      <div>
        <p className="font-semibold">{data.length === 1 ? 'A certificate is expiring soon' : `${data.length} certificates are expiring soon`}</p>
        <ul className="mt-1 text-navy/80">{data.map((c) => <li key={c.id}>{c.course_title}: expires {fmtDate(c.valid_until)} ({daysUntil(c.valid_until!)} days left)</li>)}</ul>
        <p className="mt-1 text-navy/70">Contact the academy to arrange refresher training or renewal. {linkToCerts && <Link to="/app/certificates" className="font-semibold text-teal">View certificates →</Link>}</p>
      </div>
    </div>
  );
}
