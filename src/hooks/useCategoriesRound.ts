import {
  useEffect,
  useState,
} from "react";
import { supabase } from "../lib/supabase";
import {
  getCategoriesAnswers,
  getLatestCategoriesRound,
} from "../services/categoriesService";
import type {
  CategoriesAnswer,
  CategoriesRound,
} from "../types/game";

export function useCategoriesRound(
  roomId?: string,
) {
  const [round, setRound] =
    useState<CategoriesRound | null>(
      null,
    );

  const [answers, setAnswers] =
    useState<CategoriesAnswer[]>([]);

  const [loading, setLoading] =
    useState(Boolean(roomId));

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    let cancelled = false;

    let answersChannel:
      | ReturnType<
          typeof supabase.channel
        >
      | null = null;

    const loadAnswers = async (
      roundId: string,
    ) => {
      try {
        const loadedAnswers =
          await getCategoriesAnswers(
            roundId,
          );

        if (cancelled) {
          return;
        }

        setAnswers(
          loadedAnswers,
        );
      } catch (
        caughtError
      ) {
        if (cancelled) {
          return;
        }

        console.error(
          "Could not load Categories answers:",
          caughtError,
        );
      }
    };

    const subscribeToAnswers = (
      roundId: string,
    ) => {
      if (answersChannel) {
        void supabase.removeChannel(
          answersChannel,
        );
      }

      answersChannel =
        supabase
          .channel(
            `categories-answers:${roundId}`,
          )
          .on(
            "postgres_changes",
            {
              /*
               * IMPORTANT:
               *
               * Validation changes an
               * existing answer, so we
               * must listen for UPDATE
               * as well as INSERT.
               */
              event: "*",
              schema: "public",
              table:
                "categories_answers",
              filter:
                `round_id=eq.${roundId}`,
            },
            () => {
              void loadAnswers(
                roundId,
              );
            },
          )
          .subscribe();
    };

    const loadRound =
      async () => {
        try {
          const loadedRound =
            await getLatestCategoriesRound(
              roomId,
            );

          if (cancelled) {
            return;
          }

          setRound(
            loadedRound,
          );

          if (loadedRound) {
            await loadAnswers(
              loadedRound.id,
            );

            subscribeToAnswers(
              loadedRound.id,
            );
          } else {
            setAnswers([]);
          }

          setError(null);
          setLoading(false);
        } catch (
          caughtError
        ) {
          if (cancelled) {
            return;
          }

          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Could not load Categories round.",
          );

          setLoading(false);
        }
      };

    void loadRound();

    /*
     * Watch for:
     *
     * - newly created rounds
     * - status answering -> reveal
     * - future round-state changes
     */
    const roundChannel =
      supabase
        .channel(
          `categories-rounds:${roomId}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "categories_rounds",
            filter:
              `room_id=eq.${roomId}`,
          },
          () => {
            void loadRound();
          },
        )
        .subscribe();

    return () => {
      cancelled = true;

      void supabase.removeChannel(
        roundChannel,
      );

      if (answersChannel) {
        void supabase.removeChannel(
          answersChannel,
        );
      }
    };
  }, [roomId]);

  return {
    round,
    answers,
    loading,
    error,
  };
}