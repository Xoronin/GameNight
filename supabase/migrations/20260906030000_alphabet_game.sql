-- Alphabet: a shared A-Z board for one host-chosen topic. Players take
-- turns claiming a letter and typing a word that fits the topic and
-- starts with it; everyone else gets a short window to vote it down.
-- A rejected word (or letting the timer run out on your turn) costs a
-- life — 3 lives per player, same elimination pattern as Minefield: a
-- busted player is skipped in the turn order, and the last player left
-- just keeps playing solo until the alphabet is cleared or they bust
-- too.

create table if not exists alphabet_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,

  status text not null default 'playing'
    check (status in ('playing', 'finished')),

  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists alphabet_rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  session_id uuid not null references alphabet_sessions(id) on delete cascade,

  round_number int not null,
  topic text not null,

  status text not null default 'playing'
    check (status in ('playing', 'reveal', 'finished')),

  current_player_id uuid references players(id),
  turn_ends_at timestamptz,

  out_player_ids uuid[] not null default '{}'::uuid[],
  player_lives jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  unique (session_id, round_number)
);

create table if not exists alphabet_letters (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references alphabet_rounds(id) on delete cascade,

  letter text not null check (char_length(letter) = 1),

  status text not null default 'available'
    check (status in ('available', 'pending', 'valid', 'invalid')),

  claimed_by uuid references players(id),
  word text,

  created_at timestamptz not null default now(),

  unique (round_id, letter)
);

create table if not exists alphabet_votes (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references alphabet_rounds(id) on delete cascade,
  letter_id uuid not null references alphabet_letters(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,

  created_at timestamptz not null default now(),

  unique (letter_id, player_id)
);

create index if not exists alphabet_rounds_session_idx
  on alphabet_rounds (session_id);

create index if not exists alphabet_letters_round_idx
  on alphabet_letters (round_id);

create index if not exists alphabet_votes_round_idx
  on alphabet_votes (round_id);

alter table alphabet_sessions enable row level security;
alter table alphabet_rounds enable row level security;
alter table alphabet_letters enable row level security;
alter table alphabet_votes enable row level security;

create policy "Anyone can manage Alphabet sessions"
  on alphabet_sessions for all
  using (true)
  with check (true);

create policy "Anyone can manage Alphabet rounds"
  on alphabet_rounds for all
  using (true)
  with check (true);

create policy "Anyone can manage Alphabet letters"
  on alphabet_letters for all
  using (true)
  with check (true);

create policy "Anyone can manage Alphabet votes"
  on alphabet_votes for all
  using (true)
  with check (true);

alter publication supabase_realtime add table alphabet_sessions;
alter publication supabase_realtime add table alphabet_rounds;
alter publication supabase_realtime add table alphabet_letters;
alter publication supabase_realtime add table alphabet_votes;

-- Realtime DELETE events (a retracted vote) only carry the primary key
-- in the "old" row image unless replica identity is FULL, so a
-- subscription filtered on round_id would miss retractions — same fix
-- already applied to categories_answer_votes.
alter table alphabet_votes replica identity full;
