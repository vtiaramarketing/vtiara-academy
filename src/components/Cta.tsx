import { Link } from 'react-router-dom';
import { CalendarClock, IndianRupee, MessageCircle, Check } from 'lucide-react';
import { courseWhatsApp, useSettings, waLink, publicContact } from '@/lib/settings';
import { cn } from '@/lib/utils';
import type { Course } from '@/lib/types';

/** "Enquire on WhatsApp" + "Book a counselling call". Used in the hero, course details and footer. */
export function ContactCtas({ course, dark, className }: { course?: Pick<Course, 'id' | 'title'>; dark?: boolean; className?: string }) {
  const { settings } = useSettings();
  const wa = course ? courseWhatsApp(settings, course.title) : waLink(publicContact(settings).whatsapp, settings.whatsapp_message);
  const callTo = course ? `/enquire?intent=call&course=${course.id}` : '/enquire?intent=call';
  return (
    <div className={cn('flex flex-wrap gap-3', className)}>
      {wa && (
        <a href={wa} target="_blank" rel="noreferrer" className="btn bg-[#1f8f4e] text-white hover:brightness-110">
          <MessageCircle className="h-4 w-4" aria-hidden />Enquire on WhatsApp<span className="sr-only"> (opens in a new tab)</span>
        </a>
      )}
      <Link to={callTo} className={cn('btn border', dark ? 'border-white/30 text-white hover:bg-white/10' : 'border-navy/15 bg-white text-navy hover:border-teal hover:text-teal')}>
        <CalendarClock className="h-4 w-4" aria-hidden />Book a counselling call
      </Link>
    </div>
  );
}

export const formatFee = (amount: number, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);

/** Fee, what it includes, and an honest payment state. No online payment is offered. */
export function FeeBox({ course }: { course: Course }) {
  return (
    <div className="card">
      <p className="eyebrow flex items-center gap-1.5"><IndianRupee className="h-3.5 w-3.5" aria-hidden />Course fee</p>
      {course.fee_amount != null ? (
        <p className="mt-2 font-display text-3xl font-semibold">{formatFee(course.fee_amount, course.fee_currency)}</p>
      ) : (
        <p className="mt-2 text-sm font-semibold text-navy">Fee shared on enquiry</p>
      )}
      {course.fee_inclusions.length > 0 && (
        <ul className="mt-3 space-y-1.5" aria-label="Fee includes">
          {course.fee_inclusions.map((i) => <li key={i} className="flex items-start gap-2 text-sm text-navy/75"><Check className="mt-0.5 h-4 w-4 shrink-0 text-teal" aria-hidden />{i}</li>)}
        </ul>
      )}
      {course.fee_note && <p className="mt-3 text-xs text-navy/65">{course.fee_note}</p>}
      <p className="mt-4 rounded-xl bg-pale px-3 py-2 text-xs text-navy/75">
        {course.payment_status === 'coming_soon' ? 'Online payment is coming soon. ' : ''}
        Contact us to enrol and confirm payment details.
      </p>
    </div>
  );
}
