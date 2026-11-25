import { AlertTriangle } from 'lucide-react';

/** Shown in a production build when Supabase is not configured. Deliberately has no demo accounts or shortcuts. */
export default function ConfigMissing() {
  return (
    <main className="grid min-h-screen place-items-center bg-pale px-4" role="alert">
      <div className="max-w-lg rounded-2xl border border-navy/10 bg-white p-8 shadow-card">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-700"><AlertTriangle aria-hidden className="h-5 w-5" /></div>
        <h1 className="font-display text-2xl text-navy">VTIARA Training Academy is not available right now</h1>
        <p className="mt-3 text-sm text-navy/70">This site is missing its backend configuration, so it cannot load courses or sign anyone in. If you are a visitor, please try again shortly or contact the academy directly.</p>
        <p className="mt-4 rounded-lg bg-navy/5 p-3 text-xs text-navy/70">Site owner: set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in your hosting environment and redeploy. See the README, "Environment variables".</p>
      </div>
    </main>
  );
}
