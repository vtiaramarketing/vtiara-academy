-- 0008 · Course content rebuilt from the VTIARA Academy programme documents (Common Core, Staff Nurse, Skin Therapist,
-- Housekeeping, Telecaller). Replaces modules and lessons for those five courses and updates their descriptive fields.
-- Lesson progress for the replaced lessons is removed (cascade). Run once; re-running rebuilds the same content.

-- Common Core Training
update public.courses set duration_hours=16, duration_label='16 hours (2.5 days)', certificate_validity_months=12,
  certificate_title='Common Core Certified', short_description='The mandatory 16-hour foundation for every VTIARA role: values, patient communication, hygiene, consent, privacy and emergencies.', overview='Every new hire completes the Common Core first, over 2.5 days (6 + 5.5 + 4.5 hours), before any role training. It gives everyone the same safe, patient-first foundation through classroom sessions, demonstrations, role-play and a short quiz. Its 16 hours are counted inside each role''s total hours.', audience='All new hires: therapists, nurses, dermatologists, housekeeping, telecallers, front desk and managers.',
  eligibility=array['No prior clinical qualification required','Basic reading comprehension','Attend the academy practical session']::text[], learning_outcomes=array['Greet and treat patients with the VTIARA standard of courtesy and privacy','Explain, in simple words, what skin and hair are and why hygiene matters','Clean hands correctly at the right moments and use gloves and masks properly','Separate waste into the right colour bin','Handle consent, photos and patient information without breaking privacy','Act correctly in a fainting, allergic reaction or fire emergency']::text[], requirements_text=array['100% attendance','80% or higher on the 20-question knowledge test (16 of 20)','Hand hygiene practical passed']::text[],
  pass_rules='{"attendance_pct": 100, "knowledge_pct": 80, "practical": "Hand hygiene practical passed"}'::jsonb where slug='common-core';
delete from public.course_modules where course_id = (select id from public.courses where slug='common-core');
insert into public.course_modules (id, course_id, title, position) select '5e36cd84-19d4-4405-ab84-73a95f54e3aa', id, 'C1 Welcome, VTIARA values, grooming and behaviour', 1 from public.courses where slug='common-core';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '623afaf1-8163-4943-ad32-3e219ea1ae5e', '5e36cd84-19d4-4405-ab84-73a95f54e3aa', id, 'The VTIARA story and our values', 'Each person can state the VTIARA values and shows correct grooming and conduct.', 60, 'Key points:
- VTIARA story, branch map, who does what in a branch
- Values: safety first, honesty, respect, same standard in every branch', 1 from public.courses where slug='common-core';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '39bdf38c-ecfb-4b1e-a581-c6957d80f50a', '5e36cd84-19d4-4405-ab84-73a95f54e3aa', id, 'Grooming, attendance and conduct', null, 60, 'Key points:
- Dress code, ID badge, nails, hair, light perfume; punctuality, attendance and leave rules
- Phone use on the floor; no gossip about patients; no photos without consent', 2 from public.courses where slug='common-core';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '8ee4971d-df51-4e2d-aa7b-5aae991064a1', '5e36cd84-19d4-4405-ab84-73a95f54e3aa', id, 'Anti-harassment (POSH) and good service', null, 60, 'Key points:
- Anti-harassment policy (POSH) and whom to approach
- Practice: discuss good and bad service scenes and write 3 rules each', 3 from public.courses where slug='common-core';
insert into public.course_modules (id, course_id, title, position) select 'ca414e25-8f85-4ba0-ad70-b6a5e193691c', id, 'C2 Patient communication and courtesy', 2 from public.courses where slug='common-core';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '6ecc9d8d-fe8f-47e4-ae05-47954d3821e5', 'ca414e25-8f85-4ba0-ad70-b6a5e193691c', id, 'Greeting and listening', 'Each person greets, listens and responds to a patient in simple, respectful words.', 60, 'Key points:
- Greeting standard: smile, name, offer help within 10 seconds
- Active listening; plain words instead of medical jargon; never promise results', 1 from public.courses where slug='common-core';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '984ed515-0fe2-4969-ac5a-d32d2c459418', 'ca414e25-8f85-4ba0-ad70-b6a5e193691c', id, 'Upset patients, phone and WhatsApp', null, 60, 'Key points:
- Upset patients: Listen, Apologise, Solve, Thank; when to call the nurse, doctor or manager
- Tone on phone and WhatsApp
- Practice: pair role-play of 4 scenarios (long wait, price complaint, anxious patient, wrong appointment)', 2 from public.courses where slug='common-core';
insert into public.course_modules (id, course_id, title, position) select 'f1d910b8-5cd5-4807-a725-77724b17b305', id, 'C3 Skin and hair basics in plain language', 3 from public.courses where slug='common-core';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '89024a62-12fe-4880-a5fd-46e407bad077', 'f1d910b8-5cd5-4807-a725-77724b17b305', id, 'Skin basics', 'Each person can explain skin and hair basics and knows when to call the doctor.', 50, 'Key points:
- Skin layers (epidermis, dermis, hypodermis), skin functions
- Skin types: oily, dry, combination, sensitive; why sun protection matters', 1 from public.courses where slug='common-core';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '4b5c7a59-8a21-4625-a81e-46a0277ab615', 'f1d910b8-5cd5-4807-a725-77724b17b305', id, 'Hair basics', null, 50, 'Key points:
- Hair structure; growth cycle (growing, transition, resting phases)
- Losing about 50-100 hairs a day is normal', 2 from public.courses where slug='common-core';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '1290bd39-1785-4e6d-a7ed-0577bd165711', 'f1d910b8-5cd5-4807-a725-77724b17b305', id, 'Common problems and our limits', null, 50, 'Key points:
- Names and meaning of common problems: acne, pigmentation, dandruff, hair fall
- Staff never diagnose; they say ''the doctor will examine you''
- Practice: label skin and hair diagrams; myth-or-fact quiz', 3 from public.courses where slug='common-core';
insert into public.course_modules (id, course_id, title, position) select 'af41e1ab-0be4-43f8-afee-1b20af3ad799', id, 'C4 Hygiene, infection control and waste', 4 from public.courses where slug='common-core';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '3169cb4d-d571-40d0-a255-8ca1308faeff', 'af41e1ab-0be4-43f8-afee-1b20af3ad799', id, 'How infection spreads and standard precautions', 'Each person cleans hands correctly, uses PPE, handles sharps safely and sorts waste.', 60, 'Key points:
- How infection spreads; standard precautions for every patient', 1 from public.courses where slug='common-core';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '242617f3-2f34-4ad6-af18-8726578c3f04', 'af41e1ab-0be4-43f8-afee-1b20af3ad799', id, 'Hand hygiene: the 5 moments', null, 60, 'Key points:
- Before touching a patient; before a clean or aseptic task; after body-fluid exposure risk; after touching a patient; after touching patient surroundings
- Hand rub 20-30 seconds until dry; wash with soap and water 40-60 seconds when hands are visibly dirty', 2 from public.courses where slug='common-core';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '21541073-3c55-497b-a634-fd3c3b52445a', 'af41e1ab-0be4-43f8-afee-1b20af3ad799', id, 'PPE and cleaning levels', null, 60, 'Key points:
- Gloves, masks, aprons, eye protection: when and how to put on and remove; gloves come off first
- Clean, disinfect, sterilise: what each means', 3 from public.courses where slug='common-core';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '80c4fd01-8a4a-478e-a8a3-b35c8cc77a22', 'af41e1ab-0be4-43f8-afee-1b20af3ad799', id, 'Sharps, needle-stick and waste colour bins', null, 60, 'Key points:
- Never recap or bend needles; use the sharps container; needle-stick response
- Biomedical waste colour bins and spill basics
- Practice: hand hygiene practical, PPE sequence, waste-sorting game', 4 from public.courses where slug='common-core';
insert into public.course_modules (id, course_id, title, position) select '31706d4c-ee5a-4651-ab93-ade2f7aac0f8', id, 'C5 Consent, privacy and confidentiality', 5 from public.courses where slug='common-core';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '76ceb522-29fc-4640-ade9-5a9f636431e6', '31706d4c-ee5a-4651-ab93-ade2f7aac0f8', id, 'Consent', 'Each person knows what consent is, handles photos and records correctly and keeps patient information private.', 60, 'Key points:
- Consent must be informed, written for procedures, and can be withdrawn
- Photos need separate consent; minors need a guardian', 1 from public.courses where slug='common-core';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '024b68fe-3540-4983-a6c4-252eb3c70997', '31706d4c-ee5a-4651-ab93-ade2f7aac0f8', id, 'Privacy and patient data', null, 60, 'Key points:
- Share patient information only with the treating team; never on personal phones or WhatsApp groups
- Collect only needed data and keep it safe under the Digital Personal Data Protection Act, 2023
- Practice: 3 case studies (relative asks for a report, photo for social media, lost file)', 2 from public.courses where slug='common-core';
insert into public.course_modules (id, course_id, title, position) select 'd8a25f26-c793-4634-a444-794dff5e2b40', id, 'C6 Safety, fire and emergency awareness', 6 from public.courses where slug='common-core';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '17d9b6a1-e0b5-4602-a68b-634e3f1973b1', 'd8a25f26-c793-4634-a444-794dff5e2b40', id, 'Exits, alarms and first actions', 'Each person knows exits, alarms, extinguishers and the first actions in a fainting, allergic reaction or fire.', 90, 'Key points:
- Exits, assembly point, alarm, extinguisher locations
- Rule for any emergency: call for help first, then act within your training
- Fainting, allergic reaction signs, and fire (RACE: Rescue, Alarm, Contain, Evacuate or Extinguish)
- Practice: branch walk-through; mock fainting drill', 1 from public.courses where slug='common-core';
insert into public.course_modules (id, course_id, title, position) select '27d8b0e0-ffb9-4eec-a7da-ad5bf190ba2b', id, 'Knowledge test and practical sign-off', 7 from public.courses where slug='common-core';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '74275bbe-43a9-4501-a10f-b9bd52c12611', '27d8b0e0-ffb9-4eec-a7da-ad5bf190ba2b', id, 'Knowledge test and practical sign-off', '20-question knowledge test (30 minutes, pass mark 80%) and trainer-observed hand hygiene practical.', 60, 'Knowledge test: 20 questions, 30 minutes, 16 of 20 correct to pass. Below 80%: revise with the trainer and retake after 3 days.
Hand hygiene practical: trainer checklist.
Records: attendance sheet, test score, handout acknowledgement, signed code of conduct.', 1 from public.courses where slug='common-core';

