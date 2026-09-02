-- Per-room, per-game timer settings, plus the round-deadline columns
-- each game needs to enforce them.

alter table rooms
  add column if not exists game_settings jsonb not null default '{}'::jsonb;

alter table bluff_rounds
  add column if not exists ends_at timestamptz;

alter table categories_rounds
  add column if not exists ends_at timestamptz;

alter table higher_lower_rounds
  add column if not exists ends_at timestamptz;

alter table minefield_rounds
  add column if not exists turn_ends_at timestamptz;
