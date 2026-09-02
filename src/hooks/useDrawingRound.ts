import {
  useEffect,
  useState,
} from "react";
import { supabase } from "../lib/supabase";
import {
  getActiveDrawingSession,
  getDrawingGuesses,
  getDrawingStrokes,
  getDrawingWord,
  getLatestDrawingRound,
} from "../services/drawingService";
import type {
  DrawingGuess,
  DrawingRound,
  DrawingSession,
  DrawingStroke,
  DrawingWord,
} from "../types/game";

export function useDrawingRound(
  roomId: string | undefined,
  language: "en" | "de",
) {
  const [
    session,
    setSession,
  ] =
    useState<DrawingSession | null>(
      null,
    );

  const [
    round,
    setRound,
  ] =
    useState<DrawingRound | null>(
      null,
    );

  const [
    word,
    setWord,
  ] =
    useState<DrawingWord | null>(
      null,
    );

  const [
    strokes,
    setStrokes,
  ] =
    useState<DrawingStroke[]>(
      [],
    );

  const [
    guesses,
    setGuesses,
  ] =
    useState<DrawingGuess[]>(
      [],
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

  /*
   * SESSION
   */
  useEffect(() => {
    if (!roomId) {
      return;
    }

    let active = true;

    const loadSession =
      async () => {
        try {
          const current =
            await getActiveDrawingSession(
              roomId,
            );

          if (!active) {
            return;
          }

          setSession(current);
          setError(null);
          setLoading(false);

          if (!current) {
            setRound(null);
            setWord(null);
            setStrokes([]);
            setGuesses([]);
          }
        } catch (
          caughtError
        ) {
          if (!active) {
            return;
          }

          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Could not load Drawing game.",
          );

          setLoading(false);
        }
      };

    void loadSession();

    const channel =
      supabase
        .channel(
          `drawing-session-${roomId}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "drawing_sessions",
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
   * ROUND
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
            await getLatestDrawingRound(
              session.id,
            );

          if (!active) {
            return;
          }

          setRound(latest);
          setError(null);

          if (!latest) {
            setWord(null);
            setStrokes([]);
            setGuesses([]);
          }
        } catch (
          caughtError
        ) {
          if (!active) {
            return;
          }

          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Could not load Drawing round.",
          );
        }
      };

    void loadRound();

    const channel =
      supabase
        .channel(
          `drawing-rounds-${session.id}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "drawing_rounds",
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
   * WORD + STROKES + GUESSES
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
            currentWord,
            currentStrokes,
            currentGuesses,
          ] =
            await Promise.all([
              getDrawingWord(
                round.wordId,
                language,
              ),

              getDrawingStrokes(
                round.id,
              ),

              getDrawingGuesses(
                round.id,
              ),
            ]);

          if (!active) {
            return;
          }

          setWord(
            currentWord,
          );

          setStrokes(
            currentStrokes,
          );

          setGuesses(
            currentGuesses,
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
              : "Could not update Drawing game.",
          );
        }
      };

    void loadRoundData();

    const strokesChannel =
      supabase
        .channel(
          `drawing-strokes-${round.id}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "drawing_strokes",
            filter:
              `round_id=eq.${round.id}`,
          },
          () => {
            void loadRoundData();
          },
        )
        .subscribe();

    const guessesChannel =
      supabase
        .channel(
          `drawing-guesses-${round.id}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "drawing_guesses",
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
        strokesChannel,
      );

      void supabase.removeChannel(
        guessesChannel,
      );
    };
  }, [
    round?.id,
    round?.wordId,
    language,
  ]);

  return {
    session,
    round,
    word,
    strokes,
    guesses,
    loading,
    error,
  };
}