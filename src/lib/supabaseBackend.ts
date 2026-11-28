import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Backend, Query } from './backend';

// Explicit column list: nursing registration columns are intentionally not selectable (see 0003_rls.sql).
const PROFILE_COLUMNS =
  'id,full_name,email,mobile,city,preferred_language,learner_code,job_role,branch_id,avatar_path,consent_privacy,consent_comms,is_active,created_at';

export function createSupabaseBackend(url: string, anonKey: string): Backend {
  const sb: SupabaseClient = createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } });

  const fail = (error: { message: string } | null) => { if (error) throw new Error(error.message); };

  return {
    mode: 'supabase',
    auth: {
      async getUser() {
        const { data } = await sb.auth.getSession();
        const u = data.session?.user;
        return u ? { id: u.id, email: u.email ?? null } : null;
      },
      async signIn(email, password) {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        fail(error);
        return { id: data.user!.id, email: data.user!.email ?? null };
      },
      async signUp({ email, password, meta }) {
        const { data, error } = await sb.auth.signUp({ email, password, options: { data: meta, emailRedirectTo: window.location.origin + '/login' } });
        fail(error);
        return { user: data.user ? { id: data.user.id, email: data.user.email ?? null } : null, needsConfirmation: !data.session };
      },
      async signOut() { await sb.auth.signOut(); },
      async sendPasswordReset(email) {
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' });
        fail(error);
      },
      async updatePassword(password) {
        const { error } = await sb.auth.updateUser({ password });
        fail(error);
      },
      async sendOtp(mobile) {
        const { error } = await sb.auth.signInWithOtp({ phone: mobile.startsWith('+') ? mobile : '+91' + mobile });
        fail(error);
      },
      async verifyOtp(mobile, token) {
        const { data, error } = await sb.auth.verifyOtp({ phone: mobile.startsWith('+') ? mobile : '+91' + mobile, token, type: 'sms' });
        fail(error);
        return { id: data.user!.id, email: data.user!.email ?? null };
      },
      onChange(cb) {
        const { data } = sb.auth.onAuthStateChange(() => cb());
        return () => data.subscription.unsubscribe();
      },
    },

    async select(table, q: Query = {}) {
      let query: any = sb.from(table).select(table === 'profiles' ? PROFILE_COLUMNS : '*');
      for (const [k, v] of Object.entries(q.eq ?? {})) query = query.eq(k, v);
      for (const [k, v] of Object.entries(q.in ?? {})) query = query.in(k, v);
      if (q.order) query = query.order(q.order[0], { ascending: q.order[1] ?? true });
      if (q.limit) query = query.limit(q.limit);
      const { data, error } = await query;
      fail(error);
      return (data ?? []) as any[];
    },
    async insert(table, row) {
      const { data, error } = await sb.from(table).insert(row as any).select();
      fail(error);
      return (data ?? []) as any[];
    },
    async update(table, match, patch) {
      let query: any = sb.from(table).update(patch);
      for (const [k, v] of Object.entries(match)) query = query.eq(k, v);
      // profiles hides nursing/consent columns from SELECT, so RETURNING * would be refused (403)
      const { data, error } = await (table === 'profiles' ? query.select('id') : query.select());
      fail(error);
      return (data ?? []) as any[];
    },
    async remove(table, match) {
      let query: any = sb.from(table).delete();
      for (const [k, v] of Object.entries(match)) query = query.eq(k, v);
      const { error } = await query;
      fail(error);
    },
    async rpc(fn, args = {}) {
      const { data, error } = await sb.rpc(fn, args);
      fail(error);
      return data as any;
    },
    storage: {
      async upload(bucket, path, file) {
        const { error } = await sb.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type });
        fail(error);
        return path;
      },
      async signedUrl(bucket, path) {
        // Private buckets are never exposed through public URLs: short-lived signed URLs only.
        if (bucket === 'course-thumbnails') return sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
        const { data } = await sb.storage.from(bucket).createSignedUrl(path, 60 * 10);
        return data?.signedUrl ?? null;
      },
    },
    async manageUser(action, payload) {
      const { data, error } = await sb.functions.invoke('manage-user', { body: { action, ...payload } });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data;
    },
  };
}
