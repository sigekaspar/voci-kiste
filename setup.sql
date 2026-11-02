-- =====================================================================
--  Voci-Kiste · Datenbank für Supabase
--  Im Supabase-Dashboard: SQL Editor → New query → alles einfügen → Run
--  WICHTIG: Zuerst unten bei «admins» Ihre E-Mail-Adresse eintragen.
--  Das Skript darf mehrmals laufen, ohne Daten zu löschen.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------- Tabellen ----------
create table if not exists public.admins (
  email text primary key
);

create table if not exists public.units (
  id         text primary key,
  title      text not null,
  ord        int  not null default 0,
  words      jsonb not null default '[]'::jsonb,   -- [{ "fr": "...", "de": "..." }]
  updated_at timestamptz not null default now()
);

create table if not exists public.kids (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  pin_hash   text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.kid_state (
  kid_id     uuid primary key references public.kids(id) on delete cascade,
  cards      jsonb not null default '{}'::jsonb,   -- { "unitId|wort": { "box": 1-5, "due": "2026-11-02" } }
  stars      int  not null default 0,
  streak     int  not null default 0,
  last_day   date,
  updated_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id         bigint generated always as identity primary key,
  kid_id     uuid not null references public.kids(id) on delete cascade,
  kind       text not null,          -- practice | test | learn
  unit_ids   text[] not null default '{}',
  answers    int  not null default 0,
  correct    int  not null default 0,
  seconds    int  not null default 0,
  started_at timestamptz,
  ended_at   timestamptz not null default now()
);
create index if not exists sessions_kid_time on public.sessions(kid_id, ended_at desc);

-- ---------- Wer ist Admin (Eltern)? ----------
-- >>> Hier Ihre E-Mail eintragen (dieselbe wie beim Supabase-Benutzer) <<<
insert into public.admins(email) values ('speck@ich-habe-fertig.com')
on conflict do nothing;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

-- ---------- Zugriffsregeln ----------
alter table public.admins    enable row level security;
alter table public.units     enable row level security;
alter table public.kids      enable row level security;
alter table public.kid_state enable row level security;
alter table public.sessions  enable row level security;

drop policy if exists units_read  on public.units;
drop policy if exists units_write on public.units;
drop policy if exists kids_admin  on public.kids;
drop policy if exists state_admin on public.kid_state;
drop policy if exists sess_admin  on public.sessions;

-- Wörter: alle dürfen lesen, nur Admin ändert
create policy units_read  on public.units for select using (true);
create policy units_write on public.units for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- Kinder, Fortschritt, Übungsrunden: nur Admin sieht direkt (Kinder gehen über die Funktionen unten)
create policy kids_admin  on public.kids      for all    to authenticated using (public.is_admin()) with check (public.is_admin());
create policy state_admin on public.kid_state for select to authenticated using (public.is_admin());
create policy sess_admin  on public.sessions  for select to authenticated using (public.is_admin());
-- admins: keine Regel = niemand liest die Tabelle über die Website

-- Freigaben für die Website (seit 30.10.2026 bei Supabase nötig, die Zugriffsregeln oben schützen weiterhin)
grant usage on schema public to anon, authenticated;
grant select on public.units to anon, authenticated;
grant insert, update, delete on public.units to authenticated;
grant select, insert, update, delete on public.kids to authenticated;
grant select on public.kid_state to authenticated;
grant select on public.sessions to authenticated;

-- ---------- Funktionen für die Kinder (Name + PIN) ----------
create or replace function public._kid(p_name text, p_pin text) returns uuid
language sql stable security definer set search_path = public, extensions as $$
  select id from public.kids
  where lower(name) = lower(trim(p_name)) and pin_hash = extensions.crypt(p_pin, pin_hash);
$$;
revoke all on function public._kid(text, text) from public, anon, authenticated;

create or replace function public.kid_names() returns table(name text)
language sql stable security definer set search_path = public as $$
  select name from public.kids order by name;
$$;

create or replace function public.kid_login(p_name text, p_pin text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k uuid; r jsonb;
begin
  k := public._kid(p_name, p_pin);
  if k is null then raise exception 'PIN falsch' using errcode = '28000'; end if;
  insert into public.kid_state(kid_id) values (k) on conflict do nothing;
  select jsonb_build_object('name', kd.name, 'cards', s.cards, 'stars', s.stars,
                            'streak', s.streak, 'last_day', s.last_day)
    into r
    from public.kid_state s join public.kids kd on kd.id = s.kid_id
   where s.kid_id = k;
  return r;
end $$;

create or replace function public.kid_save(p_name text, p_pin text, p_cards jsonb,
                                           p_stars int, p_streak int, p_last_day date) returns void
language plpgsql security definer set search_path = public as $$
declare k uuid;
begin
  k := public._kid(p_name, p_pin);
  if k is null then raise exception 'PIN falsch' using errcode = '28000'; end if;
  insert into public.kid_state(kid_id, cards, stars, streak, last_day, updated_at)
  values (k, coalesce(p_cards, '{}'::jsonb), coalesce(p_stars, 0), coalesce(p_streak, 0), p_last_day, now())
  on conflict (kid_id) do update
     set cards = excluded.cards, stars = excluded.stars, streak = excluded.streak,
         last_day = excluded.last_day, updated_at = now();
end $$;

create or replace function public.kid_log(p_name text, p_pin text, p_kind text, p_units text[],
                                          p_answers int, p_correct int, p_seconds int,
                                          p_started timestamptz) returns void
language plpgsql security definer set search_path = public as $$
declare k uuid;
begin
  k := public._kid(p_name, p_pin);
  if k is null then raise exception 'PIN falsch' using errcode = '28000'; end if;
  insert into public.sessions(kid_id, kind, unit_ids, answers, correct, seconds, started_at)
  values (k, left(p_kind, 20), coalesce(p_units, '{}'), greatest(0, p_answers), greatest(0, p_correct),
          least(greatest(0, p_seconds), 4 * 3600), p_started);
end $$;

-- ---------- Funktion für Eltern: Kind anlegen oder PIN ändern ----------
create or replace function public.admin_set_kid(p_name text, p_pin text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.is_admin() then raise exception 'Nur für Eltern' using errcode = '42501'; end if;
  if p_pin !~ '^[0-9]{4}$' then raise exception 'Die PIN muss aus 4 Ziffern bestehen'; end if;
  insert into public.kids(name, pin_hash) values (trim(p_name), extensions.crypt(p_pin, extensions.gen_salt('bf')))
  on conflict (name) do update set pin_hash = excluded.pin_hash;
end $$;

revoke all on function public.kid_names()                                       from public;
revoke all on function public.kid_login(text, text)                             from public;
revoke all on function public.kid_save(text, text, jsonb, int, int, date)       from public;
revoke all on function public.kid_log(text, text, text, text[], int, int, int, timestamptz) from public;
revoke all on function public.admin_set_kid(text, text)                         from public;
revoke all on function public.is_admin()                                        from public;
grant execute on function public.kid_names()                                     to anon, authenticated;
grant execute on function public.kid_login(text, text)                           to anon, authenticated;
grant execute on function public.kid_save(text, text, jsonb, int, int, date)     to anon, authenticated;
grant execute on function public.kid_log(text, text, text, text[], int, int, int, timestamptz) to anon, authenticated;
grant execute on function public.admin_set_kid(text, text)                       to authenticated;
grant execute on function public.is_admin()                                      to authenticated;

-- ---------- Beispiel-Wörter (später auf der Elternseite löschen) ----------
insert into public.units(id, title, ord, words) values
('beispiel-ecole', 'Beispiel: À l''école', 90, '[
 {"fr":"le cahier","de":"das Heft"},{"fr":"le crayon","de":"der Bleistift"},
 {"fr":"la gomme","de":"der Radiergummi"},{"fr":"le stylo","de":"der Kugelschreiber / der Füller"},
 {"fr":"la règle","de":"das Lineal"},{"fr":"le livre","de":"das Buch"},
 {"fr":"la trousse","de":"das Etui"},{"fr":"le cartable","de":"die Schultasche"},
 {"fr":"les ciseaux","de":"die Schere"},{"fr":"la colle","de":"der Leim"},
 {"fr":"la feuille","de":"das Blatt"},{"fr":"l''élève","de":"der Schüler / die Schülerin"}]'::jsonb),
('beispiel-nombres', 'Beispiel: Les nombres 1–12', 91, '[
 {"fr":"un","de":"eins"},{"fr":"deux","de":"zwei"},{"fr":"trois","de":"drei"},{"fr":"quatre","de":"vier"},
 {"fr":"cinq","de":"fünf"},{"fr":"six","de":"sechs"},{"fr":"sept","de":"sieben"},{"fr":"huit","de":"acht"},
 {"fr":"neuf","de":"neun"},{"fr":"dix","de":"zehn"},{"fr":"onze","de":"elf"},{"fr":"douze","de":"zwölf"}]'::jsonb)
on conflict (id) do nothing;
