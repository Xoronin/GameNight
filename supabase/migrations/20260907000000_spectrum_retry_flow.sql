-- Spectrum: a wrong guess (or a missed timer) used to burn the item
-- and move straight to a brand new one for the next player. Now the
-- same item stays live and passes to the next active player instead
-- — only once every currently active player has had one failed shot
-- at it does it get auto-inserted at its real position, grayed out,
-- with nobody credited.

alter table spectrum_rounds
  add column if not exists attempted_player_ids uuid[] not null default '{}'::uuid[];

-- Distinguishes the three ways an item can end up on the board: a
-- starting seed item (placed automatically when the round began), a
-- player correctly guessing it, or every active player failing it in
-- turn so it gets auto-placed with nobody credited.
alter table spectrum_placements
  add column if not exists outcome text;

update spectrum_placements
  set outcome = case
    when placed_by is null then 'seed'
    else 'correct'
  end
  where outcome is null;

alter table spectrum_placements
  alter column outcome set not null;

alter table spectrum_placements
  alter column outcome set default 'correct';

alter table spectrum_placements
  add constraint spectrum_placements_outcome_check
    check (outcome in ('seed', 'correct', 'failed'));
