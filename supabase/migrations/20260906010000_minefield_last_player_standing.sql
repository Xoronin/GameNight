-- Minefield: hitting a mine used to end the round for everyone at once.
-- Now it only knocks that player out of the current round; the board stays
-- live for whoever is left, turns skip eliminated players, and the last
-- player left gets a "last one standing" bonus and keeps playing solo
-- until they clear the board or hit a mine themselves (which then ends
-- the round, since nobody is left to take a turn).

alter table minefield_rounds
  add column if not exists out_player_ids uuid[] not null default '{}'::uuid[];
