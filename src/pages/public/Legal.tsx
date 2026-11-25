import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Disclaimer, Notice } from '@/components/ui';
import { usePageMeta } from '@/lib/seo';

function Page({ title, updated = 'November 2026', children }: { title: string; updated?: string; children: ReactNode }) {
  return (
    <div className="section max-w-3xl py-14">
      <p className="eyebrow">VTIARA Training Academy</p>
      <h1 className="mt-2 font-display text-4xl font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-navy/55">Last updated {updated}</p>
      <div className="mt-6"><Notice tone="gold" title="Draft for review">This is a working draft written for the academy launch. Have it reviewed by your legal adviser before publishing.</Notice></div>
      <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-navy/80 [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-navy [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">{children}</div>
    </div>
  );
}

export function Privacy() {
  usePageMeta('Privacy policy', 'How VTIARA Training Academy handles learner and enquiry information.');
  return (
    <Page title="Privacy Policy">
      <section><h2>What we collect</h2><p>To run your training we collect only what is needed: your name, contact details, city, preferred language, learner or employee ID, role and branch. Nurses also provide their Nursing Council registration number and supporting document so we can verify eligibility. We also keep your progress, attendance, assessment results, practical assessments and trainer feedback.</p></section>
      <section><h2>Why we use it</h2><ul><li>To deliver courses, track progress and run assessments.</li><li>To record attendance and practical assessments and to issue and verify certificates.</li><li>To send academy communications you have agreed to, such as session reminders.</li><li>To keep a secure audit trail of changes to learner records.</li></ul></section>
      <section><h2>Who can see your data</h2><p>You can see your own records. Academy admins and the trainers assigned to your batch can see what they need to teach and assess you. Nursing registration details and documents are visible only to authorised admins and trainers. Access is enforced in the database, not only in the app.</p></section>
      <section><h2>Public certificate verification</h2><p>Anyone with your certificate ID can see your name, course, issue and expiry dates and validity status. Scores, documents and contact details are never shown.</p></section>
      <section><h2>Data minimisation and storage</h2><p>We do not ask for information we do not need. Documents and practical evidence are stored privately and are never exposed through public links. We keep records for as long as needed for certification and compliance, then delete or anonymise them.</p></section>
      <section><h2>Your choices</h2><p>You can ask to access, correct or delete your data, and withdraw communication consent at any time, subject to record-keeping obligations under applicable law, including India’s Digital Personal Data Protection Act, 2023. Contact the academy to make a request.</p></section>
    </Page>
  );
}

export function Terms() {
  usePageMeta('Terms and conditions', 'Terms for using the VTIARA Training Academy platform and courses.');
  return (
    <Page title="Terms and Conditions">
      <section><h2>Using the academy</h2><p>The academy is for training VTIARA team members and approved trainees. Keep your login private and do not share course materials, assessments or recordings outside the academy.</p></section>
      <section><h2>Assessments and integrity</h2><p>Complete assessments yourself, without help or outside material unless instructed. Attempts that breach this may be voided and may affect certification.</p></section>
      <section><h2>Attendance and practical work</h2><p>Where a course requires attendance, practical assessment or supervised work, these must be completed in person and approved by a trainer before a certificate is issued. Certificates are not issued automatically for these courses.</p></section>
      <section><h2>Scope of practice</h2><Disclaimer /></section>
      <section><h2>Certificates</h2><p>Certificates remain the property of VTIARA Training Academy and may be revoked for misconduct, error or breach of clinic policy. See <Link className="font-semibold text-teal" to="/certificate-terms">Certificate Verification Terms</Link>.</p></section>
      <section><h2>Changes</h2><p>We may update courses, assessments and these terms. Material changes will be notified in the app.</p></section>
    </Page>
  );
}

export function CertificateTerms() {
  usePageMeta('Certificate terms', 'What a VTIARA Training Academy certificate does and does not authorise, validity and verification.');
  return (
    <Page title="Certificate Verification Terms">
      <section><h2>Purpose</h2><p>Verification lets employers, clinics and patients confirm that a certificate was genuinely issued by VTIARA Training Academy and whether it is currently valid.</p></section>
      <section><h2>What verification shows</h2><ul><li>Learner name</li><li>Course and certificate title</li><li>Issue date and valid-until date</li><li>Status: Valid, Expired, Revoked or Awaiting approval</li></ul></section>
      <section><h2>What it never shows</h2><p>Scores, attendance, personal documents, mobile numbers, email addresses or any other private data.</p></section>
      <section><h2>Acceptable use</h2><p>Use verification only to check a specific certificate. Do not scrape, guess or bulk-test certificate IDs. Verification attempts are logged.</p></section>
      <section><h2>Scope</h2><Disclaimer /></section>
    </Page>
  );
}

export function NotFound() {
  usePageMeta('Page not found', 'This page does not exist or has moved.', { noindex: true });
  return (
    <div className="section py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-2 font-display text-4xl font-semibold">We could not find that page</h1>
      <p className="mx-auto mt-2 max-w-md text-navy/65">The link may be old or mistyped. Try one of these instead.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link to="/" className="btn-primary">Back to home</Link>
        <Link to="/courses" className="btn-outline">Browse courses</Link>
        <Link to="/enquire" className="btn-outline">Contact the academy</Link>
      </div>
    </div>
  );
}
