-- Run this in your Supabase SQL editor

create table if not exists workouts (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  type text,
  duration_min int,
  notes text,
  created_at timestamptz default now()
);

create table if not exists measurements (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  weight_kg float,
  body_fat_pct float,
  notes text,
  created_at timestamptz default now()
);

create table if not exists nutrition_logs (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  meal_type text not null check (meal_type in ('breakfast','lunch','dinner','snack')),
  description text not null,
  image_url text,
  estimated_calories int not null,
  estimated_protein_g float not null,
  estimated_carbs_g float not null,
  estimated_fat_g float not null,
  claude_breakdown text not null,
  created_at timestamptz default now()
);

-- Per-exercise set logging (weights, reps)
create table if not exists exercise_logs (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  workout_type text not null check (workout_type in ('gym', 'desk')),
  routine_day text not null,
  exercise_name text not null,
  set_number int not null,
  reps int,
  weight_kg float,
  created_at timestamptz default now()
);

-- Indexes for common queries
create index if not exists nutrition_logs_date_idx on nutrition_logs(date);
create index if not exists workouts_date_idx on workouts(date);
create index if not exists measurements_date_idx on measurements(date);
create index if not exists exercise_logs_date_idx on exercise_logs(date);

-- RLS (allow all — personal app)
alter table workouts enable row level security;
alter table measurements enable row level security;
alter table nutrition_logs enable row level security;
alter table exercise_logs enable row level security;

create policy "allow all" on workouts for all using (true) with check (true);
create policy "allow all" on measurements for all using (true) with check (true);
create policy "allow all" on nutrition_logs for all using (true) with check (true);
create policy "allow all" on exercise_logs for all using (true) with check (true);
