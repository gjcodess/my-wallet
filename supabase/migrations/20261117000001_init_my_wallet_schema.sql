-- My Wallet Finance Tracker Initial Schema Migration
-- Includes profiles, wallets, and activities with Row-Level Security (RLS)

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'Justin Santos',
  initials text not null default 'JS',
  dark_mode boolean not null default false,
  hide_balances boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null,
  name text not null,
  type text not null,
  balance numeric(14,2) not null default 0,
  mark text not null,
  tone text not null default 'blue',
  account text not null default 'Personal',
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, local_id)
);

create index if not exists idx_wallets_user_id on public.wallets(user_id);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null,
  wallet_local_id text not null default '',
  title text not null,
  wallet text not null,
  date_label text not null,
  amount numeric(14,2) not null,
  icon text not null,
  kind text not null,
  occurred_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, local_id)
);

create index if not exists idx_activities_user_id_occurred on public.activities(user_id, occurred_at desc);

alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.activities enable row level security;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.wallets to authenticated;
grant select, insert, update, delete on public.activities to authenticated;

create policy "Users can select own profile"
  on public.profiles for select
  to authenticated
  using ( (select auth.uid()) = id );

create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check ( (select auth.uid()) = id );

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using ( (select auth.uid()) = id )
  with check ( (select auth.uid()) = id );

create policy "Users can delete own profile"
  on public.profiles for delete
  to authenticated
  using ( (select auth.uid()) = id );

create policy "Users can select own wallets"
  on public.wallets for select
  to authenticated
  using ( (select auth.uid()) = user_id );

create policy "Users can insert own wallets"
  on public.wallets for insert
  to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "Users can update own wallets"
  on public.wallets for update
  to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "Users can delete own wallets"
  on public.wallets for delete
  to authenticated
  using ( (select auth.uid()) = user_id );

create policy "Users can select own activities"
  on public.activities for select
  to authenticated
  using ( (select auth.uid()) = user_id );

create policy "Users can insert own activities"
  on public.activities for insert
  to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "Users can update own activities"
  on public.activities for update
  to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "Users can delete own activities"
  on public.activities for delete
  to authenticated
  using ( (select auth.uid()) = user_id );
