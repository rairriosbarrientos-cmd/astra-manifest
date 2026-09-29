-- Pruebas de 001_astra.sql en un Postgres local (con auth_stub de Civil Road).
\set ON_ERROR_STOP 1
\set QUIET 1
reset role;
insert into auth.users values ('00000000-0000-0000-0000-00000000aa01', 'ana@x.com'), ('00000000-0000-0000-0000-00000000bb02', 'bo@x.com');
create or replace function pg_temp.ok(n text) returns void language plpgsql as $$ begin raise notice 'OK  %', n; end $$;
set role anon;
do $$ begin
  begin perform 1 from public.astra_perfiles; raise exception 'FALLO: anon lee'; exception when insufficient_privilege then null; end;
  perform pg_temp.ok('anónimo no lee perfiles');
end $$;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000aa01"}', false);
insert into public.astra_perfiles (user_id, data) values ('00000000-0000-0000-0000-00000000aa01', '{"profile":{"name":"Ana"}}');
do $$ begin
  begin insert into public.astra_perfiles (user_id, data) values ('00000000-0000-0000-0000-00000000bb02', '{}'); raise exception 'FALLO: creó perfil ajeno';
  exception when insufficient_privilege then null; end;
  perform pg_temp.ok('cada quien crea solo su perfil');
end $$;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000bb02"}', false);
do $$ declare n int; begin
  select count(*) into n from public.astra_perfiles; if n <> 0 then raise exception 'FALLO: Bo ve a Ana'; end if;
  update public.astra_perfiles set data = '{"hack":1}' where user_id = '00000000-0000-0000-0000-00000000aa01';
  get diagnostics n = row_count; if n <> 0 then raise exception 'FALLO: Bo editó a Ana'; end if;
  perform pg_temp.ok('nadie ve ni edita el perfil de otro');
end $$;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000aa01"}', false);
do $$ begin
  update public.astra_perfiles set data = '{"profile":{"name":"Ana M"}}', updated_at = now() where user_id = auth.uid();
  if (select data->'profile'->>'name' from public.astra_perfiles) <> 'Ana M' then raise exception 'FALLO: no guardó'; end if;
  begin update public.astra_perfiles set user_id = '00000000-0000-0000-0000-00000000bb02'; raise exception 'FALLO: cambió dueño';
  exception when insufficient_privilege then null; end;
  begin update public.astra_perfiles set data = '[]'; raise exception 'FALLO: aceptó data no objeto';
  exception when check_violation then null; end;
  perform pg_temp.ok('la dueña guarda su perfil y no puede pasarlo a otro');
end $$;
