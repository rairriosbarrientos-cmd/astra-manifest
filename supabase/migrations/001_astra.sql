-- Astra: respaldo del perfil de cada persona (lecturas, diario, rituales) para usarlo en varios celulares.
-- Una fila por usuario; cada quien solo lee y escribe la suya. La suscripción Plus NO vive aquí
-- (la guarda el webhook de Stripe en Netlify Blobs), así que nadie puede darse Plus editando su fila.
-- Se puede correr más de una vez sin romper nada.

create table if not exists public.astra_perfiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 1048576),
  updated_at timestamptz not null default now()
);
alter table public.astra_perfiles enable row level security;
revoke all on public.astra_perfiles from anon, authenticated;
grant select, insert, update, delete on public.astra_perfiles to authenticated;

drop policy if exists astra_perfiles_ver on public.astra_perfiles;
create policy astra_perfiles_ver on public.astra_perfiles for select to authenticated using (user_id = auth.uid());
drop policy if exists astra_perfiles_crear on public.astra_perfiles;
create policy astra_perfiles_crear on public.astra_perfiles for insert to authenticated with check (user_id = auth.uid());
drop policy if exists astra_perfiles_editar on public.astra_perfiles;
create policy astra_perfiles_editar on public.astra_perfiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists astra_perfiles_borrar on public.astra_perfiles;
create policy astra_perfiles_borrar on public.astra_perfiles for delete to authenticated using (user_id = auth.uid());
