-- Rewrites finalize_categories_round with correct, verifiable logic.
--
-- Bug reports suggested only one player was receiving points, and that
-- points from manual (accept/reject) review weren't reliably reflected
-- in scores. Without visibility into the previous function body (it was
-- never tracked in a migration), this replaces it outright rather than
-- trying to patch unknown logic.
--
-- Correct behaviour: for the given round, sum each player's answer
-- points (categories_answers.points already reflects validation/manual
-- review) and add that sum to players.score — once per round, guarded
-- by categories_rounds.scores_applied.

create or replace function finalize_categories_round(p_round_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Idempotency guard: never apply a round's points twice.
  if exists (
    select 1
    from categories_rounds
    where id = p_round_id
      and scores_applied = true
  ) then
    return;
  end if;

  update players p
  set score = p.score + totals.total_points
  from (
    select
      player_id,
      sum(points) as total_points
    from categories_answers
    where round_id = p_round_id
    group by player_id
  ) as totals
  where p.id = totals.player_id;

  update categories_rounds
  set scores_applied = true
  where id = p_round_id;
end;
$$;

grant execute on function finalize_categories_round(uuid)
  to anon, authenticated;
