-- Tournament mode: play a host-picked set of games in a randomized
-- order in the same room, with players.score naturally accumulating
-- the running total across all of them (no separate scoring table
-- needed — every game already adds to players.score).

alter table rooms
  add column if not exists tournament_games jsonb,
  add column if not exists tournament_index integer not null default 0;