-- Staff Nurse Training
update public.courses set duration_hours=94, duration_label='94 hours (about 2.5 weeks)', certificate_validity_months=12,
  certificate_title='Nursing Level 1 Certified', short_description='A 94-hour programme that makes a registered nurse safe and consistent in a VTIARA dermatology and hair clinic: sterility, medicines, emergencies and documentation.', overview='Nurses are the clinic''s safety backbone. Over about 2.5 weeks (16 hours of Common Core plus 78 nursing hours) you learn sterilisation and instrument processing, documentation and consent, medication handling, assisting clinic procedures, emergencies including BLS, and patient counselling. You never diagnose, prescribe, or perform a procedure that has not been ordered by the dermatologist.', audience='Newly hired staff nurses, and existing nurses for refresher.',
  eligibility=array['GNM or B.Sc Nursing','Valid State Nursing Council registration (verified and copied to file)','Hepatitis B vaccination status recorded']::text[], learning_outcomes=array['Process instruments so every item used on a patient is clean and sterile','Prepare patients and rooms, check consent and contraindication forms, and document correctly','Store, check and handle medicines safely, including the emergency tray','Prepare for and assist dermatologist-ordered procedures','Recognise and manage reactions and emergencies until the doctor arrives','Give aftercare instructions from approved sheets and confirm understanding']::text[], requirements_text=array['100% attendance','80% or higher on the knowledge test','Both practical exams passed with all critical items','Emergency drill passed (100% of critical steps)','Logbook minimums completed','Yearly BLS renewal and re-certification']::text[],
  pass_rules='{"attendance_pct": 100, "knowledge_pct": 80, "practical": "All practical stations passed", "emergency_drill": true, "logbook": true}'::jsonb where slug='staff-nurse';
