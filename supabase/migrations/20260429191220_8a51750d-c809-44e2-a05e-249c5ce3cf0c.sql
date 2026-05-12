-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles: users can view own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Profiles: users can update own"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Profiles: users can insert own"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Trigger per updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto crea profilo al signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- CLIENTS
create type public.client_level as enum ('Principiante', 'Intermedio', 'Avanzato');

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  goal text not null default '',
  level public.client_level not null default 'Principiante',
  started_at date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clients enable row level security;

create policy "Clients: trainer can view own"
  on public.clients for select
  using (auth.uid() = trainer_id);

create policy "Clients: trainer can insert own"
  on public.clients for insert
  with check (auth.uid() = trainer_id);

create policy "Clients: trainer can update own"
  on public.clients for update
  using (auth.uid() = trainer_id);

create policy "Clients: trainer can delete own"
  on public.clients for delete
  using (auth.uid() = trainer_id);

create trigger clients_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

create index clients_trainer_idx on public.clients(trainer_id);

-- EXERCISES
create type public.muscle_group as enum (
  'Petto','Schiena','Spalle','Bicipiti','Tricipiti','Gambe','Glutei','Core','Cardio'
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid references auth.users(id) on delete cascade, -- null = preset condiviso
  name text not null,
  muscle_group public.muscle_group not null,
  description text,
  created_at timestamptz not null default now()
);

alter table public.exercises enable row level security;

create policy "Exercises: read presets and own"
  on public.exercises for select
  using (trainer_id is null or auth.uid() = trainer_id);

create policy "Exercises: trainer can insert own"
  on public.exercises for insert
  with check (auth.uid() = trainer_id);

create policy "Exercises: trainer can update own"
  on public.exercises for update
  using (auth.uid() = trainer_id);

create policy "Exercises: trainer can delete own"
  on public.exercises for delete
  using (auth.uid() = trainer_id);

create index exercises_trainer_idx on public.exercises(trainer_id);

-- WORKOUT ITEMS
create table public.workout_items (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  position int not null default 0,
  sets int not null default 3,
  reps text not null default '10',
  rest text not null default '60s',
  notes text,
  created_at timestamptz not null default now()
);

alter table public.workout_items enable row level security;

create policy "Workout: trainer can view own clients items"
  on public.workout_items for select
  using (exists (select 1 from public.clients c where c.id = client_id and c.trainer_id = auth.uid()));

create policy "Workout: trainer can insert for own clients"
  on public.workout_items for insert
  with check (exists (select 1 from public.clients c where c.id = client_id and c.trainer_id = auth.uid()));

create policy "Workout: trainer can update own clients items"
  on public.workout_items for update
  using (exists (select 1 from public.clients c where c.id = client_id and c.trainer_id = auth.uid()));

create policy "Workout: trainer can delete own clients items"
  on public.workout_items for delete
  using (exists (select 1 from public.clients c where c.id = client_id and c.trainer_id = auth.uid()));

create index workout_items_client_idx on public.workout_items(client_id);

-- Esercizi preset condivisi
insert into public.exercises (trainer_id, name, muscle_group) values
  (null, 'Panca piana bilanciere', 'Petto'),
  (null, 'Panca inclinata manubri', 'Petto'),
  (null, 'Croci ai cavi', 'Petto'),
  (null, 'Push-up', 'Petto'),
  (null, 'Stacco da terra', 'Schiena'),
  (null, 'Trazioni alla sbarra', 'Schiena'),
  (null, 'Rematore bilanciere', 'Schiena'),
  (null, 'Lat machine presa larga', 'Schiena'),
  (null, 'Military press', 'Spalle'),
  (null, 'Alzate laterali manubri', 'Spalle'),
  (null, 'Alzate frontali', 'Spalle'),
  (null, 'Curl bilanciere', 'Bicipiti'),
  (null, 'Curl manubri alternato', 'Bicipiti'),
  (null, 'Hammer curl', 'Bicipiti'),
  (null, 'Push down ai cavi', 'Tricipiti'),
  (null, 'French press', 'Tricipiti'),
  (null, 'Dip alle parallele', 'Tricipiti'),
  (null, 'Squat bilanciere', 'Gambe'),
  (null, 'Pressa 45°', 'Gambe'),
  (null, 'Leg extension', 'Gambe'),
  (null, 'Leg curl', 'Gambe'),
  (null, 'Affondi manubri', 'Gambe'),
  (null, 'Hip thrust bilanciere', 'Glutei'),
  (null, 'Glute bridge', 'Glutei'),
  (null, 'Stacco rumeno', 'Glutei'),
  (null, 'Plank', 'Core'),
  (null, 'Crunch a terra', 'Core'),
  (null, 'Russian twist', 'Core'),
  (null, 'Tapis roulant', 'Cardio'),
  (null, 'Cyclette', 'Cardio'),
  (null, 'Vogatore', 'Cardio');