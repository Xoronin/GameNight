import {
  useEffect,
  useState,
} from "react";
import { supabase } from "../lib/supabase";
import {
  getActiveMinefieldSession,
  getLatestMinefieldRound,
  getMinefieldQuestion,
  getMinefieldTiles,
} from "../services/minefieldService";
import type {
  MinefieldSession,
} from "../services/minefieldService";
import type {
  MinefieldQuestion,
  MinefieldRound,
  MinefieldTile,
} from "../types/game";

export function useMinefieldRound(
  roomId: string | undefined,
  language: "en" | "de",
) {
  const [
    round,
    setRound,
  ] =
    useState<MinefieldRound | null>(
      null,
    );

  const [
    question,
    setQuestion,
  ] =
    useState<MinefieldQuestion | null>(
      null,
    );

  const [
    tiles,
    setTiles,
  ] =
    useState<MinefieldTile[]>(
      [],
    );

   const [
    session,
    setSession,
    ] =
    useState<MinefieldSession | null>(
        null,
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  useEffect(() => {
  if (!roomId) {
    return;
  }

  let active = true;

  const loadSession =
    async () => {
      try {
        const latest =
          await getActiveMinefieldSession(
            roomId,
          );

        if (!active) {
          return;
        }

        setSession(latest);

        if (!latest) {
          setRound(null);
          setQuestion(null);
          setTiles([]);
        }

        setError(null);
        setLoading(false);
      } catch (caughtError) {
        if (!active) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not load Minefield.",
        );

        setLoading(false);
      }
    };

  void loadSession();

  const channel =
    supabase
      .channel(
        `minefield-sessions-${roomId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "minefield_sessions",
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
    if (!round?.id) {
      return;
    }

    let active = true;

    const loadData =
      async () => {
        try {
          const [
            loadedQuestion,
            loadedTiles,
          ] =
            await Promise.all([
              getMinefieldQuestion(
                round.questionId,
                language,
              ),

              getMinefieldTiles(
                round.id,
              ),
            ]);

          if (!active) {
            return;
          }

          setQuestion(
            loadedQuestion,
          );

          setTiles(
            loadedTiles,
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
              : "Could not update Minefield.",
          );
        }
      };

    void loadData();

    const channel =
      supabase
        .channel(
          `minefield-tiles-${round.id}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema:
              "public",
            table:
              "minefield_tiles",
            filter:
              `round_id=eq.${round.id}`,
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
    round?.questionId,
    language,
  ]);

  useEffect(() => {
  if (!session?.id) {
    return;
  }

  let active = true;

  const loadRound =
    async () => {
      try {
        const latest =
          await getLatestMinefieldRound(
            session.id,
          );

        if (!active) {
          return;
        }

        setRound(latest);

        if (!latest) {
          setQuestion(null);
          setTiles([]);
        }

        setError(null);
      } catch (caughtError) {
        if (!active) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not load Minefield round.",
        );
      }
    };

  void loadRound();

  const channel =
    supabase
      .channel(
        `minefield-rounds-${session.id}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "minefield_rounds",
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
    return {
    session,
    round,
    question,
    tiles,
    loading,
    error,
    };
}