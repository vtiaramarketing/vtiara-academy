# VTIARA Training Academy

A responsive training academy web app for VTIARA Hair & Skin Clinic, Bangalore: public course catalogue, learner dashboard, lesson player, academy batch booking, timed MCQ assessments, practical assessment with trainer approval, QR certificates with public verification, and an admin portal.

**Stack:** React 18, TypeScript, Tailwind, Vite, Supabase (Auth, Postgres, Storage, RLS, Edge Functions).

## 1. Quick start (demo mode, no backend)

Demo mode is **opt-in**: set `VITE_DEMO_MODE=true` in `.env.local` and run `npm run dev`. Without it, the app needs Supabase; a production build with no Supabase variables shows an "unavailable" screen (no demo accounts, no persona switcher, no reset button), and the demo code is not in the production bundle.

```bash
npm install
npm run dev
```

With `VITE_DEMO_MODE=true`, the app runs in **demo mode**: all data lives in your browser (localStorage) and follows the same rules as the database. A bar at the top lets you switch between demo personas. Use **Reset demo** to start over.

## 2. Connect your Supabase project

1. Copy `.env.example` to `.env.local` and set:

   | Variable | Where | Purpose |
   |---|---|---|
   | `VITE_SUPABASE_URL` | browser | Project URL |
   | `VITE_SUPABASE_ANON_KEY` | browser | Public anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | scripts only | Used by `npm run seed:users`. Never expose it in the browser or commit it. |

2. In the Supabase SQL editor (or `supabase db push`), run in this order:
   1. `supabase/migrations/0001_schema.sql`
   2. `supabase/migrations/0002_functions.sql`
   3. `supabase/migrations/0003_rls.sql`
   4. `supabase/migrations/0004_storage.sql`
   5. `supabase/migrations/0005_enrolment_access_and_lessons.sql` (enrolment requests, status history, lesson types and publishing; safe to re-run)
   6. `supabase/seed.sql` (branches, 8 courses, lessons, MCQs, checklists, batches)
3. Create the demo accounts and roles:
   ```bash
   SUPABASE_URL=https://YOUR-PROJECT.supabase.co SUPABASE_SERVICE_ROLE_KEY=... npm run seed:users
   ```
4. Deploy the user-management function (needed for Admin → Users → Add user / reset / disable):
   ```bash
   supabase functions deploy manage-user
   ```
5. Auth settings: enable Email. For mobile OTP enable the **Phone** provider and connect an SMS provider (Twilio, MessageBird, Vonage). Add your site URL and `/reset-password` redirect under Authentication → URL configuration.

## 2a. Environment variables

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Your Supabase project (anon key only; never a service-role key) |
| `VITE_DEMO_MODE` | `true` enables browser-only demo mode. Leave unset in production |
| `VITE_SITE_URL` | Public URL, no trailing slash. Used for canonical and Open Graph URLs and to generate `public/sitemap.xml` and the `Sitemap:` line in `robots.txt` on `npm run build` |

Copy `.env.example` to `.env.local`.

## 2b. Migrations

Run in order in the Supabase SQL editor (or `supabase db push`): `0001` to `0006`, then **`0007_production_content.sql`**. 0007 is idempotent and adds: `academy_settings`, `trainer_profiles`, `enquiries` (+ `submit_enquiry` RPC), `testimonials`, course fees / validity policy / prerequisite, server-side Common Core enforcement in `enrol_in_course`, lesson review metadata and `content_status`, assessment approval metadata, certificate expiry reminders, and the `trainer-photos` bucket. It also replaces the placeholder branch names with the clinic's published locations.

Optional: schedule expiry reminders daily with pg_cron, e.g. `select cron.schedule('cert-expiry-reminders', '0 4 * * *', $$select public.send_certificate_expiry_reminders()$$);` Admins can also press **Send expiry reminders** on the admin dashboard.

## 2c. New workflows

- **Academy settings** (Admin, Academy settings): academy vs clinic contact details, socials, branches, trainer/medical-advisor profiles (photo upload or published photo link), success stories. Fields flagged "Needs VTIARA confirmation" were not published by the clinic for the academy; edit them and untick the flag. Academy values override clinic values on the public site.
- **Enquiries**: public form at `/enquire` and on the home page, plus WhatsApp and "Book a counselling call" buttons. Staff manage status and notes at Admin, Enquiries. Inserts only go through `submit_enquiry` (validated, consent required, rate-limited per phone).
- **Courses**: fee, inclusions, payment state ("Contact us to enrol" or "Online payment coming soon"; no payment integration exists), validity policy, reminder window, prerequisite, thumbnail upload. Lessons carry version, reviewer, review dates and a status (draft, published, review required; review-required stays visible to enrolled learners but is flagged to admins).
- **Assessments**: the list flags question-bank vs target-count mismatches, warns before publishing an incomplete assessment, and records approved by / approval date / last reviewed. Answer keys remain staff-only.
- **Testimonials** only appear publicly when published and consent is confirmed. None are pre-filled.