delete from public.course_modules where course_id = (select id from public.courses where slug='staff-nurse');
insert into public.course_modules (id, course_id, title, position) select '1a403c44-c9bf-4ed0-aa06-b477ff40b416', id, 'N1 Sterilisation and instrument processing', 1 from public.courses where slug='staff-nurse';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select 'f47135fd-d0ac-452a-a34e-6cfed14e6348', '1a403c44-c9bf-4ed0-aa06-b477ff40b416', id, 'Item risk levels', 'The nurse processes instruments so that every item used on a patient is clean and sterile.', 240, 'Key points:
- Critical (enter skin or blood), semi-critical, non-critical; what each needs', 1 from public.courses where slug='staff-nurse';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select 'bbdf6f09-901b-46d4-a3a7-0eaac9f505d2', '1a403c44-c9bf-4ed0-aa06-b477ff40b416', id, 'From dirty to sterile', null, 240, 'Key points:
- Point-of-use wipe, soak, manual or ultrasonic cleaning, rinse, dry, inspect, pack with indicator, sterilise, store', 2 from public.courses where slug='staff-nurse';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '3d971e03-165f-47b5-a592-5ec8e50ef39a', '1a403c44-c9bf-4ed0-aa06-b477ff40b416', id, 'Steam sterilisation and load logs', null, 240, 'Key points:
- Cycle settings come from the autoclave and instrument manufacturers; chemical indicators in every pack; biological indicator tests as per policy
- Load logs, pack dates, shelf life, storage, recall of failed loads; single-use items are never reprocessed
- Practice: process a tray from dirty to sterile; read and sign a load log', 3 from public.courses where slug='staff-nurse';
insert into public.course_modules (id, course_id, title, position) select 'b29ab4fa-554f-48ae-a943-675e0333a24e', id, 'N2 Documentation, consent and photos', 2 from public.courses where slug='staff-nurse';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '506ca114-8a51-4453-a867-586e05061c84', 'b29ab4fa-554f-48ae-a943-675e0333a24e', id, 'The patient chart', 'The nurse keeps complete, accurate and private clinical records.', 180, 'Key points:
- Patient chart, vitals, history, allergies, medication orders, procedure notes, aftercare given', 1 from public.courses where slug='staff-nurse';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '47e250f1-334f-406b-a208-a003a2980f02', 'b29ab4fa-554f-48ae-a943-675e0333a24e', id, 'Consent, photos and incident forms', null, 180, 'Key points:
- Written consent for procedures; separate photo consent; minors and guardians
- Incident and near-miss forms; privacy of records and the Digital Personal Data Protection Act, 2023
- Practice: complete 5 mock charts; spot errors in 3 sample forms', 2 from public.courses where slug='staff-nurse';
insert into public.course_modules (id, course_id, title, position) select '99e9a8fe-7987-4116-a718-323b7f351bbb', id, 'N3 Medication handling', 3 from public.courses where slug='staff-nurse';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '286b5971-c263-497f-a44d-27633420383d', '99e9a8fe-7987-4116-a718-323b7f351bbb', id, 'Medication safety', 'The nurse stores, checks and gives medicines safely and records every step.', 160, 'Key points:
- Right patient, right drug, right dose, right route, right time, right documentation; check expiry and look-alike names', 1 from public.courses where slug='staff-nurse';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '1a997b82-7f35-4f66-a663-0eb7b2ce63ef', '99e9a8fe-7987-4116-a718-323b7f351bbb', id, 'Storage and cold chain', null, 160, 'Key points:
- Room temperature items; refrigerator items at 2-8 degrees C with a twice-daily temperature log; report cold chain breaks', 2 from public.courses where slug='staff-nurse';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '53f1264d-6caa-4e58-a721-75075cd45a84', '99e9a8fe-7987-4116-a718-323b7f351bbb', id, 'Topical anaesthetics and the emergency tray', null, 160, 'Key points:
- Topical anaesthetic creams only as ordered, on the specified area, for the time on the product label, then remove
- Emergency tray contents set by the Medical Advisor; weekly check with signed list
- Practice: read 10 orders and catch the errors; tray check', 3 from public.courses where slug='staff-nurse';
insert into public.course_modules (id, course_id, title, position) select 'd9aa0e72-94d9-446f-aa76-cb2b6bcd102d', id, 'N4 Clinic procedures and assisting', 4 from public.courses where slug='staff-nurse';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '7b272f0b-6af7-47f6-a862-862285ae9752', 'd9aa0e72-94d9-446f-aa76-cb2b6bcd102d', id, 'Room set-up and patient preparation', 'The nurse prepares patients and rooms and assists dermatologist-ordered procedures safely.', 400, 'Key points:
- Room and tray set-up, patient identification, positioning and skin preparation', 1 from public.courses where slug='staff-nurse';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '5473c2d9-4ae8-4f7b-a1cc-a9fa3c05cb00', 'd9aa0e72-94d9-446f-aa76-cb2b6bcd102d', id, 'Assisting procedures', null, 400, 'Key points:
- Assisting peels, microneedling, PRP, mesotherapy and injectables as ordered by the dermatologist
- PRP blood draw and preparation per the device protocol; labelling of tubes', 2 from public.courses where slug='staff-nurse';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '22469522-1245-4e4e-a499-fbd6ddae31d4', 'd9aa0e72-94d9-446f-aa76-cb2b6bcd102d', id, 'Dressings, monitoring and sharps', null, 400, 'Key points:
- Dressings and wound care; post-procedure monitoring; sharps handling
- Practice: set up and assist 10 mock procedures on models; observe 10 real procedures', 3 from public.courses where slug='staff-nurse';
insert into public.course_modules (id, course_id, title, position) select 'a1aac534-9272-4684-a4ed-1f732d51e0ba', id, 'N5 Emergencies and reactions', 5 from public.courses where slug='staff-nurse';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '361245d8-fbbb-4ea2-a604-a0530db21ff1', 'a1aac534-9272-4684-a4ed-1f732d51e0ba', id, 'Vital signs and when to call the doctor', 'The nurse recognises and manages reactions and emergencies until the doctor arrives.', 320, 'Key points:
- Vital signs and when to call the doctor', 1 from public.courses where slug='staff-nurse';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select 'da1df43f-b5fc-41f2-a754-e1906dd55730', 'a1aac534-9272-4684-a4ed-1f732d51e0ba', id, 'Basic life support', null, 320, 'Key points:
- Adults: call for help, compressions at 100-120 a minute, depth 5-6 cm, 30 compressions to 2 breaths, AED as soon as available', 2 from public.courses where slug='staff-nurse';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '84275256-46c6-4a9f-a3fc-9596e473677f', 'a1aac534-9272-4684-a4ed-1f732d51e0ba', id, 'Anaphylaxis and other emergencies', null, 320, 'Key points:
- Anaphylaxis, fainting, low blood sugar, seizure, burns (cool under running water for 20 minutes), signs of local anaesthetic toxicity
- Medicines in an emergency only as per the clinic''s standing protocol or a doctor''s order
- Practice: BLS on a manikin with a certified instructor; two timed mock emergencies', 3 from public.courses where slug='staff-nurse';
insert into public.course_modules (id, course_id, title, position) select '783550dd-6361-4eef-a42d-f7ef57dcf1b3', id, 'N6 Patient counselling and aftercare', 6 from public.courses where slug='staff-nurse';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '5114c251-936e-4fa5-aefe-3dc414a0f182', '783550dd-6361-4eef-a42d-f7ef57dcf1b3', id, 'Counselling and teach-back', 'The nurse explains procedures and aftercare clearly and confirms understanding.', 240, 'Key points:
- Explaining the procedure, what to expect, warning signs, aftercare, follow-up
- Teach-back to confirm understanding
- Practice: counsel 5 mock patients', 1 from public.courses where slug='staff-nurse';
insert into public.course_modules (id, course_id, title, position) select '0ec5a007-9c7b-4363-ab13-37bdfe0d4772', id, 'Supervised practice, logbook and exams', 7 from public.courses where slug='staff-nurse';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select 'dc0cc7d3-e5bc-4770-a8df-155013f3ce8e', '0ec5a007-9c7b-4363-ab13-37bdfe0d4772', id, 'Supervised practice, logbook and exams', '8 hours supervised practice, then the knowledge test, two practical exams and the emergency drill.', 480, 'Assessment: knowledge test 50 MCQ in 75 minutes (pass 80%); practical exam 1 (instrument reprocessing and tray set-up); practical exam 2 (pre-procedure checklist, assisting a mock procedure, counselling); emergency drill (BLS on manikin and mock anaphylaxis, 100% of critical steps).
Logbook minimums before Level 1: instrument reprocessing cycles 20; procedures assisted 30; charts completed and checked 40; medication checks with a senior nurse 30; emergency drills 2.', 1 from public.courses where slug='staff-nurse';

