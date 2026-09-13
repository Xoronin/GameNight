import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { reportChannelStatus } from "../lib/realtime";
import { supabase } from "../lib/supabase";
import {
  getActiveScaleSession,
  getLatestScaleRound,
  getScaleGuesses,
  getScaleObjects,
} from "../services/scaleService";
import type { ScaleSession } from "../services/scaleService";
import type {
  ScaleGuess,
  ScaleObject,
  ScaleRound,
} from "../types/game";
import { useRealtimeGeneration } from "./useConnection";

export function useScaleRound(
  roomId: string | undefined,
) {
  const generation =
    useRealtimeGeneration();

  const [session, setSession] =
    useState<ScaleSession | null>(
      null,
    );

  const [round, setRound] =
    useState<ScaleRound | null>(null);

  /* Static content, loaded once and reused every round. */
  const [objects, setObjects] =
    useState<ScaleObject[]>([]);

  const [guesses, setGuesses] =
    useState<ScaleGuess[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [
    lastSessionId,
    setLastSessionId,
  ] = useState<
    string | undefined
  >(undefined);

  if (
    session?.id &&
    session.id !== lastSessionId
  ) {
    setLastSessionId(session.id);
  }

  useEffect(() => {
    let active = true;

    const loadObjects = async () => {
      try {
        const all =
          await getScaleObjects();

        if (active) {
          setObjects(all);
        }
      } catch (caughtError) {
        if (active) {
          setError(
            caughtError instanceof
              Error
              ? caughtError.message
              : "Could not load the objects.",
          );
        }
      }
    };

    void loadObjects();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    let active = true;

    const loadSession = async () => {
      try {
        const latest =
          await getActiveScaleSession(
            roomId,
          );

        if (!active) {
          return;
        }

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
            : "Could not load Scale.",
        );

        setLoading(false);
      }
    };

    void loadSession();

    const channel = supabase
      .channel(
        `scale-sessions-${roomId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "scale_sessions",
          filter:
            `room_id=eq.${roomId}`,
        },
        () => {
          void loadSession();
        },
      )
      .subscribe(
        reportChannelStatus,
      );

    return () => {
      active = false;

      void supabase.removeChannel(
        channel,
      );
    };
  }, [roomId, generation]);

  /*
   * Keyed on the last non-null session id rather than session?.id, so
   * finishing a game cannot tear this down mid-fetch and lose the round's
   * final status. Same reasoning as the other games' hooks.
   */
  useEffect(() => {
    if (!lastSessionId) {
      return;
    }

    let active = true;

    const loadRound = async () => {
      try {
        const latest =
          await getLatestScaleRound(
            lastSessionId,
          );

        if (!active) {
          return;
        }

        setRound(latest);

        if (!latest) {
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
            : "Could not load the round.",
        );
      }
    };

    void loadRound();

    const channel = supabase
      .channel(
        `scale-rounds-${lastSessionId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "scale_rounds",
          filter:
            `session_id=eq.${lastSessionId}`,
        },
        () => {
          void loadRound();
        },
      )
      .subscribe(
        reportChannelStatus,
      );

    return () => {
      active = false;

      void supabase.removeChannel(
        channel,
      );
    };
  }, [lastSessionId, generation]);

  useEffect(() => {
    if (!round?.id) {
      return;
    }

    const roundId = round.id;

    let active = true;

    const loadGuesses = async () => {
      try {
        const all =
          await getScaleGuesses(
            roundId,
          );

        if (active) {
          setGuesses(all);
        }
      } catch (caughtError) {
        if (active) {
          setError(
            caughtError instanceof
              Error
              ? caughtError.message
              : "Could not load the guesses.",
          );
        }
      }
    };

    void loadGuesses();

    const channel = supabase
      .channel(
        `scale-guesses-${roundId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "scale_guesses",
          filter:
            `round_id=eq.${roundId}`,
        },
        () => {
          void loadGuesses();
        },
      )
      .subscribe(
        reportChannelStatus,
      );

    return () => {
      active = false;

      void supabase.removeChannel(
        channel,
      );
    };
  }, [round?.id, generation]);

  const objectsById = useMemo(
    () =>
      new Map(
        objects.map((object) => [
          object.id,
          object,
        ]),
      ),
    [objects],
  );

  const reference = round
    ? (objectsById.get(
        round.referenceId,
      ) ?? null)
    : null;

  const mystery = round
    ? (objectsById.get(
        round.mysteryId,
      ) ?? null)
    : null;

  /*
   * Guesses belonging to the round on screen. The fetch lands a beat
   * after the round does, and last round's results under this round's
   * objects would read as this round's.
   */
  const roundGuesses =
    round &&
    guesses.every(
      (guess) =>
        guess.roundId === round.id,
    )
      ? guesses
      : [];

  return {
    session,
    round,
    objects,
    reference,
    mystery,
    guesses: roundGuesses,
    loading,
    error,
  };
}
