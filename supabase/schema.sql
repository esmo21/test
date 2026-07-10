create table if not exists public.boulder_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_date date not null,
  grade_4_completed integer not null default 0 check (grade_4_completed >= 0),
  grade_4_flashed integer not null default 0 check (grade_4_flashed >= 0 and grade_4_flashed <= grade_4_completed),
  grade_5_completed integer not null default 0 check (grade_5_completed >= 0),
  grade_5_flashed integer not null default 0 check (grade_5_flashed >= 0 and grade_5_flashed <= grade_5_completed),
  grade_6_completed integer not null default 0 check (grade_6_completed >= 0),
  grade_6_flashed integer not null default 0 check (grade_6_flashed >= 0 and grade_6_flashed <= grade_6_completed),
  grade_7_completed integer not null default 0 check (grade_7_completed >= 0),
  grade_7_flashed integer not null default 0 check (grade_7_flashed >= 0 and grade_7_flashed <= grade_7_completed),
  grade_8_completed integer not null default 0 check (grade_8_completed >= 0),
  grade_8_flashed integer not null default 0 check (grade_8_flashed >= 0 and grade_8_flashed <= grade_8_completed),
  grade_9_completed integer not null default 0 check (grade_9_completed >= 0),
  grade_9_flashed integer not null default 0 check (grade_9_flashed >= 0 and grade_9_flashed <= grade_9_completed),
  score numeric(10,3) not null default 0 check (score >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
 );

do $$
declare
  constraint_name text;
  constraint_definition text;
begin
  for constraint_name, constraint_definition in
    select con.conname, pg_get_constraintdef(con.oid)
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'boulder_sessions'
      and con.contype = 'c'
  loop
    if (
      constraint_definition like '%> 0%'
      and (
        constraint_definition like '%grade_4_completed%'
        or constraint_definition like '%grade_5_completed%'
        or constraint_definition like '%grade_6_completed%'
        or constraint_definition like '%grade_7_completed%'
        or constraint_definition like '%grade_8_completed%'
        or constraint_definition like '%grade_9_completed%'
        or constraint_definition like '%score%'
      )
    )
    then
      execute format('alter table public.boulder_sessions drop constraint %I', constraint_name);
    end if;
  end loop;
end $$;

alter table public.boulder_sessions enable row level security;

drop policy if exists "Users can select own boulder sessions" on public.boulder_sessions;
create policy "Users can select own boulder sessions" on public.boulder_sessions for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can insert own boulder sessions" on public.boulder_sessions;
create policy "Users can insert own boulder sessions" on public.boulder_sessions for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can update own boulder sessions" on public.boulder_sessions;
create policy "Users can update own boulder sessions" on public.boulder_sessions for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete own boulder sessions" on public.boulder_sessions;
create policy "Users can delete own boulder sessions" on public.boulder_sessions for delete to authenticated using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_boulder_sessions_updated_at on public.boulder_sessions;
create trigger set_boulder_sessions_updated_at before update on public.boulder_sessions for each row execute function public.set_updated_at();
create index if not exists boulder_sessions_user_date_idx on public.boulder_sessions (user_id, session_date desc, created_at desc);
