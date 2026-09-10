import {
  useEffect,
  useState,
} from "react";
import { reportChannelStatus } from "../lib/realtime";
import { supabase } from "../lib/supabase";
import {
  getActiveFriendsSession,
  getLatestFriendsRound,
  getFriendsAnswers,
  getFriendsQuestion,
} from "../services/friendsService";
import type {
  FriendsSession,
} from "../services/friendsService";
import type {
  FriendsAnswer,
  FriendsQuestion,
  FriendsRound,
} from "../types/game";
import { useRealtimeGeneration } from "./useConnection";

export function useFriendsRound(
  roomId: string | undefined,
  language: "en" | "de",
) {
  const generation =
    useRealtimeGeneration();

  const [session, setSession] =
    useState<FriendsSession | null>(
      null,
    );

  const [round, setRound] =
    useState<FriendsRound | null>(
      null,
    );

  const [question, setQuestion] =
    useState<FriendsQuestion | null>(
      null,
    );

  const [answers, setAnswers] =
    useState<FriendsAnswer[]>([]);

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
          await getActiveFriendsSession(
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
            : "Could not load Know Your Friends.",
        );

        setLoading(false);
      }
    };

    void loadSession();

    const channel = supabase
      .channel(
        `friends-sessions-${roomId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "friends_sessions",
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
          await getLatestFriendsRound(
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
            : "Could not load the round.",
        );
      }
    };

    void loadRound();

    const channel = supabase
      .channel(
        `friends-rounds-${lastSessionId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "friends_rounds",
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
    const questionId =
      round.questionId;

    let active = true;

    const loadData = async () => {
      try {
        const [
          loadedQuestion,
          loadedAnswers,
        ] = await Promise.all([
          getFriendsQuestion(
            questionId,
            language,
          ),

          getFriendsAnswers(
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
            : "Could not update Know Your Friends.",
        );
      }
    };

    void loadData();

    const channel = supabase
      .channel(
        `friends-answers-${roundId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "friends_answers",
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
    round?.questionId,
    language,
    generation,
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
