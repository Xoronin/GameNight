-- Atlas: turn the capital-match round into a turn-based board.
--
-- Instead of every player privately matching four pairs at once, the
-- round now shows one shared board of ten countries and ten capitals.
-- Players take turns placing a single capital; a wrong placement costs
-- a life, and a player is out at zero.
--
-- Kept as a separate migration rather than folded into
-- 20260908000000_atlas_game.sql because that file may already have been
-- applied. Editing an applied migration would leave the database
-- without these columns while the CLI considers it up to date.

alter table atlas_rounds
  add column if not exists current_player_id uuid references players(id),
  add column if not exists turn_ends_at timestamptz,
  add column if not exists out_player_ids uuid[] not null default '{}'::uuid[],
  add column if not exists player_lives jsonb not null default '{}'::jsonb;

create table if not exists atlas_placements (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references atlas_rounds(id) on delete cascade,

  -- Country ids from src/data/atlasCountries.ts, not database rows.
  country_id text not null,
  capital_country_id text not null,

  placed_by uuid not null references players(id),

  is_correct boolean not null,

  created_at timestamptz not null default now()
);

create index if not exists atlas_placements_round_idx
  on atlas_placements (round_id);

/*
 * A country can only be solved once. Wrong attempts are kept for the
 * turn history, so the constraint has to ignore them — hence a partial
 * index rather than a plain unique constraint.
 */
create unique index if not exists atlas_placements_solved_idx
  on atlas_placements (round_id, country_id)
  where is_correct;

alter table atlas_placements enable row level security;

create policy "Anyone can manage Atlas placements"
  on atlas_placements for all
  using (true)
  with check (true);

alter publication supabase_realtime add table atlas_placements;
