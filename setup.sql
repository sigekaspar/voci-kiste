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
  grammar    jsonb,                                -- { rules:[...], tasks:[...] }
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

alter table public.units add column if not exists grammar jsonb;
alter table public.units add column if not exists level text;   -- CR3 = Ça roule 3, CR4 = Ça roule 4

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
-- kid_names wird aus Datenschutzgründen nicht mehr freigegeben (Kinder tippen Name und PIN ein)
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

-- ---------- Voci-Abenteuer: Spielstand und Teamziel ----------
alter table public.kid_state add column if not exists game jsonb not null default '{}'::jsonb;

create or replace function public.kid_login(p_name text, p_pin text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k uuid; r jsonb;
begin
  k := public._kid(p_name, p_pin);
  if k is null then raise exception 'PIN falsch' using errcode = '28000'; end if;
  insert into public.kid_state(kid_id) values (k) on conflict do nothing;
  select jsonb_build_object('name', kd.name, 'cards', s.cards, 'stars', s.stars,
                            'streak', s.streak, 'last_day', s.last_day, 'game', s.game)
    into r from public.kid_state s join public.kids kd on kd.id = s.kid_id where s.kid_id = k;
  return r;
end $$;

create or replace function public.kid_save_game(p_name text, p_pin text, p_game jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare k uuid;
begin
  k := public._kid(p_name, p_pin);
  if k is null then raise exception 'PIN falsch' using errcode = '28000'; end if;
  if pg_column_size(p_game) > 200000 then raise exception 'Spielstand zu gross'; end if;
  update public.kid_state set game = coalesce(p_game, '{}'::jsonb), updated_at = now() where kid_id = k;
end $$;

create or replace function public.team_week(p_name text, p_pin text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare k uuid; since timestamptz; tot int; n int;
begin
  k := public._kid(p_name, p_pin);
  if k is null then raise exception 'PIN falsch' using errcode = '28000'; end if;
  since := (date_trunc('week', now() at time zone 'Europe/Zurich')) at time zone 'Europe/Zurich';
  select coalesce(sum(correct), 0) into tot from public.sessions where ended_at >= since;
  select count(*) into n from public.kids;
  return jsonb_build_object('correct', tot, 'goal', greatest(1, n) * 150, 'kids', n,
                            'week', to_char(now() at time zone 'Europe/Zurich', 'IYYY-IW'));
end $$;

revoke all on function public.kid_save_game(text, text, jsonb) from public;
revoke all on function public.team_week(text, text) from public;
grant execute on function public.kid_save_game(text, text, jsonb) to anon, authenticated;
grant execute on function public.team_week(text, text) to anon, authenticated;
grant execute on function public.kid_login(text, text) to anon, authenticated;

-- Klassenwörter (siehe klassenwoerter.sql)
-- Voci-Kiste · Klassenwörter: Vorschläge der Kinder (mit eigenen Aufnahmen), Freigabe durch die Eltern
-- Einmal im Supabase SQL Editor ausführen (oder von Claude ausführen lassen).
create table if not exists public.suggestions(
  id bigserial primary key,
  kid_id uuid references public.kids(id) on delete cascade,
  unit_id text not null references public.units(id) on delete cascade,
  kind text not null default 'word',          -- word = neues Wort, rec = nur Aufnahme zu einem bestehenden Wort
  fr text not null,
  de text not null default '',
  fr_audio bytea, de_audio bytea, mime text,
  status text not null default 'pending',     -- pending | approved | rejected
  created_at timestamptz not null default now()
);
alter table public.suggestions enable row level security;
drop policy if exists sugg_admin on public.suggestions;
create policy sugg_admin on public.suggestions for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.suggestions to authenticated;
grant usage, select on sequence public.suggestions_id_seq to authenticated;

-- Freigegebene eigene Aufnahmen («Unsere Stimme»)
create table if not exists public.own_clips(
  key text primary key,                       -- französischer Text oder «de:» + deutscher Text
  path text not null,
  kid_name text,
  updated_at timestamptz not null default now()
);
alter table public.own_clips enable row level security;
drop policy if exists own_read on public.own_clips;
drop policy if exists own_admin on public.own_clips;
create policy own_read on public.own_clips for select using (true);
create policy own_admin on public.own_clips for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.own_clips to anon, authenticated;
grant insert, update, delete on public.own_clips to authenticated;

create or replace function public.kid_suggest(p_name text, p_pin text, p_unit text, p_kind text, p_fr text, p_de text,
                                              p_fr_audio text, p_de_audio text, p_mime text) returns bigint
language plpgsql security definer set search_path = public as $$
declare k uuid; fa bytea; da bytea; n int; new_id bigint;
begin
  k := public._kid(p_name, p_pin);
  if k is null then raise exception 'PIN falsch' using errcode = '28000'; end if;
  if not exists (select 1 from public.units where id = p_unit and title ilike 'Langage de classe%') then
    raise exception 'Nur für Langage de classe';
  end if;
  if length(trim(coalesce(p_fr, ''))) = 0 or length(p_fr) > 80 or length(coalesce(p_de, '')) > 80 then
    raise exception 'Wort fehlt oder ist zu lang';
  end if;
  select count(*) into n from public.suggestions where kid_id = k and status = 'pending';
  if n >= 30 then raise exception 'Schon viele Vorschläge offen. Zuerst sollen die Eltern sie anschauen.'; end if;
  if p_fr_audio is not null and length(p_fr_audio) > 0 then fa := decode(p_fr_audio, 'base64'); end if;
  if p_de_audio is not null and length(p_de_audio) > 0 then da := decode(p_de_audio, 'base64'); end if;
  if coalesce(length(fa), 0) > 400000 or coalesce(length(da), 0) > 400000 then raise exception 'Aufnahme zu lang'; end if;
  insert into public.suggestions(kid_id, unit_id, kind, fr, de, fr_audio, de_audio, mime)
  values (k, p_unit, case when p_kind = 'rec' then 'rec' else 'word' end, trim(p_fr), trim(coalesce(p_de, '')), fa, da, left(coalesce(p_mime, ''), 60))
  returning id into new_id;
  return new_id;
end $$;

create or replace function public.kid_suggestions(p_name text, p_pin text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k uuid; r jsonb;
begin
  k := public._kid(p_name, p_pin);
  if k is null then raise exception 'PIN falsch' using errcode = '28000'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'kind', kind, 'fr', fr, 'de', de, 'status', status, 'unit', unit_id,
         'fr_rec', fr_audio is not null, 'de_rec', de_audio is not null, 'created_at', created_at) order by created_at desc), '[]'::jsonb)
    into r from (select * from public.suggestions where kid_id = k order by created_at desc limit 30) s;
  return r;
end $$;

revoke all on function public.kid_suggest(text, text, text, text, text, text, text, text, text) from public;
revoke all on function public.kid_suggestions(text, text) from public;
grant execute on function public.kid_suggest(text, text, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.kid_suggestions(text, text) to anon, authenticated;

-- Datenschutz: keine Namensliste, eigene Aufnahmen ohne Kindernamen für die Kinderseite
revoke execute on function public.kid_names() from anon, authenticated, public;
revoke select on public.own_clips from anon;
grant select (key, path, updated_at) on public.own_clips to anon;

-- Papierkorb und Wiederherstellen (siehe Migration ldc_wiederherstellen_papierkorb)
alter table public.suggestions drop constraint if exists suggestions_unit_id_fkey;
create table if not exists public.trash(id bigserial primary key, kind text not null, title text not null, item jsonb not null, deleted_at timestamptz not null default now());
alter table public.trash enable row level security;
drop policy if exists trash_admin on public.trash;
create policy trash_admin on public.trash for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, insert, delete on public.trash to authenticated;
grant usage, select on sequence public.trash_id_seq to authenticated;
create or replace function public.units_to_trash() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.trash(kind, title, item) values ('unit', coalesce(old.title, old.id) || coalesce(' · ' || old.level, ''), to_jsonb(old));
  delete from public.trash where deleted_at < now() - interval '60 days';
  return old;
end $$;
drop trigger if exists units_trash on public.units;
create trigger units_trash before delete on public.units for each row execute function public.units_to_trash();