-- Skin Therapist Training
update public.courses set duration_hours=280, duration_label='280 hours (8 weeks)', certificate_validity_months=12,
  certificate_title='Level 1 Certified Therapist', short_description='An 8-week, 280-hour programme that turns a trainee into a safe, consistent skin and hair therapist. Nobody works on a patient until the Level 1 exams are passed.', overview='Over 8 weeks (16 hours of Common Core plus 264 therapist hours: about 100 classroom and online, 90 hands-on lab and 90 supervised floor work) you learn skin and hair science, consultation support, facials and skin treatments, hair and scalp treatments, device and laser safety, and products and aftercare. Advanced devices need Level 2, and therapists never diagnose, prescribe or change the doctor''s settings.', audience='New therapists (skin, hair, facial), and existing therapists for upskilling.',
  eligibility=array['12th pass plus beauty or skin diploma, or a fresher passing the aptitude test','Good communication skills','No active skin infection']::text[], learning_outcomes=array['Analyse skin and scalp, name common conditions and know exactly when to call the doctor','Complete an intake, find contraindications, set honest expectations and document correctly','Perform approved facial and skin treatments safely and consistently','Perform scalp analysis and approved scalp treatments and assist doctor-led hair procedures','Understand device and laser safety and prepare and assist (independent operation needs Level 2)','Give honest product advice and the right aftercare']::text[], requirements_text=array['100% attendance (missed days made up)','80% or higher on both knowledge tests','All practical stations passed with every critical item','Patient-safety check passed (100%)','Logbook minimums completed','Yearly practical and test; case review every quarter']::text[],
  pass_rules='{"attendance_pct": 100, "knowledge_pct": 80, "practical": "All practical stations passed", "logbook": true}'::jsonb where slug='skin-therapist';
