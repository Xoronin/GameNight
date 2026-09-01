import { supabase } from "../lib/supabase";
import type {
  BluffQuestion,
} from "../types/bluffQuestion";

type BluffQuestionRow = {
  id: string;

  category_en: string;
  category_de: string;

  question_en: string;
  question_de: string;

  answer_en: string;
  answer_de: string;

  difficulty: string;
  is_active: boolean;
};

function mapQuestion(
  row: BluffQuestionRow,
): BluffQuestion {
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

    answer: {
      en: row.answer_en,
      de: row.answer_de,
    },

    difficulty:
      row.difficulty,
  };
}

export async function getBluffQuestions(): Promise<
  BluffQuestion[]
> {
  const {
    data,
    error,
  } = await supabase
    .from("bluff_questions")
    .select("*")
    .eq("is_active", true)
    .order("id", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Could not load Bluff questions: ${error.message}`,
    );
  }

  return (
    data as BluffQuestionRow[]
  ).map(mapQuestion);
}