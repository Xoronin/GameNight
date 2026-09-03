-- Realtime DELETE events only include the primary key in the "old" row
-- image unless a table's replica identity is FULL — so a client-side
-- subscription filtered on round_id (a non-key column) never matched
-- vote retractions, leaving other players' screens stuck showing a
-- vote that was actually withdrawn.

alter table categories_answer_votes replica identity full;

-- Same bug, same fix: drawing_strokes is deleted by round_id (not by
-- id) when the drawer hits "Clear", so other players never saw the
-- canvas clear in realtime either.

alter table drawing_strokes replica identity full;
