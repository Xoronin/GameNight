import { useEffect, useState } from "react";
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
  roomId: string | undefined,
) {
  const [round, setRound] =
    useState<CategoriesRound | null>(null);

  const [answers, setAnswers] =
    useState<CategoriesAnswer[]>([]);

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
          await getLatestCategoriesRound(
            roomId,
          );

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
            : "Could not load Categories.",
        );

        setLoading(false);
      }
    };

    void loadRound();

    const channel = supabase
      .channel(
        `categories-rounds-${roomId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "categories_rounds",
          filter: `room_id=eq.${roomId}`,
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
  }, [roomId]);

  useEffect(() => {
    if (!round?.id) {
      return;
    }

    let active = true;

    const loadAnswers = async () => {
      try {
        const latest =
          await getCategoriesAnswers(
            round.id,
          );

        if (active) {
          setAnswers(latest);
        }
      } catch (caughtError) {
        if (!active) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not update answers.",
        );
      }
    };

    void loadAnswers();

    const channel = supabase
      .channel(
        `categories-answers-${round.id}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "categories_answers",
          filter: `round_id=eq.${round.id}`,
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
    round,
    answers,
    loading,
    error,
  };
}