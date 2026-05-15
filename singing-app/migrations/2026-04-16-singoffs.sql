-- Sing-Off feature: async PvP challenges
-- Run this once in the Supabase SQL editor before testing the feature.

create table if not exists public.sing_offs (
  id              text primary key,                 -- short unguessable id (e.g. 8 chars)
  song_id         text not null,
  challenger_id   uuid not null references auth.users(id) on delete cascade,
  challenger_name text not null,
  challenger_avatar text,
  challenger_color  text,
  challenger_score  int  not null,
  challenger_grade  text,                            -- e.g. 'A', 'B+'
  opponent_id     uuid references auth.users(id) on delete set null,
  opponent_name   text,
  opponent_avatar text,
  opponent_color  text,
  opponent_score  int,
  opponent_grade  text,
  status          text not null default 'pending',  -- 'pending' | 'complete'
  created_at      timestamptz not null default now(),
  completed_at    timestamptz,
  expires_at      timestamptz not null default (now() + interval '7 days')
);

create index if not exists sing_offs_challenger_idx on public.sing_offs (challenger_id, created_at desc);
create index if not exists sing_offs_opponent_idx   on public.sing_offs (opponent_id, completed_at desc);

alter table public.sing_offs enable row level security;

-- Anyone with the link (i.e. the id) can read a sing-off.
-- The id is a 64-bit unguessable token, so this is safe.
drop policy if exists "sing_offs_read_all" on public.sing_offs;
create policy "sing_offs_read_all"
  on public.sing_offs
  for select
  using (true);

-- Only authenticated users can create challenges (and only as themselves).
drop policy if exists "sing_offs_insert_own" on public.sing_offs;
create policy "sing_offs_insert_own"
  on public.sing_offs
  for insert
  to authenticated
  with check (challenger_id = auth.uid());

-- Authenticated users can fill in the opponent half of a pending sing-off,
-- but cannot tamper with the challenger's row, change the song, or rewrite
-- a completed match.
drop policy if exists "sing_offs_accept" on public.sing_offs;
create policy "sing_offs_accept"
  on public.sing_offs
  for update
  to authenticated
  using (status = 'pending' and now() < expires_at)
  with check (
    status = 'complete'
    and opponent_id = auth.uid()
  );

-- Optional: simple cleanup function you can wire to a daily cron later.
-- (Not required for testing.)
-- delete from public.sing_offs where status = 'pending' and now() > expires_at;
