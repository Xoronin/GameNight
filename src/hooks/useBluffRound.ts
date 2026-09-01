import {
  useEffect,
  useState,
} from "react";
import { supabase } from "../lib/supabase";
import {
  getActiveBluffSession,
  getBluffAnswers,
  getBluffVotes,
  getLatestBluffRound,
} from "../services/bluffService";
import type {
  BluffAnswer,
  BluffRound,
  BluffVote,
} from "../types/game";

import type {
  BluffSessionRow,
} from "../services/bluffService";

export function useBluffRound(
  roomId: string | undefined,
) {
  const [
    session,
    setSession,
  ] =
    useState<BluffSessionRow | null>(
      null,
    );

  const [
    round,
    setRound,
  ] = useState<BluffRound | null>(
    null,
  );

  const [
    answers,
    setAnswers,
  ] = useState<BluffAnswer[]>([]);

  const [
    votes,
    setVotes,
  ] = useState<BluffVote[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(
    Boolean(roomId),
  );

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  /*
   * --------------------------------------------------------------
   * SESSION
   * --------------------------------------------------------------
   *
   * Find the currently active Bluff game
   * for this room.
   */
  useEffect(() => {
    if (!roomId) {
      return;
    }

    let active = true;

    const loadSession =
      async () => {
        try {
          const latestSession =
            await getActiveBluffSession(
              roomId,
            );

          if (!active) {
            return;
          }

          setSession(
            latestSession,
          );

          /*
           * No active session means Bluff
           * has not started yet.
           */
          if (!latestSession) {
            setRound(null);
            setAnswers([]);
            setVotes([]);
          }

          setError(null);
          setLoading(false);
        } catch (
          caughtError
        ) {
          if (!active) {
            return;
          }

          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Could not load Bluff session.",
          );

          setLoading(false);
        }
      };

    void loadSession();

    /*
     * Listen for:
     *
     * - creation of a new Bluff session
     * - session being finished
     * - rematches
     */
    const channel =
      supabase
        .channel(
          `bluff-sessions-${roomId}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "bluff_sessions",
            filter:
              `room_id=eq.${roomId}`,
          },
          () => {
            void loadSession();
          },
        )
        .subscribe();

    return () => {
      active = false;

      void supabase.removeChannel(
        channel,
      );
    };
  }, [roomId]);

  /*
   * --------------------------------------------------------------
   * ROUND
   * --------------------------------------------------------------
   *
   * Load the newest round belonging only
   * to the current Bluff session.
   */
  useEffect(() => {
    if (!session?.id) {
      return;
    }

    let active = true;

    const loadRound =
      async () => {
        try {
          const latest =
            await getLatestBluffRound(
              session.id,
            );

          if (!active) {
            return;
          }

          setRound(
            latest,
          );

          /*
           * Important when a fresh session
           * exists but round 1 hasn't been
           * created yet.
           */
          if (!latest) {
            setAnswers([]);
            setVotes([]);
          }

          setError(null);
          setLoading(false);
        } catch (
          caughtError
        ) {
          if (!active) {
            return;
          }

          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Could not load Bluff round.",
          );

          setLoading(false);
        }
      };

    void loadRound();

    const channel =
      supabase
        .channel(
          `bluff-rounds-${session.id}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "bluff_rounds",
            filter:
              `session_id=eq.${session.id}`,
          },
          () => {
            void loadRound();
          },
        )
        .subscribe();

    return () => {
      active = false;

      void supabase.removeChannel(
        channel,
      );
    };
  }, [session?.id]);

  /*
   * --------------------------------------------------------------
   * ANSWERS + VOTES
   * --------------------------------------------------------------
   */
  useEffect(() => {
    if (!round?.id) {
      return;
    }

    let active = true;

    const loadRoundData =
      async () => {
        try {
          const [
            latestAnswers,
            latestVotes,
          ] =
            await Promise.all([
              getBluffAnswers(
                round.id,
              ),

              getBluffVotes(
                round.id,
              ),
            ]);

          if (!active) {
            return;
          }

          setAnswers(
            latestAnswers,
          );

          setVotes(
            latestVotes,
          );

          setError(null);
        } catch (
          caughtError
        ) {
          if (!active) {
            return;
          }

          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Could not update Bluff.",
          );
        }
      };

    void loadRoundData();

    const answersChannel =
      supabase
        .channel(
          `bluff-answers-${round.id}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "bluff_answers",
            filter:
              `round_id=eq.${round.id}`,
          },
          () => {
            void loadRoundData();
          },
        )
        .subscribe();

    const votesChannel =
      supabase
        .channel(
          `bluff-votes-${round.id}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "bluff_votes",
            filter:
              `round_id=eq.${round.id}`,
          },
          () => {
            void loadRoundData();
          },
        )
        .subscribe();

    return () => {
      active = false;

      void supabase.removeChannel(
        answersChannel,
      );

      void supabase.removeChannel(
        votesChannel,
      );
    };
  }, [round?.id]);

  return {
    session,
    round,
    answers,
    votes,
    loading,
    error,
  };
}