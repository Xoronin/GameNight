import {
  useEffect,
  useState,
} from "react";
import { supabase } from "../lib/supabase";
import {
  getActiveHigherLowerSession,
  getHigherLowerGuesses,
  getHigherLowerRoundItems,
  getLatestHigherLowerRound,
} from "../services/higherLowerService";
import type {
  HigherLowerSession,
} from "../services/higherLowerService";
import type {
  HigherLowerGuess,
  HigherLowerItem,
  HigherLowerRound,
} from "../types/game";

export function useHigherLowerRound(
  roomId: string | undefined,
  language: "en" | "de",
) {
  const [session, setSession] =
    useState<HigherLowerSession | null>(
      null,
    );

  const [round, setRound] =
    useState<HigherLowerRound | null>(
      null,
    );

  const [currentItem, setCurrentItem] =
    useState<HigherLowerItem | null>(
      null,
    );

  const [nextItem, setNextItem] =
    useState<HigherLowerItem | null>(
      null,
    );

  const [guesses, setGuesses] =
    useState<HigherLowerGuess[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    let active = true;

    const loadSession = async () => {
      try {
        const latest =
          await getActiveHigherLowerSession(
            roomId,
          );

        if (!active) {
          return;
        }

        /*
         * Deliberately don't clear round /
         * item state when there's no active
         * session: a finished session's last
         * round (status "finished") must stay
         * visible so the game-complete screen
         * doesn't flash back to the start
         * screen. The round-loading effect
         * below resets everything once a new
         * session's first round is fetched.
         */
        setSession(latest);

        setError(null);
        setLoading(false);
      } catch (caughtError) {
        if (!active) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not load Higher / Lower.",
        );

        setLoading(false);
      }
    };

    void loadSession();

    const channel = supabase
      .channel(
        `higher-lower-sessions-${roomId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "higher_lower_sessions",
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

  useEffect(() => {
    if (!session?.id) {
      return;
    }

    let active = true;

    const loadRound = async () => {
      try {
        const latest =
          await getLatestHigherLowerRound(
            session.id,
          );

        if (!active) {
          return;
        }

        setRound(latest);

        if (!latest) {
          setCurrentItem(null);
          setNextItem(null);
          setGuesses([]);
        }

        setError(null);
      } catch (caughtError) {
        if (!active) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not load Higher / Lower round.",
        );
      }
    };

    void loadRound();

    const channel = supabase
      .channel(
        `higher-lower-rounds-${session.id}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "higher_lower_rounds",
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

  useEffect(() => {
    if (
      !round?.id ||
      !round.currentItemId ||
      !round.nextItemId
    ) {
      return;
    }

    const roundId = round.id;
    const currentItemId =
      round.currentItemId;
    const nextItemId =
      round.nextItemId;

    let active = true;

    const loadData = async () => {
      try {
        const [
          items,
          loadedGuesses,
        ] = await Promise.all([
          getHigherLowerRoundItems(
            currentItemId,
            nextItemId,
            language,
          ),

          getHigherLowerGuesses(
            roundId,
          ),
        ]);

        if (!active) {
          return;
        }

        setCurrentItem(
          items.currentItem,
        );

        setNextItem(
          items.nextItem,
        );

        setGuesses(loadedGuesses);

        setError(null);
      } catch (caughtError) {
        if (!active) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not update Higher / Lower.",
        );
      }
    };

    void loadData();

    const channel = supabase
      .channel(
        `higher-lower-guesses-${roundId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "higher_lower_guesses",
          filter:
            `round_id=eq.${roundId}`,
        },
        () => {
          void loadData();
        },
      )
      .subscribe();

    return () => {
      active = false;

      void supabase.removeChannel(
        channel,
      );
    };
  }, [
    round?.id,
    round?.currentItemId,
    round?.nextItemId,
    language,
  ]);

  return {
    session,
    round,
    currentItem,
    nextItem,
    guesses,
    loading,
    error,
  };
}
