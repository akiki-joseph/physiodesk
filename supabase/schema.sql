-- PhysioDesk cloud database.
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
