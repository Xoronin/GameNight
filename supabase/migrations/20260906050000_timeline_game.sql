-- Timeline: a shared, growing sequence for one category (chronological
-- dates or a ranked magnitude like followers/population/box office).
-- Players take turns being shown one mystery item and slot it into a
-- gap in the current sequence. Get it right and it joins the board
-- for everyone to build on; get it wrong (or miss the timer) and it's
-- discarded, costing a life — same 3-lives elimination pattern as
-- Minefield and Alphabet.
--
-- Correctness never depends on a vote: every item carries a real
-- sortable value, so placement is checked against actual neighbors.
-- Category content (with real data) ships in a separate migration.

create table if not exists timeline_categories (
  id uuid primary key default gen_random_uuid(),

  name_en text not null,
  name_de text not null,

  -- "timeline" = chronological dates, "ranking" = a ranked magnitude
  -- (followers, population, box office, ...). Purely a display/
  -- grouping hint; placement logic is identical either way.
  category_type text not null default 'timeline'
    check (category_type in ('timeline', 'ranking')),

  unit_en text not null,
  unit_de text not null,

  -- Reading direction for the *display* order left-to-right; the
  -- underlying comparison always sorts ascending by value.
  sort_direction text not null default 'asc'
    check (sort_direction in ('asc', 'desc')),

  active boolean not null default true,

  created_at timestamptz not null default now()
);

create table if not exists timeline_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references timeline_categories(id) on delete cascade,

  name_en text not null,
  name_de text not null,

  value numeric not null,

  value_label_en text not null,
  value_label_de text not null,

  created_at timestamptz not null default now()
);

create index if not exists timeline_items_category_idx
  on timeline_items (category_id);

create table if not exists timeline_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,

  status text not null default 'playing'
    check (status in ('playing', 'finished')),

  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists timeline_rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  session_id uuid not null references timeline_sessions(id) on delete cascade,

  round_number int not null,
  category_id uuid not null references timeline_categories(id),

  status text not null default 'playing'
    check (status in ('playing', 'reveal', 'finished')),

  current_player_id uuid references players(id),
  current_item_id uuid references timeline_items(id),
  turn_ends_at timestamptz,

  used_item_ids uuid[] not null default '{}'::uuid[],
  out_player_ids uuid[] not null default '{}'::uuid[],
  player_lives jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  unique (session_id, round_number)
);

create table if not exists timeline_placements (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references timeline_rounds(id) on delete cascade,
  item_id uuid not null references timeline_items(id),

  -- Null for the seed items placed automatically when the round is
  -- created, so the board starts with some context.
  placed_by uuid references players(id),

  created_at timestamptz not null default now(),

  unique (round_id, item_id)
);

create index if not exists timeline_placements_round_idx
  on timeline_placements (round_id);

alter table timeline_categories enable row level security;
alter table timeline_items enable row level security;
alter table timeline_sessions enable row level security;
alter table timeline_rounds enable row level security;
alter table timeline_placements enable row level security;

create policy "Anyone can read Timeline categories"
  on timeline_categories for select
  using (true);

create policy "Anyone can read Timeline items"
  on timeline_items for select
  using (true);

create policy "Anyone can manage Timeline sessions"
  on timeline_sessions for all
  using (true)
  with check (true);

create policy "Anyone can manage Timeline rounds"
  on timeline_rounds for all
  using (true)
  with check (true);

create policy "Anyone can manage Timeline placements"
  on timeline_placements for all
  using (true)
  with check (true);

alter publication supabase_realtime add table timeline_sessions;
alter publication supabase_realtime add table timeline_rounds;
alter publication supabase_realtime add table timeline_placements;
