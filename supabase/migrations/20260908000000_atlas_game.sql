-- Atlas game: flags, countries and capitals, with a different kind of
-- task each round.
--
-- Unlike the other games there is no content table. A flag has to be
-- described as geometry (band directions, colours, cross offsets) for
-- the paint round to be able to hand the player empty regions, and that
-- description lives in typed TypeScript in src/data/atlasCountries.ts
-- rather than in JSONB here. The host still writes the generated round
-- into atlas_rounds.payload, so every client renders the same task from
-- the same country ids.

create table if not exists atlas_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,

  status text not null default 'playing'
    check (status in ('playing', 'finished')),

  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists atlas_rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  session_id uuid not null references atlas_sessions(id) on delete cascade,

  round_number int not null,

  round_type text not null
    check (round_type in (
      'flag_paint',
      'flag_choice',
      'country_from_flag',
      'capital_choice',
      'capital_match'
    )),

  -- Country ids and option order for this round. Shape depends on
  -- round_type; see AtlasRoundPayload in src/types/game.ts.
  payload jsonb not null,

  status text not null default 'playing'
    check (status in ('playing', 'reveal', 'finished')),

  created_at timestamptz not null default now(),
  ends_at timestamptz,

  unique (session_id, round_number)
);

create table if not exists atlas_answers (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references atlas_rounds(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,

  -- The player's submission. Shape depends on round_type; see
  -- AtlasResponse in src/types/game.ts.
  response jsonb not null,

  -- Paint and match rounds score partial credit, so the raw tally is
  -- kept alongside the points for the reveal screen.
  correct_count int not null default 0,
  total_count int not null default 1,

  points int not null default 0,

  created_at timestamptz not null default now(),

  unique (round_id, player_id)
);

create index if not exists atlas_rounds_session_idx
  on atlas_rounds (session_id);

create index if not exists atlas_answers_round_idx
  on atlas_answers (round_id);

alter table atlas_sessions enable row level security;
alter table atlas_rounds enable row level security;
alter table atlas_answers enable row level security;

create policy "Anyone can manage Atlas sessions"
  on atlas_sessions for all
  using (true)
  with check (true);

create policy "Anyone can manage Atlas rounds"
  on atlas_rounds for all
  using (true)
  with check (true);

create policy "Anyone can manage Atlas answers"
  on atlas_answers for all
  using (true)
  with check (true);

alter publication supabase_realtime add table atlas_sessions;
alter publication supabase_realtime add table atlas_rounds;
alter publication supabase_realtime add table atlas_answers;
