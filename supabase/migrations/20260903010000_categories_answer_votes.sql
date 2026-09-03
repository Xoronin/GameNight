-- Categories: replace automated word verification with player voting.
--
-- Every answer counts by default as long as it starts with the round's
-- letter (a hard, non-votable rule). Beyond that, validity is decided
-- by the players themselves: anyone but the answer's author can cast a
-- "doesn't count" vote, and once a majority of the room has voted an
-- answer down it stops scoring. Votes can be freely added or withdrawn
-- at any time during reveal, so the outcome always stays editable.

create table if not exists categories_answer_votes (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references categories_rounds(id) on delete cascade,
  answer_id uuid not null references categories_answers(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,

  created_at timestamptz not null default now(),

  unique (answer_id, player_id)
);

create index if not exists categories_answer_votes_round_idx
  on categories_answer_votes (round_id);

alter table categories_answer_votes enable row level security;

create policy "Anyone can manage Categories votes"
  on categories_answer_votes for all
  using (true)
  with check (true);

alter publication supabase_realtime add table categories_answer_votes;
