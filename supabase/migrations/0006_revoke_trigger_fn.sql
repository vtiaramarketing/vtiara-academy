-- 0006 · Trigger functions are never called directly. (Already applied to the live project as academy_0006_revoke_trigger_fn.)
do $$
declare r record;
begin
  for r in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prorettype = 'trigger'::regtype loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
  end loop;
end $$;
