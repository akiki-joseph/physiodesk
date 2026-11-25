-- Junctura cloud database.
-- Paste this whole file into Supabase: SQL Editor -> New query -> Run.
-- Safe to run again: it only creates what is missing.

-- One row per therapist account (plan and trial are set by the server, never by the app).
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text,
  plan text not null default 'trial',
  trial_ends timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now()
);

-- Every client, session, note, expense, measure... is one record owned by one account.
create table if not exists public.records (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null,
  id text not null,
  data jsonb not null,
  deleted boolean not null default false,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (user_id, kind, id)
);
create index if not exists records_by_time on public.records (user_id, updated_at);

-- The server stamps the time of every change, so phones with wrong clocks still sync correctly.
create or replace function public.touch_record() returns trigger
language plpgsql as $$ begin new.updated_at := clock_timestamp(); return new; end $$;
drop trigger if exists records_touch on public.records;
create trigger records_touch before insert or update on public.records
  for each row execute function public.touch_record();

-- Row level security: an account can only ever see and change its own data.
alter table public.records enable row level security;
alter table public.profiles enable row level security;
drop policy if exists "read own records" on public.records;
drop policy if exists "add own records" on public.records;
drop policy if exists "change own records" on public.records;
drop policy if exists "remove own records" on public.records;
create policy "read own records" on public.records for select to authenticated using (auth.uid() = user_id);
create policy "add own records" on public.records for insert to authenticated with check (auth.uid() = user_id);
create policy "change own records" on public.records for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "remove own records" on public.records for delete to authenticated using (auth.uid() = user_id);
drop policy if exists "read own profile" on public.profiles;
drop policy if exists "rename own profile" on public.profiles;
create policy "read own profile" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "rename own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
revoke insert, update, delete on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (name) on public.profiles to authenticated;
revoke all on public.records from anon;
grant select, insert, update, delete on public.records to authenticated;

-- A profile is created for every new account.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name) values (new.id, new.raw_user_meta_data ->> 'name')
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- "Delete my account" inside the app (required by Google Play and the App Store).
-- Deleting the account also deletes all its records and its profile.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- Home exercise programs shared with clients by link.
-- The therapist's app writes the program under a long random token. The client's page has no
-- account: it can only read the one program whose token is in its link (through
-- get_shared_program) and tick the days it was done (through mark_program_done).
-- Nobody without the token can list or read programs.
create table if not exists public.shared_programs (
  token text primary key check (length(token) between 20 and 64),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  data jsonb not null,
  done jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.shared_programs enable row level security;
drop policy if exists "own shared programs" on public.shared_programs;
create policy "own shared programs" on public.shared_programs for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
revoke all on public.shared_programs from anon;
grant select, insert, update, delete on public.shared_programs to authenticated;

create or replace function public.get_shared_program(p_token text) returns jsonb
language sql security definer set search_path = public stable as $$
  select data || jsonb_build_object('done', done, 'updated', updated_at)
  from public.shared_programs where token = p_token and length(p_token) >= 20
$$;

-- p_items: the numbers (0, 1, 2…) of the exercises done that day. Only days close to today are
-- accepted, and only the last 90 days are kept.
create or replace function public.mark_program_done(p_token text, p_day date, p_items int[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_day is null or p_day < current_date - 2 or p_day > current_date + 2 then return; end if;
  if coalesce(array_length(p_items, 1), 0) > 60 then return; end if;
  update public.shared_programs s
     set done = (select coalesce(jsonb_object_agg(k, v), '{}'::jsonb)
                   from jsonb_each(s.done || jsonb_build_object(p_day::text, to_jsonb(coalesce(p_items, '{}'::int[])))) as e(k, v)
                  where k::date > current_date - 90)
   where token = p_token and length(p_token) >= 20;
end $$;
revoke all on function public.get_shared_program(text) from public;
revoke all on function public.mark_program_done(text, date, int[]) from public;
grant execute on function public.get_shared_program(text) to anon, authenticated;
grant execute on function public.mark_program_done(text, date, int[]) to anon, authenticated;
