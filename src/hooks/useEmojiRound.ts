import {
  useEffect,
  useState,
} from "react";
import { reportChannelStatus } from "../lib/realtime";
import { supabase } from "../lib/supabase";
import {
  getActiveEmojiSession,
  getLatestEmojiRound,
  getEmojiGuesses,
  getEmojiPuzzle,
} from "../services/emojiService";
import type {
  EmojiSession,
} from "../services/emojiService";
import type {
  EmojiGuess,
  EmojiPuzzle,
  EmojiRound,
} from "../types/game";
import { useRealtimeGeneration } from "./useConnection";

export function useEmojiRound(
  roomId: string | undefined,
  language: "en" | "de",
) {
  const generation =
    useRealtimeGeneration();

  const [session, setSession] =
    useState<EmojiSession | null>(
      null,
    );

  const [round, setRound] =
    useState<EmojiRound | null>(
      null,
    );

  const [puzzle, setPuzzle] =
    useState<EmojiPuzzle | null>(
      null,
    );

  const [guesses, setGuesses] =
    useState<EmojiGuess[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  /*
   * Last non-null session id, never
   * reset back to undefined. See the
   * round-loading effect below for why.
   * Adjusted directly during render
   * (React's recommended pattern for
   * deriving state from a prop/state
   * change) rather than in an effect,
   * so it's ready before that effect
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
          await getActiveEmojiSession(
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
            : "Could not load Emoji Decode.",
        );

        setLoading(false);
      }
    };

    void loadSession();

    const channel = supabase
      .channel(
        `emoji-sessions-${roomId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "emoji_sessions",
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
   * Keyed on the last non-null session
   * id (state, not session?.id itself):
   * finishing a game writes the round to
   * "finished" and then, moments later,
   * the session to "finished" too. If this
   * effect tore down on that second write,
   * it could discard an in-flight fetch
   * still resolving the round's final
   * status. Staying subscribed to the same
   * id until a genuinely different session
   * (a rematch) appears avoids that race.
   */
  useEffect(() => {
    if (!lastSessionId) {
      return;
    }

    let active = true;

    const loadRound = async () => {
      try {
        const latest =
          await getLatestEmojiRound(
            lastSessionId,
          );

        if (!active) {
          return;
        }

        setRound(latest);

        if (!latest) {
          setPuzzle(null);
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
            : "Could not load the Emoji round.",
        );
      }
    };

    void loadRound();

    const channel = supabase
      .channel(
        `emoji-rounds-${lastSessionId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "emoji_rounds",
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
    const puzzleId =
      round.puzzleId;

    let active = true;

    const loadData = async () => {
      try {
        const [
          loadedPuzzle,
          loadedGuesses,
        ] = await Promise.all([
          getEmojiPuzzle(
            puzzleId,
            language,
          ),

          getEmojiGuesses(
            roundId,
          ),
        ]);

        if (!active) {
          return;
        }

        setPuzzle(
          loadedPuzzle,
        );

        setGuesses(
          loadedGuesses,
        );

        setError(null);
      } catch (caughtError) {
        if (!active) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not update Emoji Decode.",
        );
      }
    };

    void loadData();

    const channel = supabase
      .channel(
        `emoji-guesses-${roundId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "emoji_guesses",
          filter:
            `round_id=eq.${roundId}`,
        },
        () => {
          void loadData();
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
  }, [
    round?.id,
    round?.puzzleId,
    language,
    generation,
  ]);

  return {
    session,
    round,
    puzzle,
    guesses,
    loading,
    error,
  };
}
