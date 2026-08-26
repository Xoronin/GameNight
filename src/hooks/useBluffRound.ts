import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  getBluffAnswers,
  getBluffVotes,
  getLatestBluffRound,
} from "../services/bluffService";
import type {
  BluffAnswer,
  BluffRound,
  BluffVote,
} from "../types/game";

export function useBluffRound(
  roomId: string | undefined,
) {
  const [round, setRound] =
    useState<BluffRound | null>(null);

  const [answers, setAnswers] =
    useState<BluffAnswer[]>([]);

  const [votes, setVotes] =
    useState<BluffVote[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    let active = true;

    const loadRound = async () => {
      try {
        const latest =
          await getLatestBluffRound(roomId);

        if (!active) {
          return;
        }

        setRound(latest);
        setError(null);
        setLoading(false);
      } catch (caughtError) {
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

    const channel = supabase
      .channel(`bluff-rounds-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bluff_rounds",
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          void loadRound();
        },
      )
      .subscribe();

    return () => {
      active = false;

      void supabase.removeChannel(channel);
    };
  }, [roomId]);

  useEffect(() => {
    if (!round?.id) {
      return;
    }

    let active = true;

    const loadRoundData = async () => {
      try {
        const [
          latestAnswers,
          latestVotes,
        ] = await Promise.all([
          getBluffAnswers(round.id),
          getBluffVotes(round.id),
        ]);

        if (!active) {
          return;
        }

        setAnswers(latestAnswers);
        setVotes(latestVotes);
      } catch (caughtError) {
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

    const answersChannel = supabase
      .channel(`bluff-answers-${round.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bluff_answers",
          filter: `round_id=eq.${round.id}`,
        },
        () => {
          void loadRoundData();
        },
      )
      .subscribe();

    const votesChannel = supabase
      .channel(`bluff-votes-${round.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bluff_votes",
          filter: `round_id=eq.${round.id}`,
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
    round,
    answers,
    votes,
    loading,
    error,
  };
}