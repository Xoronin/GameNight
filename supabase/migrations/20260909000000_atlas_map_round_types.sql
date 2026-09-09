-- Atlas: allow the two map round types.
--
-- 20260908000000_atlas_game.sql pinned round_type to the five modes
-- that existed then. Adding map_choice and map_place to the app without
-- widening this check meant every attempt to create one of those rounds
-- was rejected by the database:
--
--   new row for relation "atlas_rounds" violates check constraint
--   "atlas_rounds_round_type_check"
--
-- Dropped and recreated rather than edited in place, since the original
-- migration may already have been applied.
--
-- NOTE: adding a value to AtlasRoundType in src/types/game.ts needs a
-- migration like this one, or the new mode will fail the same way.

alter table atlas_rounds
  drop constraint if exists atlas_rounds_round_type_check;

alter table atlas_rounds
  add constraint atlas_rounds_round_type_check
  check (
    round_type in (
      'flag_paint',
      'flag_choice',
      'country_from_flag',
      'capital_choice',
      'capital_match',
      'map_choice',
      'map_place'
    )
  );
