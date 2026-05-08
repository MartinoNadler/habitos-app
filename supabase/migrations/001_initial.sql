-- Hábitos
create table habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  nombre text not null,
  emoji text not null,
  categoria text not null check (categoria in ('salud','estudio','sueño','otro')),
  esfuerzo text not null check (esfuerzo in ('facil','moderado','dificil')),
  frecuencia text not null check (frecuencia in ('diario','semanal')),
  meta_semanal int default 1,
  campo_extra text check (campo_extra in ('minutos','horas','vasos','paginas','nota','ninguno')),
  activo boolean default true,
  creado_en timestamptz default now()
);

-- Registros diarios
create table records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  habit_id uuid references habits(id) on delete cascade not null,
  fecha date not null,
  valor numeric,
  nota text,
  pts int not null default 0,
  created_at timestamptz default now(),
  unique(habit_id, fecha)
);

-- Estado del usuario
create table user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  puntos int default 0,
  streak int default 0,
  best_streak int default 0,
  last_active_date date,
  updated_at timestamptz default now()
);

-- Recompensas
create table rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  nombre text not null,
  emoji text not null,
  costo int not null,
  descripcion text,
  creado_en timestamptz default now()
);

-- Historial de canjes
create table redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  reward_id uuid references rewards(id) on delete set null,
  nombre text not null,
  emoji text not null,
  pts int not null,
  fecha date not null default current_date,
  created_at timestamptz default now()
);

-- Insignias desbloqueadas
create table user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  badge_id text not null,
  desbloqueada_en timestamptz default now(),
  unique(user_id, badge_id)
);

-- RLS activado en todas las tablas
alter table habits enable row level security;
alter table records enable row level security;
alter table user_state enable row level security;
alter table rewards enable row level security;
alter table redemptions enable row level security;
alter table user_badges enable row level security;

-- Políticas RLS separadas por operación para habits
create policy "habits_select" on habits for select using (auth.uid() = user_id);
create policy "habits_insert" on habits for insert with check (auth.uid() = user_id);
create policy "habits_update" on habits for update using (auth.uid() = user_id);
create policy "habits_delete" on habits for delete using (auth.uid() = user_id);

-- Políticas RLS separadas por operación para records
create policy "records_select" on records for select using (auth.uid() = user_id);
create policy "records_insert" on records for insert with check (auth.uid() = user_id);
create policy "records_update" on records for update using (auth.uid() = user_id);
create policy "records_delete" on records for delete using (auth.uid() = user_id);

-- Políticas RLS separadas por operación para user_state
create policy "user_state_select" on user_state for select using (auth.uid() = user_id);
create policy "user_state_insert" on user_state for insert with check (auth.uid() = user_id);
create policy "user_state_update" on user_state for update using (auth.uid() = user_id);
create policy "user_state_delete" on user_state for delete using (auth.uid() = user_id);

-- Políticas RLS separadas por operación para rewards
create policy "rewards_select" on rewards for select using (auth.uid() = user_id);
create policy "rewards_insert" on rewards for insert with check (auth.uid() = user_id);
create policy "rewards_update" on rewards for update using (auth.uid() = user_id);
create policy "rewards_delete" on rewards for delete using (auth.uid() = user_id);

-- Políticas RLS separadas por operación para redemptions
create policy "redemptions_select" on redemptions for select using (auth.uid() = user_id);
create policy "redemptions_insert" on redemptions for insert with check (auth.uid() = user_id);
create policy "redemptions_update" on redemptions for update using (auth.uid() = user_id);
create policy "redemptions_delete" on redemptions for delete using (auth.uid() = user_id);

-- Políticas RLS separadas por operación para user_badges
create policy "user_badges_select" on user_badges for select using (auth.uid() = user_id);
create policy "user_badges_insert" on user_badges for insert with check (auth.uid() = user_id);
create policy "user_badges_update" on user_badges for update using (auth.uid() = user_id);
create policy "user_badges_delete" on user_badges for delete using (auth.uid() = user_id);

-- Trigger: crear user_state automáticamente al registrarse
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.user_state (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Permisos para los roles de Supabase
grant all on public.habits      to authenticated, service_role;
grant all on public.records     to authenticated, service_role;
grant all on public.user_state  to authenticated, service_role;
grant all on public.rewards     to authenticated, service_role;
grant all on public.redemptions to authenticated, service_role;
grant all on public.user_badges to authenticated, service_role;