delete from public.course_modules where course_id = (select id from public.courses where slug='skin-therapist');
insert into public.course_modules (id, course_id, title, position) select 'ab6b93a8-bb4f-4bc6-af10-da19514e4596', id, 'S1 Skin and hair science', 1 from public.courses where slug='skin-therapist';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '6a31eda3-30c2-483b-a2a9-565569fe253c', 'ab6b93a8-bb4f-4bc6-af10-da19514e4596', id, 'Skin structure, types and the Fitzpatrick scale', 'The therapist can analyse skin and scalp, name common conditions and knows exactly when to call the doctor.', 540, 'Key points:
- Skin layers and functions, the skin barrier, skin types
- Fitzpatrick scale (types I-VI) and how each type reacts to sun and procedures', 1 from public.courses where slug='skin-therapist';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '48885181-f252-432c-a8a1-0ca4fec490ea', 'ab6b93a8-bb4f-4bc6-af10-da19514e4596', id, 'Common skin conditions', null, 540, 'Key points:
- Acne and its grades, pigmentation (melasma, post-inflammatory), rosacea, eczema and dermatitis, ageing
- Recognise infections (fungal, bacterial, viral) and refer them
- Moles and spots that change (asymmetry, border, colour, diameter, evolving): always refer', 2 from public.courses where slug='skin-therapist';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '2e17bf8c-053e-4520-a67d-00c4bade6bbd', 'ab6b93a8-bb4f-4bc6-af10-da19514e4596', id, 'Hair and scalp science', null, 540, 'Key points:
- Hair cycle (anagen, catagen, telogen); patterns of hair loss (androgenetic, stress-related shedding, patchy loss, traction)
- Scalp conditions such as dandruff and seborrhoeic dermatitis', 3 from public.courses where slug='skin-therapist';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '0f6938b2-49fe-4488-a473-b876f73341a2', 'ab6b93a8-bb4f-4bc6-af10-da19514e4596', id, 'Lifestyle, and why diagnosis is the doctor''s job', null, 540, 'Key points:
- Nutrition, sleep, stress and hair; why diagnosis is the doctor''s job
- Practice: skin type and Fitzpatrick identification on models; slide quiz; scalp photos', 4 from public.courses where slug='skin-therapist';
insert into public.course_modules (id, course_id, title, position) select '598e838e-0e96-468e-add1-071a26ac8636', id, 'S2 Consultation support and documentation', 2 from public.courses where slug='skin-therapist';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '31cc46e1-03e7-452f-a968-02ea5e4760ee', '598e838e-0e96-468e-add1-071a26ac8636', id, 'Intake and contraindication checks', 'The therapist completes an intake, finds contraindications, sets honest expectations and documents correctly.', 400, 'Key points:
- Greeting, privacy, intake questions, medicines and allergies, pregnancy, skin and hair history
- Contraindication check; stop and call the doctor if in doubt', 1 from public.courses where slug='skin-therapist';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '09a1aa42-8921-42b8-a29f-8eff17b09fa8', '598e838e-0e96-468e-add1-071a26ac8636', id, 'Expectations, consent and photos', null, 400, 'Key points:
- Results take weeks to months; never guarantee
- Consent forms; standard photo method (same light, angle, distance; no filters)', 2 from public.courses where slug='skin-therapist';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select 'e6cfc461-be25-4069-a928-68bf7c300460', '598e838e-0e96-468e-add1-071a26ac8636', id, 'Handing the case to the doctor', null, 400, 'Key points:
- Handing the case to the doctor with a clear written note
- Practice: 6 mock consultations scored by the trainer', 3 from public.courses where slug='skin-therapist';
insert into public.course_modules (id, course_id, title, position) select 'efbef632-a42c-466c-aa03-ea9bc6428539', id, 'S3 Facials and skin treatments', 3 from public.courses where slug='skin-therapist';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select 'a63d4bd5-d29a-4871-ad5a-e528c6aa3156', 'efbef632-a42c-466c-aa03-ea9bc6428539', id, 'Set-up and hygiene', 'The therapist performs approved facial and skin treatments safely and consistently.', 900, 'Key points:
- Room set-up, tool hygiene, patient positioning, hand hygiene
- Patch tests; product handling and shelf life', 1 from public.courses where slug='skin-therapist';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select 'f096ca7e-a9ae-4205-ac36-09bf25bc95d8', 'efbef632-a42c-466c-aa03-ea9bc6428539', id, 'Facial steps', null, 900, 'Key points:
- Cleansing, gentle exfoliation, steam and its cautions, masks, LED light, hydration and hydrafacial-type treatments
- Extractions only of non-inflamed blackheads and whiteheads', 2 from public.courses where slug='skin-therapist';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '882409b4-aa53-48f7-aa1b-b44022b4d4ee', 'efbef632-a42c-466c-aa03-ea9bc6428539', id, 'Assisting peels and microneedling', null, 900, 'Key points:
- Assist superficial peels and microneedling when ordered by the doctor: preparing the skin, single-use sterile cartridges, timing, neutralising and soothing per the product protocol, immediate after-care', 3 from public.courses where slug='skin-therapist';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '8bda2234-671e-4100-a7e6-8c92cf1953cd', 'efbef632-a42c-466c-aa03-ea9bc6428539', id, 'Standard facial and practice', null, 900, 'Key points:
- Standard facial time plan: 60 minutes
- Practice: 40 supervised facials in lab and floor', 4 from public.courses where slug='skin-therapist';
insert into public.course_modules (id, course_id, title, position) select '05b6ebe9-0267-477c-afcb-360557b4b380', id, 'S4 Hair and scalp treatments', 4 from public.courses where slug='skin-therapist';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '387e6038-5b90-49d7-a1e1-b98612b0a4ad', '05b6ebe9-0267-477c-afcb-360557b4b380', id, 'Scalp analysis', 'The therapist performs scalp analysis and approved scalp treatments and assists doctor-led hair procedures.', 800, 'Key points:
- Scalp analysis with a trichoscope: capture and record, never diagnose', 1 from public.courses where slug='skin-therapist';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select 'f4359e45-f26b-4da3-a666-29e098678f0b', '05b6ebe9-0267-477c-afcb-360557b4b380', id, 'Scalp treatments', null, 800, 'Key points:
- Scalp cleansing and exfoliation, scalp massage, low-level light therapy', 2 from public.courses where slug='skin-therapist';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '0456b299-e599-40c4-ae3f-b23b0901ebbf', '05b6ebe9-0267-477c-afcb-360557b4b380', id, 'Assisting mesotherapy and PRP', null, 800, 'Key points:
- Assist mesotherapy and PRP when ordered: room and tray set-up, patient comfort, labelling; blood draw and preparation by the nurse or doctor
- Realistic timelines for hair regrowth; home-care routines
- Practice: 20 scalp analyses, 15 hair treatments with logbook entries', 3 from public.courses where slug='skin-therapist';
insert into public.course_modules (id, course_id, title, position) select '2b5765fa-5e76-4380-aed5-526ee8103480', id, 'S5 Devices and laser safety', 5 from public.courses where slug='skin-therapist';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '5fd94957-38cd-495c-abb0-9f07aeba9460', '2b5765fa-5e76-4380-aed5-526ee8103480', id, 'Light and skin', 'The therapist understands device safety and can prepare and assist; independent operation needs Level 2.', 800, 'Key points:
- Simple light physics: wavelength, targets in skin, why skin type matters', 1 from public.courses where slug='skin-therapist';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '7a763bf2-a278-4145-ab0a-2fde1aca42ba', '2b5765fa-5e76-4380-aed5-526ee8103480', id, 'Laser safety', null, 800, 'Key points:
- Laser safety officer role, door signs, correct protective eyewear for the device''s wavelength for everyone in the room, cooling, emergency stop
- Settings are chosen by the doctor for each patient; therapists never change them', 2 from public.courses where slug='skin-therapist';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select 'dd3c1419-da83-43e6-a433-f92863b8bf34', '2b5765fa-5e76-4380-aed5-526ee8103480', id, 'Daily checks and reactions', null, 800, 'Key points:
- Daily checks, consumables, cleaning, logs; test patch routine
- Burn and reaction first aid, then call the doctor
- Practice: device handling on practice models and approved training tools only; no patient use until Level 2', 3 from public.courses where slug='skin-therapist';
insert into public.course_modules (id, course_id, title, position) select 'd6903cd9-4cd1-4fab-ac1a-ccb21b0f10f8', id, 'S6 Products and aftercare', 6 from public.courses where slug='skin-therapist';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '8839e710-ee66-4a9f-aafc-1b15ede332cf', 'd6903cd9-4cd1-4fab-ac1a-ccb21b0f10f8', id, 'Common actives and sunscreen', 'The therapist gives honest product advice and the right aftercare.', 360, 'Key points:
- What common actives do: retinoids, AHA and BHA, vitamin C, niacinamide, azelaic acid
- Sunscreen SPF 30 or higher, broad spectrum, reapplied every 2-3 hours outdoors', 1 from public.courses where slug='skin-therapist';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '53d470ad-0edb-4387-a7fb-91c9a13ee92a', 'd6903cd9-4cd1-4fab-ac1a-ccb21b0f10f8', id, 'Aftercare and reactions', null, 360, 'Key points:
- Aftercare sheet for each treatment; recognising reactions; honest, no-pressure product advice', 2 from public.courses where slug='skin-therapist';
insert into public.course_modules (id, course_id, title, position) select '33ada6a2-461a-414a-aec4-c4e4d2f934ab', id, 'Supervised practice, logbook and exams', 7 from public.courses where slug='skin-therapist';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select 'ca1fb60c-aad7-4cad-a503-3822a02a2e8b', '33ada6a2-461a-414a-aec4-c4e4d2f934ab', id, 'Supervised practice, logbook and exams', '40 hours of supervised floor practice and 16 hours of revision and exams.', 3360, 'Assessment: knowledge test 1 (skin, hair, consultation) 40 MCQ in 60 minutes; knowledge test 2 (devices, safety, products) 30 MCQ in 45 minutes; both pass at 80%. Practical exam: facial, scalp analysis and a mock consultation, observed live; every critical item must be passed. Patient-safety check: contraindication scenario, reaction scenario and PPE, 100%.
Logbook minimums before Level 1: supervised facials 40; scalp analyses 20; hair or scalp treatments 15; consultations documented 30; device assists (no independent use) 20.', 1 from public.courses where slug='skin-therapist';

