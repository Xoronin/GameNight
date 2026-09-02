import {
  useEffect,
  useState,
} from "react";
import { supabase } from "../lib/supabase";
import {
  getActiveTriviaSession,
  getLatestTriviaRound,
  getTriviaAnswers,
  getTriviaQuestion,
} from "../services/triviaService";
import type {
  TriviaSession,
} from "../services/triviaService";
import type {
  TriviaAnswer,
  TriviaQuestion,
  TriviaRound,
} from "../types/game";

export function useTriviaRound(
  roomId: string | undefined,
  language: "en" | "de",
) {
  const [session, setSession] =
    useState<TriviaSession | null>(
      null,
    );

  const [round, setRound] =
    useState<TriviaRound | null>(
      null,
    );

  const [question, setQuestion] =
    useState<TriviaQuestion | null>(
      null,
    );

  const [answers, setAnswers] =
    useState<TriviaAnswer[]>([]);

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
          await getActiveTriviaSession(
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
            : "Could not load Trivia.",
        );

        setLoading(false);
      }
    };

    void loadSession();

    const channel = supabase
      .channel(
        `trivia-sessions-${roomId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "trivia_sessions",
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
          await getLatestTriviaRound(
            lastSessionId,
          );

        if (!active) {
          return;
        }

        setRound(latest);

        if (!latest) {
          setQuestion(null);
          setAnswers([]);
        }

        setError(null);
      } catch (caughtError) {
        if (!active) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not load Trivia round.",
        );
      }
    };

    void loadRound();

    const channel = supabase
      .channel(
        `trivia-rounds-${lastSessionId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "trivia_rounds",
          filter:
            `session_id=eq.${lastSessionId}`,
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
    const questionId =
      round.questionId;

    let active = true;

    const loadData = async () => {
      try {
        const [
          loadedQuestion,
          loadedAnswers,
        ] = await Promise.all([
          getTriviaQuestion(
            questionId,
            language,
          ),

          getTriviaAnswers(
            roundId,
          ),
        ]);

        if (!active) {
          return;
        }

        setQuestion(
          loadedQuestion,
        );

        setAnswers(
          loadedAnswers,
        );

        setError(null);
      } catch (caughtError) {
        if (!active) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not update Trivia.",
        );
      }
    };

    void loadData();

    const channel = supabase
      .channel(
        `trivia-answers-${roundId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "trivia_answers",
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
    round?.questionId,
    language,
  ]);

  return {
    session,
    round,
    question,
    answers,
    loading,
    error,
  };
}
