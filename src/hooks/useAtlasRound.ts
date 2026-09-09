import {
  useEffect,
  useState,
} from "react";
import { supabase } from "../lib/supabase";
import {
  getActiveAtlasSession,
  getAtlasAnswers,
  getAtlasPlacements,
  getLatestAtlasRound,
} from "../services/atlasService";
import type { AtlasSession } from "../services/atlasService";
import type {
  AtlasAnswer,
  AtlasPlacement,
  AtlasRound,
} from "../types/game";

export function useAtlasRound(
  roomId: string | undefined,
) {
  const [session, setSession] =
    useState<AtlasSession | null>(
      null,
    );

  const [round, setRound] =
    useState<AtlasRound | null>(
      null,
    );

  const [answers, setAnswers] =
    useState<AtlasAnswer[]>([]);

  const [
    placements,
    setPlacements,
  ] = useState<AtlasPlacement[]>(
    [],
  );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  /*
   * Last non-null session id, never reset back to undefined — see the
   * round effect below. Adjusted during render (React's pattern for
   * deriving state from a change) so it is ready before that effect
   * runs on this same render.
   */
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
    if (!roomId) {
      return;
    }

    let active = true;

    const loadSession = async () => {
      try {
        const latest =
          await getActiveAtlasSession(
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
            : "Could not load Atlas.",
        );

        setLoading(false);
      }
    };

    void loadSession();

    const channel = supabase
      .channel(
        `atlas-sessions-${roomId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "atlas_sessions",
          filter: `room_id=eq.${roomId}`,
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
   * Keyed on the last non-null session id rather than session?.id:
   * finishing a game writes the round to "finished" and then, moments
   * later, the session too. Tearing down on that second write could
   * discard an in-flight fetch still resolving the round's final
   * status. Staying subscribed until a genuinely different session (a
   * rematch) appears avoids that race.
   */
  useEffect(() => {
    if (!lastSessionId) {
      return;
    }

    let active = true;

    const loadRound = async () => {
      try {
        const latest =
          await getLatestAtlasRound(
            lastSessionId,
          );

        if (!active) {
          return;
        }

        setRound(latest);

        if (!latest) {
          setAnswers([]);
          setPlacements([]);
        }

        setError(null);
      } catch (caughtError) {
        if (!active) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not load Atlas round.",
        );
      }
    };

    void loadRound();

    const channel = supabase
      .channel(
        `atlas-rounds-${lastSessionId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "atlas_rounds",
          filter: `session_id=eq.${lastSessionId}`,
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
  }, [lastSessionId]);

  useEffect(() => {
    if (!round?.id) {
      return;
    }

    const roundId = round.id;

    let active = true;

    const loadAnswers = async () => {
      try {
        const [
          loadedAnswers,
          loadedPlacements,
        ] = await Promise.all([
          getAtlasAnswers(roundId),
          getAtlasPlacements(
            roundId,
          ),
        ]);

        if (!active) {
          return;
        }

        setAnswers(loadedAnswers);
        setPlacements(
          loadedPlacements,
        );
        setError(null);
      } catch (caughtError) {
        if (!active) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not update Atlas.",
        );
      }
    };

    void loadAnswers();

    const channel = supabase
      .channel(
        `atlas-answers-${roundId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "atlas_answers",
          filter: `round_id=eq.${roundId}`,
        },
        () => {
          void loadAnswers();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "atlas_placements",
          filter: `round_id=eq.${roundId}`,
        },
        () => {
          void loadAnswers();
        },
      )
      .subscribe();

    return () => {
      active = false;

      void supabase.removeChannel(
        channel,
      );
    };
  }, [round?.id]);

  return {
    session,
    round,
    answers,
    placements,
    loading,
    error,
  };
}