-- Housekeeping Training
update public.courses set duration_hours=36, duration_label='36 hours (6 days)', certificate_validity_months=12,
  certificate_title='Hygiene Certificate', short_description='A 6-day, 36-hour programme teaching the exact cleaning routines, chemical safety and waste handling used in every VTIARA branch.', overview='Housekeeping staff keep treatment rooms safe and clean; one missed step can spread infection. The 6 days (16 hours of Common Core plus 20 hours of housekeeping) are taught mostly through pictures and demonstrations, in Kannada, Hindi or the local language, with English terms for chemicals and equipment. You may never touch used sharps, handle lasers or other devices, move patient records, or enter a procedure room during a procedure without a nurse or doctor present.', audience='Housekeeping and support staff, new hires and existing staff.',
  eligibility=array['8th to 10th pass; can read labels and simple instructions','Medical fitness check','Hepatitis B vaccination recommended before joining']::text[], learning_outcomes=array['Clean and reset treatment rooms, waiting areas, washrooms and corridors','Mix and use approved disinfectants as taught','Segregate and move biomedical waste to the storage area','Handle linen and towels safely','Clean small spills using the spill kit']::text[], requirements_text=array['100% attendance','80% or higher on the knowledge test','All practical checklist items passed','Yearly refresher']::text[],
  pass_rules='{"attendance_pct": 100, "knowledge_pct": 80, "practical": "Practical checklist passed", "trainer_signoff": true}'::jsonb where slug='housekeeping';
delete from public.course_modules where course_id = (select id from public.courses where slug='housekeeping');
insert into public.course_modules (id, course_id, title, position) select '56464f1f-79a9-4671-a896-c1cfd3e66b5a', id, 'H1 Cleaning basics and chemicals', 1 from public.courses where slug='housekeeping';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select 'ac0e6fef-9602-41ea-a093-c90cd12bf408', '56464f1f-79a9-4671-a896-c1cfd3e66b5a', id, 'Clean first, then disinfect', 'Staff can pick the right cloth, mop and product and handle chemicals safely.', 60, 'Key points:
- Clean first, then disinfect: dirt blocks disinfectants
- Colour-coded cloths and mops: red for toilets and washroom floors, yellow for washbasins and taps, blue for treatment rooms and reception, green for pantry', 1 from public.courses where slug='housekeeping';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '91d59c8c-b03e-41d1-acd8-0de989184a9a', '56464f1f-79a9-4671-a896-c1cfd3e66b5a', id, 'Chemical safety', null, 60, 'Key points:
- Read the label every time; wear gloves and, where the label says so, eye protection
- Never mix chemicals; bleach mixed with acids or ammonia products gives toxic gas
- Keep every bottle labelled; never pour chemicals into drink bottles
- Practice: identify 10 products from labels; match product to area', 2 from public.courses where slug='housekeeping';
insert into public.course_modules (id, course_id, title, position) select '7ba2d154-c8df-4b05-a2b7-3afc78235449', id, 'H2 Disinfectants, room routines and spills', 2 from public.courses where slug='housekeeping';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '2d8f80a4-48c3-42c5-a84e-44155b25af21', '7ba2d154-c8df-4b05-a2b7-3afc78235449', id, 'Dilution and contact time', 'Staff can dilute correctly, clean a room in the right order and manage a spill.', 120, 'Key points:
- Dilution and contact time come from the product label; typical chlorine strengths 0.1% (1,000 ppm) for general surfaces and 1% (10,000 ppm) for blood or body-fluid spills; confirm with the branch policy
- Make fresh solution each day and label it with date and time', 1 from public.courses where slug='housekeeping';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '3a86e047-0f17-41cd-ae19-d3be2d67e422', '7ba2d154-c8df-4b05-a2b7-3afc78235449', id, 'Cleaning order and high-touch surfaces', null, 120, 'Key points:
- Clean to dirty, top to bottom, far to near; use two-bucket mopping
- High-touch surfaces first: door handles, switches, bed rails, trolley handles, chair arms, taps', 2 from public.courses where slug='housekeeping';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '45cdcb50-4b70-4d9f-a562-d0a4725793c9', '7ba2d154-c8df-4b05-a2b7-3afc78235449', id, 'Room turnover and spills', null, 120, 'Key points:
- Treatment room turnover between patients, end-of-day deep clean, washroom routine
- Spill response (SOP-HK-04)
- Practice: dilution exercise with measuring cups; timed cleaning of a mock treatment room (target 10 minutes)', 3 from public.courses where slug='housekeeping';
insert into public.course_modules (id, course_id, title, position) select 'fa4d1561-b9cc-411d-aa23-41480e5c439b', id, 'H3 Biomedical waste, linen, procedure and laser rooms', 3 from public.courses where slug='housekeeping';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '945b1ce1-5759-430a-a595-2d35b54cc4c9', 'fa4d1561-b9cc-411d-aa23-41480e5c439b', id, 'Biomedical waste colour bins', 'Staff separate waste correctly, handle linen safely and respect procedure and laser room rules.', 120, 'Key points:
- Yellow: soiled dressings, cotton, gauze, contaminated items, expired medicines; red: contaminated plastics such as tubing, syringes without needles, gloves
- White translucent puncture-proof container: needles and blades; blue box: glass vials and ampoules; black bag: general waste
- Confirm current Biomedical Waste Management Rules, 2016 and your waste vendor''s instructions', 1 from public.courses where slug='housekeeping';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '04291c4c-f7db-4658-a902-f32c01a29f44', 'fa4d1561-b9cc-411d-aa23-41480e5c439b', id, 'Handling and storing waste', null, 120, 'Key points:
- Never mix categories; fill bags only up to three-quarters; never press down a bag; never put hands inside; label with date and branch
- Keep a waste register; store in the locked waste room; hand over only to the authorised vendor', 2 from public.courses where slug='housekeeping';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select 'f9422ef9-bb7e-400c-af38-001fb8d8c783', 'fa4d1561-b9cc-411d-aa23-41480e5c439b', id, 'Linen, procedure rooms and laser rooms', null, 120, 'Key points:
- Linen: wear gloves, do not shake, carry in a closed bag, keep soiled linen apart
- Laser room: enter only when the nurse says the device is off; never touch a device or move cables
- Never touch a loose needle or blade: stay away and call the nurse
- Practice: sort 30 items into bins; visit the waste room and read the register', 3 from public.courses where slug='housekeeping';
insert into public.course_modules (id, course_id, title, position) select '4016366f-1bc2-4f0c-a2a8-c30fbb5dbc6f', id, 'Supervised practice and sign-off', 4 from public.courses where slug='housekeeping';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '5519d872-a2d9-4d74-ae80-dbd3b4d716c6', '4016366f-1bc2-4f0c-a2a8-c30fbb5dbc6f', id, 'Supervised practice and sign-off', '4 hours cleaning real rooms with a buddy using the checklists, then 2 hours knowledge test and practical check.', 360, 'Pass rule: 100% attendance, 80% on the knowledge test, all practical checklist items passed. Certificate: Hygiene Certificate, valid 12 months, then yearly refresher.', 1 from public.courses where slug='housekeeping';

