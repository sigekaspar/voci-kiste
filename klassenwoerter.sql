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
