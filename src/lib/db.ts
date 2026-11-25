import { useCallback, useEffect, useRef, useState } from 'react';
import { createSupabaseBackend } from './supabaseBackend';
import { createDemoBackend } from './demoBackend';
import { createUnavailableBackend } from './unavailableBackend';
import type { Backend } from './backend';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Demo mode exists ONLY when VITE_DEMO_MODE is exactly "true". A missing Supabase config never turns it on. */
export const isDemo: boolean = import.meta.env.VITE_DEMO_MODE === 'true';
/** False in a build with no Supabase config and no explicit demo flag: the app shows a configuration screen. */
export const isConfigured: boolean = isDemo || !!(url && key);

export const backend: Backend = isDemo ? createDemoBackend() : url && key ? createSupabaseBackend(url, key) : createUnavailableBackend();

export function useQuery<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);
  const run = useCallback(() => {
    const n = ++seq.current;
    setLoading(true);
    fn().then(
      (d) => { if (n === seq.current) { setData(d); setError(null); setLoading(false); } },
      (e) => { if (n === seq.current) { setError(e?.message ?? String(e)); setLoading(false); } },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { run(); }, [run]);
  return { data, error, loading, reload: run };
}

/** Run an action and surface errors. Returns true on success. */
export async function attempt(fn: () => Promise<unknown>, onError: (m: string) => void): Promise<boolean> {
  try { await fn(); return true; } catch (e: any) { onError(e?.message ?? 'Something went wrong'); return false; }
}
