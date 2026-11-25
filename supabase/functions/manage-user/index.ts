// Edge Function: privileged user management for admins.
// Deploy:  supabase functions deploy manage-user
// The service-role key never reaches the browser. The caller must be an Academy Admin or Super Admin.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });

    const { data: who } = await caller.auth.getUser();
    if (!who.user) return json({ error: 'Not signed in' }, 401);
    const { data: roles } = await admin.from('user_roles').select('role_key').eq('user_id', who.user.id);
    const mine = (roles ?? []).map((r) => r.role_key as string);
    if (!mine.some((r) => r === 'super_admin' || r === 'academy_admin')) return json({ error: 'Admins only' }, 403);

    const { action, ...p } = await req.json();

    if (action === 'create') {
      const email = String(p.email ?? '').trim().toLowerCase();
      if (!email) return json({ error: 'Email is required' }, 400);
      const role = String(p.role ?? 'learner');
      if (!['learner', 'trainer', 'assessor', 'academy_admin', 'super_admin'].includes(role)) return json({ error: 'Unknown role' }, 400);
      if ((role === 'super_admin' || role === 'academy_admin') && !mine.includes('super_admin')) return json({ error: 'Only a Super Admin can create admins' }, 403);
      const password = String(p.password || crypto.randomUUID().replace(/-/g, '').slice(0, 14) + 'aA1!');
      const { data, error } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { full_name: p.full_name, mobile: p.mobile, city: p.city, job_role: p.job_role, branch_id: p.branch_id ?? '', learner_code: p.learner_code ?? '', consent_privacy: true },
      });
      if (error) return json({ error: error.message }, 400);
      if (role !== 'learner') await admin.from('user_roles').insert({ user_id: data.user.id, role_key: role, assigned_by: who.user.id });
      await admin.from('audit_logs').insert({ actor_id: who.user.id, action: 'create_user', entity: 'profiles', entity_id: data.user.id, details: { role } });
      // The temporary password is only returned when the admin did not choose one.
      return json({ ok: true, id: data.user.id, ...(p.password ? {} : { temporary_password: password }) });
    }

    if (action === 'reset_access') {
      const email = String(p.email ?? '');
      if (!email) return json({ error: 'Email is required' }, 400);
      const { error } = await admin.auth.resetPasswordForEmail(email);
      if (error) return json({ error: error.message }, 400);
      await admin.from('audit_logs').insert({ actor_id: who.user.id, action: 'reset_access', entity: 'profiles', entity_id: String(p.user_id ?? '') });
      return json({ ok: true });
    }

    if (action === 'set_active') {
      const id = String(p.user_id ?? '');
      if (id === who.user.id) return json({ error: 'You cannot disable your own account' }, 400);
      const active = !!p.active;
      const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: active ? 'none' : '876000h' });
      if (error) return json({ error: error.message }, 400);
      await admin.from('profiles').update({ is_active: active }).eq('id', id);
      await admin.from('audit_logs').insert({ actor_id: who.user.id, action: 'set_active', entity: 'profiles', entity_id: id, details: { active } });
      return json({ ok: true });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
