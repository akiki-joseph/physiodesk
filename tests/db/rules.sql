-- Checks the access rules in supabase/schema.sql. Any broken rule stops with an error.
\set ON_ERROR_STOP 1

-- two therapists sign up (the schema's trigger gives each a profile)
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"name":"Therapist A"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com', '{"name":"Therapist B"}');


-- as therapist A
set role authenticated; set request.uid = '00000000-0000-0000-0000-00000000000a';
insert into public.records (user_id, kind, id, data) values ('00000000-0000-0000-0000-00000000000a', 'clients', 'c1', '{"name":"Maya"}');
insert into public.shared_programs (token, data) values ('tokenA_aaaaaaaaaaaaaaaaaa', '{"who":"Maya","items":[]}');
do $$ begin
  if (select count(*) from public.records) <> 1 then raise exception 'A should see its own record'; end if;
  if (select count(*) from public.profiles) <> 1 then raise exception 'A should see only its own profile'; end if;
  begin
    insert into public.shared_programs (token, data) values ('short', '{}');
    raise exception 'a short link code was accepted';
  exception when check_violation then null; end;
  begin
    insert into public.records (user_id, kind, id, data) values ('00000000-0000-0000-0000-00000000000b', 'clients', 'x', '{}');
    raise exception 'A could write a record for B';
  exception when insufficient_privilege then null; end;
end $$;

-- as therapist B: sees nothing of A, changes nothing of A
set request.uid = '00000000-0000-0000-0000-00000000000b';
update public.records set data = '{"hacked":1}';
update public.shared_programs set data = '{"hacked":1}';
delete from public.records;
do $$ begin
  if (select count(*) from public.records) <> 0 then raise exception 'B can see A''s records'; end if;
  if (select count(*) from public.shared_programs) <> 0 then raise exception 'B can see A''s shared programs'; end if;
end $$;
reset role;
do $$ begin
  if exists (select 1 from public.records where data ? 'hacked') or exists (select 1 from public.shared_programs where data ? 'hacked')
    or (select count(*) from public.records) <> 1 then raise exception 'B changed A''s data'; end if;
end $$;

-- the client's exercise page, with no account
set role anon; set request.uid = '';
do $$ begin
  begin perform 1 from public.records; raise exception 'anon can read records'; exception when insufficient_privilege then null; end;
  begin perform 1 from public.shared_programs; raise exception 'anon can list shared programs'; exception when insufficient_privilege then null; end;
  if public.get_shared_program('tokenA_aaaaaaaaaaaaaaaaaa') ->> 'who' <> 'Maya' then raise exception 'the page cannot open its program'; end if;
  if public.get_shared_program('wrong_token_aaaaaaaaaaaaa') is not null then raise exception 'a wrong link opened something'; end if;
  perform public.mark_program_done('tokenA_aaaaaaaaaaaaaaaaaa', current_date, array[0, 2]);
  perform public.mark_program_done('tokenA_aaaaaaaaaaaaaaaaaa', current_date - 30, array[1]);
  if public.get_shared_program('tokenA_aaaaaaaaaaaaaaaaaa') -> 'done' <> jsonb_build_object(current_date::text, jsonb_build_array(0, 2)) then
    raise exception 'ticks were not recorded as expected: %', public.get_shared_program('tokenA_aaaaaaaaaaaaaaaaaa') -> 'done'; end if;
end $$;

-- deleting an account removes everything it owned
reset role;
delete from auth.users where id = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  if (select count(*) from public.records) + (select count(*) from public.shared_programs) + (select count(*) from public.profiles where id = '00000000-0000-0000-0000-00000000000a') <> 0
    then raise exception 'data left behind after the account was deleted'; end if;
end $$;
\echo 'All database rules hold.'
