import { useSearchParams } from 'react-router-dom';
import EnquiryForm from '@/components/EnquiryForm';
import { ContactCtas } from '@/components/Cta';
import { useSettings } from '@/lib/settings';
import { usePageMeta } from '@/lib/seo';

export default function Enquire() {
  const [sp] = useSearchParams();
  const call = sp.get('intent') === 'call';
  const { contact } = useSettings();
  usePageMeta(call ? 'Book a counselling call' : 'Enquire', 'Ask about VTIARA Training Academy courses, fees and upcoming batches in Bangalore. Enquire by form or WhatsApp, or book a counselling call.');
  return (
    <div className="section grid gap-10 py-14 lg:grid-cols-[1fr_380px]">
      <div>
        <p className="eyebrow">{call ? 'Counselling call' : 'Enquiry'}</p>
        <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">{call ? 'Book a counselling call' : 'Ask us about a course'}</h1>
        <p className="mt-3 max-w-xl text-navy/70">{call ? 'Tell us a little about you and the course you are considering. Our team will call you to talk through the right path, fees and upcoming batches.' : 'Send us your question and we will reply on your preferred channel.'}</p>
        <div className="mt-8"><EnquiryForm initialCourse={sp.get('course') ?? ''} intent={call ? 'counselling_call' : 'general'} /></div>
      </div>
      <aside className="space-y-4 lg:pt-16">
        <div className="card">
          <p className="eyebrow">Prefer to talk now?</p>
          <ContactCtas className="mt-3" />
          <ul className="mt-5 space-y-2 text-sm text-navy/75">
            {contact.phone && <li>Phone: <a className="font-semibold text-teal" href={contact.telUrl ?? undefined}>{contact.phone}</a></li>}
            {contact.email && <li>Email: <a className="font-semibold text-teal" href={`mailto:${contact.email}`}>{contact.email}</a></li>}
            {contact.address && <li>{contact.address}</li>}
            {contact.hours && <li>{contact.hours}</li>}
          </ul>
        </div>
      </aside>
    </div>
  );
}