-- Telecaller Training
update public.courses set duration_hours=74, duration_label='74 hours (2 weeks)', certificate_validity_months=12,
  certificate_title='Telecaller Level 1', short_description='A 2-week, 74-hour programme building listening, accurate information, clean data entry and legal compliance for the first voice of VTIARA.', overview='The telecaller is the first voice of VTIARA; one honest, warm call turns an enquiry into a safe first visit. Over 2 weeks (16 hours of Common Core plus 58 telecaller hours), then 3 days of monitored live calls, you learn patient communication and voice, treatment knowledge, six call flows, CRM use, ethical objection handling, compliance and scored mock calls.', audience='New telecallers who handle enquiries, appointment booking, follow-up and reminders.',
  eligibility=array['12th pass or graduate','Clear spoken English plus the local language of the market','Typing and basic computer skills','Voice and listening test']::text[], learning_outcomes=array['Sound warm, clear and calm, and listen before speaking','Explain each treatment in simple, approved words and know what not to say','Follow the six call flows from opening to close','Record every call outcome accurately in the CRM the same day','Handle objections honestly without pressure','Follow consent, DND and telecom commercial-communication rules']::text[], requirements_text=array['80% or higher on the knowledge test','Mock-call average of 85% with no critical error','3 days of monitored live calls reviewed']::text[],
  pass_rules='{"knowledge_pct": 80, "mock_call_pct": 85, "compliance": true, "monitored_calls": true}'::jsonb where slug='telecaller';
