import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Award, BarChart3, Bell, BookOpen, Building2, CalendarDays, ClipboardCheck, FileClock, GraduationCap, LayoutDashboard,
  LogOut, Menu, ScrollText, Settings, ShieldCheck, UserCircle, Users, X, Library, ListChecks, Home, UserCheck, Phone, MessageCircle, Inbox,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { backend, isDemo, useQuery } from '@/lib/db';
import { useSettings } from '@/lib/settings';
import { Logo, Spinner } from './ui';
import { cn, fmtDateTime, ROLE_LABEL } from '@/lib/utils';
import type { Notification } from '@/lib/types';

/* ───────── Public ───────── */
const DemoBar = lazy(() => import('./DemoBar'));

export function PublicLayout() {
  const [open, setOpen] = useState(false);
  const { user, isStaff } = useAuth();
  const { contact } = useSettings();
  const loc = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    setOpen(false);
    if (loc.hash) {
      const el = document.getElementById(loc.hash.slice(1));
      if (el) { setTimeout(() => el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }), 50); return; }
    }
    window.scrollTo(0, 0);
  }, [loc.pathname, loc.hash]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); toggleRef.current?.focus(); } };
    document.addEventListener('keydown', onKey);
    menuRef.current?.querySelector<HTMLElement>('a,button')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  const link = ({ isActive }: { isActive: boolean }) => cn('rounded-lg px-3 py-2 text-sm font-medium transition hover:text-teal', isActive ? 'text-teal' : 'text-navy/75');
  const home = user ? (isStaff ? '/admin' : '/app/dashboard') : '/login';
  const NAV: [string, string][] = [['/courses', 'Courses'], ['/#batches', 'Upcoming batches'], ['/#how', 'How it works'], ['/verify', 'Verify certificate'], ['/enquire', 'Enquire']];
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-navy focus:shadow-lift">Skip to content</a>
      <header className="sticky top-0 z-30 border-b border-navy/5 bg-white/90 backdrop-blur">
        <div className="section flex h-16 items-center justify-between">
          <Logo />
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            {NAV.map(([to, l]) => (to.includes('#')
              ? <Link key={to} to={to} className="rounded-lg px-3 py-2 text-sm font-medium text-navy/75 hover:text-teal">{l}</Link>
              : <NavLink key={to} to={to} className={link}>{l}</NavLink>))}
          </nav>
          <div className="hidden items-center gap-2 lg:flex">
            {user ? <Link to={home} className="btn-primary">{isStaff ? 'Admin portal' : 'My learning'}</Link> : (<><Link to="/login" className="btn-ghost">Sign in</Link><Link to="/signup" className="btn-primary">Register</Link></>)}
          </div>
          <button ref={toggleRef} className="rounded-lg p-2 lg:hidden" onClick={() => setOpen(!open)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="mobile-menu">{open ? <X aria-hidden /> : <Menu aria-hidden />}</button>
        </div>
        {open && (
          <div id="mobile-menu" ref={menuRef} className="border-t border-navy/5 bg-white px-5 pb-5 pt-2 lg:hidden">
            <nav aria-label="Mobile">
              {NAV.map(([to, l]) => <Link key={to} to={to} className="block rounded-lg px-3 py-3 text-sm font-medium text-navy/85 hover:bg-pale">{l}</Link>)}
            </nav>
            <div className="mt-3 flex gap-2">
              {user ? <Link to={home} className="btn-primary flex-1">{isStaff ? 'Admin portal' : 'My learning'}</Link> : (<><Link to="/login" className="btn-outline flex-1">Sign in</Link><Link to="/signup" className="btn-primary flex-1">Register</Link></>)}
            </div>
          </div>
        )}
      </header>
      <main id="main" tabIndex={-1} className="flex-1 pb-16 outline-none lg:pb-0"><Outlet /></main>
      <Footer />
      {(contact.whatsappUrl || contact.telUrl) && (
        <div className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 gap-px border-t border-navy/10 bg-navy/10 lg:hidden" role="group" aria-label="Quick contact">
          {contact.telUrl && <a href={contact.telUrl} className="flex items-center justify-center gap-2 bg-white py-3 text-sm font-semibold text-navy"><Phone aria-hidden className="h-4 w-4" />Call</a>}
          {contact.whatsappUrl && <a href={contact.whatsappUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 bg-[#1f8f4e] py-3 text-sm font-semibold text-white"><MessageCircle aria-hidden className="h-4 w-4" />WhatsApp</a>}
        </div>
      )}
      {isDemo && <Suspense fallback={null}><DemoBar /></Suspense>}
    </div>
  );
}

function Footer() {
  const { settings: s, contact } = useSettings();
  const socials = [['Instagram', s.instagram_url], ['Facebook', s.facebook_url], ['YouTube', s.youtube_url], ['LinkedIn', s.linkedin_url]].filter(([, u]) => u) as [string, string][];
  return (
    <footer className="mt-20 bg-navy text-white no-print">
      <div className="section grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo light />
          <p className="mt-4 max-w-sm text-sm text-white/65">Structured online, academy and supervised training for safe, consistent VTIARA care.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {contact.whatsappUrl && <a className="btn-gold !py-2 text-sm" href={contact.whatsappUrl} target="_blank" rel="noreferrer">Enquire on WhatsApp</a>}
            <Link className="rounded-xl border border-white/25 px-4 py-2 text-sm font-semibold hover:bg-white/10" to="/enquire?intent=call">Book a counselling call</Link>
          </div>
        </div>
        <div>
          <p className="eyebrow !text-gold">Academy</p>
          <ul className="mt-3 space-y-2 text-sm text-white/75">
            <li><Link to="/courses" className="hover:text-white">Courses</Link></li>
            <li><Link to="/enquire" className="hover:text-white">Enquire</Link></li>
            <li><Link to="/verify" className="hover:text-white">Certificate verification</Link></li>
            <li><Link to="/privacy" className="hover:text-white">Privacy policy</Link></li>
            <li><Link to="/terms" className="hover:text-white">Terms and conditions</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow !text-gold">Contact</p>
          <ul className="mt-3 space-y-2 text-sm text-white/75">
            {contact.address && <li>{contact.address}{contact.mapsUrl && <> · <a className="underline hover:text-white" href={contact.mapsUrl} target="_blank" rel="noreferrer">Map</a></>}</li>}
            {contact.hours && <li>{contact.hours}</li>}
            {contact.phone && <li><a className="hover:text-white" href={contact.telUrl ?? undefined}>{contact.phone}</a></li>}
            {contact.email && <li><a className="hover:text-white" href={`mailto:${contact.email}`}>{contact.email}</a></li>}
            {s.clinic_website && <li><a className="hover:text-white" href={s.clinic_website} target="_blank" rel="noreferrer">VTIARA Clinic website ↗</a></li>}
            {socials.map(([n, u]) => <li key={n}><a className="hover:text-white" href={u} target="_blank" rel="noreferrer">{n} ↗</a></li>)}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="section py-5 text-xs text-white/60">© {new Date().getFullYear()} VTIARA Training Academy. Completion of a course does not authorise diagnosis, prescribing, or procedures outside an approved role.</p>
      </div>
    </footer>
  );
}

/* ───────── Guards ───────── */
export function RequireAuth() {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  return <Outlet />;
}
export function RequireStaff() {
  const { user, loading, isStaff } = useAuth();
  const loc = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (!isStaff) return <Navigate to="/app/dashboard" replace />;
  return <Outlet />;
}

/* ───────── Notifications ───────── */
function Bell_({ dark }: { dark?: boolean }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { data, reload } = useQuery(() => backend.select<Notification>('notifications', { eq: { user_id: user!.id }, order: ['created_at', false], limit: 12 }), [user?.id, open]);
  const unread = (data ?? []).filter((n) => !n.is_read).length;
  const nav = useNavigate();
  const read = async (n: Notification) => {
    await backend.update('notifications', { id: n.id }, { is_read: true }); reload(); setOpen(false);
    if (n.link) nav(n.link.startsWith('/app') || n.link.startsWith('/admin') || n.link.startsWith('/courses') ? n.link : '/app/dashboard');
  };
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className={cn('relative rounded-xl p-2.5 hover:bg-pale', dark && 'hover:bg-white/10')} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}>
        <Bell className="h-5 w-5" />{unread > 0 && <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-navy">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[85vw] rounded-2xl border border-navy/10 bg-white p-2 text-navy shadow-lift">
          <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-navy/50">Notifications</p>
          {(data ?? []).length === 0 && <p className="px-3 py-6 text-center text-sm text-navy/55">You're all caught up.</p>}
          {(data ?? []).map((n) => (
            <button key={n.id} onClick={() => read(n)} className={cn('block w-full rounded-xl px-3 py-2.5 text-left hover:bg-pale', !n.is_read && 'bg-pale/60')}>
              <p className="text-sm font-semibold">{n.title}</p>
              {n.body && <p className="text-xs text-navy/65">{n.body}</p>}
              <p className="mt-0.5 text-[11px] text-navy/40">{fmtDateTime(n.created_at)}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────── Learner portal ───────── */
const LEARNER_NAV = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/courses', label: 'My courses', icon: BookOpen },
  { to: '/app/bookings', label: 'Academy', icon: CalendarDays },
  { to: '/app/certificates', label: 'Certificates', icon: Award },
  { to: '/app/profile', label: 'Profile', icon: UserCircle },
];
export function LearnerLayout() {
  const { user, isStaff } = useAuth();
  const nav = useNavigate();
  const signOut = async () => { await backend.auth.signOut(); nav('/'); };
  return (
    <div className="min-h-screen bg-pale">
      <header className="sticky top-0 z-30 border-b border-navy/5 bg-white/95 backdrop-blur no-print">
        <div className="section flex h-16 items-center justify-between">
          <Logo small />
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Learner">
            {LEARNER_NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => cn('flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium', isActive ? 'bg-teal/10 text-teal' : 'text-navy/70 hover:bg-pale')}>
                <n.icon className="h-4 w-4" />{n.label}
              </NavLink>
            ))}
            <NavLink to="/courses" className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium text-navy/70 hover:bg-pale"><Library className="h-4 w-4" />Catalogue</NavLink>
          </nav>
          <div className="flex items-center gap-1">
            {isStaff && <Link to="/admin" className="btn-outline btn-sm mr-1 hidden sm:inline-flex">Admin portal</Link>}
            <Bell_ />
            <div className="ml-1 hidden text-right sm:block"><p className="text-sm font-semibold leading-tight">{user?.profile?.full_name || user?.email}</p><p className="text-[11px] text-navy/50">{user?.roles.map((r) => ROLE_LABEL[r]).join(' · ')}</p></div>
            <button onClick={signOut} className="rounded-xl p-2.5 hover:bg-pale" aria-label="Sign out"><LogOut className="h-5 w-5" /></button>
          </div>
        </div>
      </header>
      <main className="section py-6 pb-28 lg:pb-10"><Outlet /></main>
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-navy/10 bg-white lg:hidden" aria-label="Learner mobile">
        {LEARNER_NAV.map((n) => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => cn('flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium', isActive ? 'text-teal' : 'text-navy/55')}>
            <n.icon className="h-5 w-5" />{n.label}
          </NavLink>
        ))}
      </nav>
      {isDemo && <Suspense fallback={null}><DemoBar /></Suspense>}
    </div>
  );
}

/* ───────── Admin portal ───────── */
type NavItem = { to: string; label: string; icon: typeof Home; roles?: string[]; end?: boolean };
const ADMIN_NAV: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/practicals', label: 'Practical reviews', icon: ClipboardCheck },
  { to: '/admin/batches', label: 'Batches', icon: CalendarDays },
  { to: '/admin/users', label: 'Users', icon: Users, roles: ['super_admin', 'academy_admin'] },
  { to: '/admin/enrolments', label: 'Enrolments', icon: UserCheck, roles: ['super_admin', 'academy_admin'] },
  { to: '/admin/courses', label: 'Courses', icon: BookOpen, roles: ['super_admin', 'academy_admin'] },
  { to: '/admin/assessments', label: 'Assessments', icon: ListChecks, roles: ['super_admin', 'academy_admin'] },
  { to: '/admin/certificates', label: 'Certificates', icon: Award, roles: ['super_admin', 'academy_admin'] },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3, roles: ['super_admin', 'academy_admin'] },
  { to: '/admin/audit', label: 'Audit log', icon: FileClock, roles: ['super_admin', 'academy_admin'] },
  { to: '/admin/enquiries', label: 'Enquiries', icon: Inbox, roles: ['super_admin', 'academy_admin'] },
  { to: '/admin/settings', label: 'Academy settings', icon: Settings, roles: ['super_admin', 'academy_admin'] },
];
export function AdminLayout() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
  const items = ADMIN_NAV.filter((i) => !i.roles || i.roles.some((r) => (user?.roles as string[] | undefined)?.includes(r)));
  const signOut = async () => { await backend.auth.signOut(); nav('/'); };
  const side = (
    <div className="flex h-full flex-col bg-navy text-white">
      <div className="px-5 py-5"><Logo light /><p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-gold"><ShieldCheck className="h-3 w-3" />{user?.roles.map((r) => ROLE_LABEL[r]).filter((r) => r !== 'Learner').join(' · ') || 'Staff'}</p></div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3" aria-label="Admin">
        {items.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium', isActive ? 'bg-white/12 text-white' : 'text-white/65 hover:bg-white/8 hover:text-white')}>
            <n.icon className="h-4 w-4" />{n.label}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-1 border-t border-white/10 p-3">
        <Link to="/app/dashboard" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/65 hover:bg-white/8 hover:text-white"><GraduationCap className="h-4 w-4" />Learner view</Link>
        <Link to="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/65 hover:bg-white/8 hover:text-white"><Building2 className="h-4 w-4" />Public site</Link>
        <button onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/65 hover:bg-white/8 hover:text-white"><LogOut className="h-4 w-4" />Sign out</button>
      </div>
    </div>
  );
  return (
    <div className="min-h-screen bg-pale lg:pl-64">
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block no-print">{side}</aside>
      {open && <div className="fixed inset-0 z-40 lg:hidden"><div className="absolute inset-0 bg-navy/50" onClick={() => setOpen(false)} /><aside className="absolute inset-y-0 left-0 w-72">{side}</aside></div>}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-navy/5 bg-white/95 px-4 backdrop-blur no-print">
        <button className="rounded-lg p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu /></button>
        <p className="hidden text-sm text-navy/60 lg:block"><ScrollText className="mr-1.5 inline h-4 w-4" />Staff portal</p>
        <div className="flex items-center gap-2"><Bell_ /><span className="hidden text-sm font-semibold sm:block">{user?.profile?.full_name}</span></div>
      </header>
      <main className="mx-auto max-w-7xl p-4 pb-24 sm:p-6"><Outlet /></main>
      {isDemo && <Suspense fallback={null}><DemoBar /></Suspense>}
    </div>
  );
}
