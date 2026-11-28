import { Route, Routes, Navigate } from 'react-router-dom';
import { isConfigured } from './lib/db';
import ConfigMissing from './components/ConfigMissing';
import { AdminLayout, TutorLayout, LearnerLayout, PublicLayout, RequireAuth, RequireStaff } from './components/Layouts';

import Home from './pages/public/Home';
import Catalogue from './pages/public/Catalogue';
import CourseDetail from './pages/public/CourseDetail';
import Enquire from './pages/public/Enquire';
import Verify from './pages/public/Verify';
import { Privacy, Terms, CertificateTerms, NotFound } from './pages/public/Legal';
import { Login, Signup, Forgot } from './pages/auth/Auth';

import Dashboard from './pages/learner/Dashboard';
import MyCourses from './pages/learner/MyCourses';
import CourseHome from './pages/learner/CourseHome';
import LessonPlayer from './pages/learner/LessonPlayer';
import Bookings from './pages/learner/Bookings';
import Assessment from './pages/learner/Assessment';
import Results from './pages/learner/Results';
import Certificates from './pages/learner/Certificates';
import Profile from './pages/learner/Profile';
import ResetPassword from './pages/auth/ResetPassword';

import AdminDashboard from './pages/admin/AdminDashboard';
import Users from './pages/admin/Users';
import Enrolments from './pages/admin/Enrolments';
import CoursesAdmin from './pages/admin/CoursesAdmin';
import AssessmentsAdmin from './pages/admin/AssessmentsAdmin';
import Batches from './pages/admin/Batches';
import Practicals from './pages/admin/Practicals';
import CertificatesAdmin from './pages/admin/CertificatesAdmin';
import Reports from './pages/admin/Reports';
import Audit from './pages/admin/Audit';
import Enquiries from './pages/admin/Enquiries';
import SettingsPage from './pages/admin/Settings';
import TrainerDashboard from './pages/admin/TrainerDashboard';
import { TutorStudents, TutorLessonReview, TutorSupport } from './pages/tutor/TutorPages';

export default function App() {
  if (!isConfigured) return <ConfigMissing />;
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="courses" element={<Catalogue />} />
        <Route path="courses/:slug" element={<CourseDetail />} />
        <Route path="enquire" element={<Enquire />} />
        <Route path="verify" element={<Verify />} />
        <Route path="verify/:certNo" element={<Verify />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="terms" element={<Terms />} />
        <Route path="certificate-terms" element={<CertificateTerms />} />
        <Route path="login" element={<Login />} />
        <Route path="signup" element={<Signup />} />
        <Route path="forgot-password" element={<Forgot />} />
        <Route path="reset-password" element={<ResetPassword />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route path="app" element={<LearnerLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="courses" element={<MyCourses />} />
          <Route path="courses/:slug" element={<CourseHome />} />
          <Route path="learn/:slug" element={<LessonPlayer />} />
          <Route path="learn/:slug/:lessonId" element={<LessonPlayer />} />
          <Route path="bookings" element={<Bookings />} />
          <Route path="assessment/:slug" element={<Assessment />} />
          <Route path="results/:attemptId" element={<Results />} />
          <Route path="certificates" element={<Certificates />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Route>

      <Route element={<RequireStaff />}>
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="enrolments" element={<Enrolments />} />
          <Route path="courses" element={<CoursesAdmin />} />
          <Route path="assessments" element={<AssessmentsAdmin />} />
          <Route path="batches" element={<Batches />} />
          <Route path="practicals" element={<Practicals />} />
          <Route path="practicals/:enrolmentId" element={<Practicals />} />
          <Route path="certificates" element={<CertificatesAdmin />} />
          <Route path="reports" element={<Reports />} />
          <Route path="audit" element={<Audit />} />
          <Route path="enquiries" element={<Enquiries />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>

 
      <Route element={<RequireStaff />}>
        <Route path="tutor" element={<TutorLayout />}>
          <Route index element={<TrainerDashboard />} />
          <Route path="batches" element={<Batches />} />
          <Route path="attendance" element={<Batches />} />
          <Route path="students" element={<TutorStudents />} />
          <Route path="practicals" element={<Practicals />} />
          <Route path="practicals/:enrolmentId" element={<Practicals />} />
          <Route path="lessons" element={<TutorLessonReview />} />
          <Route path="support" element={<TutorSupport />} />
          <Route path="profile" element={<Profile mode="tutor" />} />
        </Route>
      </Route>

      <Route element={<PublicLayout />}><Route path="*" element={<NotFound />} /></Route>
    </Routes>
  );
}
