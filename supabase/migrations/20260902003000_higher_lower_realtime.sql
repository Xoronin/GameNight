-- Register the Higher / Lower gameplay tables with Supabase Realtime so
-- postgres_changes subscriptions (see useHigherLowerRound) receive
-- INSERT/UPDATE events, matching the other games' tables.

alter publication supabase_realtime add table higher_lower_sessions;
alter publication supabase_realtime add table higher_lower_rounds;
alter publication supabase_realtime add table higher_lower_guesses;
