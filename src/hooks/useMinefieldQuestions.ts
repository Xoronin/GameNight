import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export type MinefieldDifficulty =
  | "easy"
  | "medium"
  | "hard";

export type MinefieldLocalizedText = {
  en: string;
  de: string;
};

export type MinefieldQuestion = {
  id: string;

  category: MinefieldLocalizedText;

  question: MinefieldLocalizedText;

  correctAnswers: {
    en: string[];
    de: string[];
  };

  wrongAnswers: {
    en: string[];
    de: string[];
  };

  difficulty: MinefieldDifficulty;
};

type MinefieldQuestionRow = {
  id: string;

  category_en: string;
  category_de: string;

  question_en: string;
  question_de: string;

  correct_answers_en: string[];
  correct_answers_de: string[];

  wrong_answers_en: string[];
  wrong_answers_de: string[];

  difficulty: MinefieldDifficulty;
};

function mapQuestion(
  row: MinefieldQuestionRow,
): MinefieldQuestion {
  return {
    id: row.id,

    category: {
      en: row.category_en,
      de: row.category_de,
    },

    question: {
      en: row.question_en,
      de: row.question_de,
    },

    correctAnswers: {
      en: row.correct_answers_en,
      de: row.correct_answers_de,
    },

    wrongAnswers: {
      en: row.wrong_answers_en,
      de: row.wrong_answers_de,
    },

    difficulty:
      row.difficulty,
  };
}

export function useMinefieldQuestions() {
  const [
    questions,
    setQuestions,
  ] =
    useState<MinefieldQuestion[]>(
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

  useEffect(() => {
    let active = true;

    const loadQuestions =
      async () => {
        try {
          const {
            data,
            error:
              queryError,
          } =
            await supabase
              .from(
                "minefield_questions",
              )
              .select(
                `
                  id,
                  category_en,
                  category_de,
                  question_en,
                  question_de,
                  correct_answers_en,
                  correct_answers_de,
                  wrong_answers_en,
                  wrong_answers_de,
                  difficulty
                `,
              )
              .eq(
                "active",
                true,
              );

          if (queryError) {
            throw new Error(
              `Could not load Minefield questions: ${queryError.message}`,
            );
          }

          if (!active) {
            return;
          }

          setQuestions(
            (
              (data ??
                []) as MinefieldQuestionRow[]
            ).map(
              mapQuestion,
            ),
          );

          setError(null);
        } catch (
          caughtError
        ) {
          if (!active) {
            return;
          }

          setQuestions([]);

          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Could not load Minefield questions.",
          );
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };

    void loadQuestions();

    return () => {
      active = false;
    };
  }, []);

  return {
    questions,
    loading,
    error,
  };
}