-- Voci-Kiste · Korrektur «Speichern geht nicht»
-- Supabase: SQL Editor → New query → einfügen → Run
grant usage on schema public to anon, authenticated;
grant select on public.units to anon, authenticated;
grant insert, update, delete on public.units to authenticated;
grant select, insert, update, delete on public.kids to authenticated;
grant select on public.kid_state to authenticated;
grant select on public.sessions to authenticated;