## 3. Demo logins (demo mode only)

Password for all: `Demo@1234`. Mobile OTP in demo mode: `123456`.

| Role | Email |
|---|---|
| Super Admin | superadmin@vtiara.demo |
| Academy Admin | admin@vtiara.demo |
| Trainer | trainer@vtiara.demo |
| Assessor | assessor@vtiara.demo |
| Learner | learner@vtiara.demo |
| Learner (already certified) | learner2@vtiara.demo |

Change or delete these accounts before going live.

## 3a. Enrolment, access and lessons

- Learners **request** enrolment. Nothing opens until an admin approves and activates it (Admin → Enrolments). Statuses: `pending → approved → active → completed`, or `cancelled`. Deactivate = active → approved (access paused). Every change is stored in `enrolment_status_history` with who and when, and in the audit log.
- Lessons, batch booking and assessments all require an `active` (or `completed`) enrolment, enforced in the database (RLS and RPC checks), not only in the UI.
- Lesson types: video (secure https URL or private storage), reading text, PDF/document link, external link. Videos are never stored in the database. Admins can reorder and publish/unpublish modules and lessons; learners see published items only.
- Roles: Super Admin, Academy Admin, Trainer, Assessor, Learner (learner = student). Only an admin can grant a non-learner role; signup always creates a learner.
- Certificate validity has no default. Set it per course once the academy confirms the policy.

## 4. Demo flow

Register (or use `learner@`) → request enrolment in Common Core → admin approves and activates → complete lessons → book an academy batch → trainer marks attendance → take the MCQ (80% to pass) → trainer records the practical and approves it → certificate is issued → verify it at `/verify/<certificate number>`.

In demo mode, use the demo bar to switch to the trainer. After a failed MCQ the 3-day retake wait applies; the demo bar's **+4 days** button skips it.

## 5. How the rules are enforced

- All learning-state changes go through `SECURITY DEFINER` functions (`complete_lesson`, `book_batch`, `start_attempt`, `submit_attempt`, `approve_practical` ...). Clients cannot write progress, scores or certificates directly.
- `recompute_enrolment` issues a certificate **only** when lessons, attendance, passed MCQ, passed practicals and trainer approval are all complete. Nothing is issued automatically for courses that need practical, attendance or approval.
- The MCQ answer key is never sent to the learner before submission (learners read `v_assessment_questions` and `v_assessment_options`).
- Nursing Council number and document are visible only to the learner, admins and trainers.
- Public verification (`verify_certificate`) returns only name, course, dates and status.
- Row Level Security is enabled on every table. Only `course-thumbnails` is a public bucket.

`node scripts/test-sql.mjs` runs the migrations in an in-memory Postgres and checks the journey and the security rules.

## 6. Content you still need to supply

- **Placeholders:** branch names and addresses, trainer names, languages per course, and lesson videos (upload to `course-videos`, then reference on the lesson).
- **Question banks:** Common Core has 20 sample MCQs. Other courses have 4 sample questions each. Replace them with approved questions in Admin → Assessments.
- **Legal pages:** Privacy, Terms and Certificate terms are drafts for legal review.
- **Certificate validity** is not set by default; add a period per course when the academy confirms the policy.
- **Common Core as a prerequisite** is not enforced. Add a check in `enrol_in_course` if you want it.
- **Fees** are not shown anywhere.

## 7. Scope of practice

Training completion does not authorise anyone to practise outside their licence, qualification or clinic protocol. Clinical procedures remain subject to applicable law and clinic protocols. This notice appears on course pages, results and certificates.

## 8. Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Type-check and production build to `dist/` |
| `npm run lint` | ESLint |
| `npm run check` | Lint, type-check and build |
| `npm run seed:users` | Create demo auth users in Supabase |
| `node scripts/generate-seed.mjs` | Regenerate `supabase/seed.sql` from `src/data/content.json` |
| `node scripts/test-sql.mjs` | Migration, RLS and journey test |
| `node scripts/test-demo.mjs` | Runs the demo-mode journey end to end |