delete from public.course_modules where course_id = (select id from public.courses where slug='telecaller');
insert into public.course_modules (id, course_id, title, position) select '96462e09-835a-400e-a3ff-1a560573887c', id, 'T1 Patient communication and voice', 1 from public.courses where slug='telecaller';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '480fe4a9-9a7a-4a8f-ae3e-9ce67d8a1fe4', '96462e09-835a-400e-a3ff-1a560573887c', id, 'Voice', 'The telecaller sounds warm, clear and calm, and listens before speaking.', 160, 'Key points:
- Voice: pace, tone, smile in the voice, pausing, avoiding fillers and slang', 1 from public.courses where slug='telecaller';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select 'c0b50b06-d6f1-4af3-a3a1-3003efcd44f8', '96462e09-835a-400e-a3ff-1a560573887c', id, 'Listening and language', null, 160, 'Key points:
- Let the patient finish, repeat back the concern, ask one question at a time
- Simple words in English and the local language; no medical jargon; spell out names and numbers', 2 from public.courses where slug='telecaller';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select 'ca47b312-f450-4c91-a2d6-13af4e104704', '96462e09-835a-400e-a3ff-1a560573887c', id, 'Anxious, angry or confused patients', null, 160, 'Key points:
- Stay calm, apologise for the inconvenience, fix the problem or escalate
- Practice: recorded 1-minute calls, playback and feedback', 3 from public.courses where slug='telecaller';
insert into public.course_modules (id, course_id, title, position) select '683ea120-1243-4e92-a964-a21d29ec816a', id, 'T2 Treatment knowledge', 2 from public.courses where slug='telecaller';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select 'ca5c3f3a-12df-4f36-a51c-c5499c0c237c', '683ea120-1243-4e92-a964-a21d29ec816a', id, 'Explaining common treatments', 'The telecaller can explain each treatment in simple, approved words and knows what not to say.', 280, 'Key points:
- For each common treatment (acne care, pigmentation, hair fall treatments, PRP and mesotherapy, laser hair reduction, anti-ageing facials and peels, dandruff care): what it is, who it may suit, typical sessions, visit time, general downtime', 1 from public.courses where slug='telecaller';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '745c7b82-049f-4b45-aa7a-27d66044bc8e', '683ea120-1243-4e92-a964-a21d29ec816a', id, 'What to always add', null, 280, 'Key points:
- The doctor decides after examination; results vary; no guarantees
- Prices and packages: where to find the current approved list', 2 from public.courses where slug='telecaller';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select 'f19da17b-b85c-477c-ac57-82ebbc76fc8b', '683ea120-1243-4e92-a964-a21d29ec816a', id, 'Questions to transfer', null, 280, 'Key points:
- Transfer to the nurse or doctor: pregnancy, medicines, reactions, pain, anything about a current treatment
- Practice: explain 5 treatments in 30 seconds each; quiz with a nurse', 3 from public.courses where slug='telecaller';
insert into public.course_modules (id, course_id, title, position) select 'd674b453-d780-4195-a6fa-8cd7133173ef', id, 'T3 Call flows and scripts', 3 from public.courses where slug='telecaller';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '417dada7-c323-4e1a-afbb-e7b0c77f57ee', 'd674b453-d780-4195-a6fa-8cd7133173ef', id, 'The six call flows', 'The telecaller follows the six VTIARA call flows with a clear opening, discovery, next step and close.', 300, 'Key points:
- New enquiry, appointment booking, reminder, reschedule and cancellation, follow-up after visit, complaint call', 1 from public.courses where slug='telecaller';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '2063d611-5eeb-4327-a4db-43a4f884bde5', 'd674b453-d780-4195-a6fa-8cd7133173ef', id, 'Structure of every call', null, 300, 'Key points:
- Opening, discovery questions, summary, next step and polite closing
- Practice: 15 scripted calls, then unscripted', 2 from public.courses where slug='telecaller';
insert into public.course_modules (id, course_id, title, position) select 'cd44b0ba-9784-4212-aae5-bc50cfecc43d', id, 'T4 CRM use', 4 from public.courses where slug='telecaller';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select 'd566f598-548b-4db3-a994-6b607aa2e4fc', 'cd44b0ba-9784-4212-aae5-bc50cfecc43d', id, 'Leads, fields and disposition codes', 'The telecaller records every call accurately in the CRM the same day.', 180, 'Key points:
- Create and update a lead; required fields; disposition codes; follow-up dates; notes in plain facts', 1 from public.courses where slug='telecaller';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '07117c26-3ab6-4c1c-a883-0a3ddcf96f38', 'cd44b0ba-9784-4212-aae5-bc50cfecc43d', id, 'Same-day updates and data privacy', null, 180, 'Key points:
- Same-day update rule; duplicate checking; no patient data in personal notes or chats
- Practice: 20 entries in the practice CRM; error review', 2 from public.courses where slug='telecaller';
insert into public.course_modules (id, course_id, title, position) select 'ea348a71-18d1-4454-a286-d33c4a6a191c', id, 'T5 Objection handling and ethical selling', 5 from public.courses where slug='telecaller';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '96ee2720-ebf5-4bba-a9f9-184c0b7e38b4', 'ea348a71-18d1-4454-a286-d33c4a6a191c', id, 'Listen, acknowledge, answer, offer', 'The telecaller answers concerns with facts and offers a consultation, never pressure.', 180, 'Key points:
- Listen, acknowledge, answer with facts, offer the next step (a consultation), never pressure', 1 from public.courses where slug='telecaller';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select 'eaac2bc6-227f-4bb3-af2c-df35ae652d13', 'ea348a71-18d1-4454-a286-d33c4a6a191c', id, 'Common objections', null, 180, 'Key points:
- Price, fear, time, ''I will think'', ''another clinic is cheaper'', ''is it safe?''
- Never create false urgency or exaggerated claims
- Practice: role-play 10 objections with a coach', 2 from public.courses where slug='telecaller';
insert into public.course_modules (id, course_id, title, position) select 'e98dcafe-1b86-4a0f-ab83-734f6e2f5d32', id, 'T6 Compliance', 6 from public.courses where slug='telecaller';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '393b2dbc-a729-4f18-a2c6-029d617d82c8', 'e98dcafe-1b86-4a0f-ab83-734f6e2f5d32', id, 'Who you may call', 'The telecaller follows consent, telecom and privacy rules on every call.', 120, 'Key points:
- Call only people who enquired or consented; honour do-not-disturb requests and the telecom commercial-communication rules (DND registry, registered sender and templates) as confirmed by the legal advisor', 1 from public.courses where slug='telecaller';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '52aac8b3-8ab8-4ab2-a9fe-5faebf7ef8eb', 'e98dcafe-1b86-4a0f-ab83-734f6e2f5d32', id, 'Recording, privacy and claims', null, 120, 'Key points:
- Tell patients when calls are recorded; never share patient details with anyone else
- No claims of guaranteed results, cure, or medical advice; no fake urgency
- Practice: spot the violations in 8 sample calls', 2 from public.courses where slug='telecaller';
insert into public.course_modules (id, course_id, title, position) select '7cb91b34-a31e-4d6b-a5aa-b4f6f0c4427a', id, 'T7 Scored mock calls', 7 from public.courses where slug='telecaller';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select '73c5e4f3-e5e4-4bf7-ada4-1232192682a6', '7cb91b34-a31e-4d6b-a5aa-b4f6f0c4427a', id, 'Mock calls with coach feedback', 'The telecaller reaches an 85% average on scored mock calls with no critical error.', 480, 'Key points:
- 20 mock calls scored with the call scoring sheet; coach feedback after each 5', 1 from public.courses where slug='telecaller';
insert into public.course_modules (id, course_id, title, position) select '787e909d-4050-40d5-a332-b996fd6fe80a', id, 'Knowledge test, call exam and monitored live calls', 8 from public.courses where slug='telecaller';
insert into public.lessons (id, module_id, course_id, title, description, duration_min, transcript, position) select 'de07527e-79cf-4a67-af8f-546d18a1eeb9', '787e909d-4050-40d5-a332-b996fd6fe80a', id, 'Knowledge test, call exam and monitored live calls', '2 hours knowledge test and call exam, followed by 3 days of monitored live calls with a buddy.', 120, 'Pass rule: 80% on the knowledge test; mock-call average 85% with no critical error; 3 days of live calls reviewed. Certificate: Telecaller Level 1, valid 12 months.
Rules of the role: never diagnose, advise on medicines or promise results; quote only approved prices, packages and offers; call only people who have enquired or given consent; tell the patient when a call is recorded; record every call outcome in the CRM the same day.', 1 from public.courses where slug='telecaller';
