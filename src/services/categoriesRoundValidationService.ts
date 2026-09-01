import { supabase } from "../lib/supabase";
import {
  validateCategoryAnswer,
} from "./categoryValidationService";
import type {
  CategoriesAnswer,
} from "../types/game";

type GameLanguage =
  | "en"
  | "de";

function normalizeAnswer(
  value: string,
) {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, " ");
}

function getDuplicateCount(
  answer: CategoriesAnswer,
  answers: CategoriesAnswer[],
) {
  const normalized =
    normalizeAnswer(
      answer.answer,
    );

  return answers.filter(
    (other) =>
      other.categoryKey ===
        answer.categoryKey &&
      normalizeAnswer(
        other.answer,
      ) === normalized,
  ).length;
}

function sleep(ms: number) {
  return new Promise<void>(
    (resolve) => {
      window.setTimeout(
        resolve,
        ms,
      );
    },
  );
}

export async function validateCategoriesRound(
  answers: CategoriesAnswer[],
  letter: string,
  language: GameLanguage,
) {
  /*
   * Validate sequentially.
   *
   * This is intentional because City
   * validation uses Nominatim and we
   * don't want multiple simultaneous
   * geographic requests.
   */
  for (
    let index = 0;
    index < answers.length;
    index++
  ) {
    const answer =
      answers[index];

    /*
     * Don't validate something twice.
     */
    if (
      answer.validationStatus
    ) {
      continue;
    }

    const result =
        await validateCategoryAnswer({
            category:
            answer.categoryKey,
            letter,
            answer:
            answer.answer,
            language,
        });

        console.log(
        "Validation result:",
        {
            answer: answer.answer,
            category: answer.categoryKey,
            result,
        },
    );

    let points = 0;

    if (
      result.status ===
      "valid"
    ) {
      const duplicates =
        getDuplicateCount(
          answer,
          answers,
        );

      points =
        duplicates > 1
          ? 5
          : 10;
    }

    const {
        data: updatedAnswer,
        error,
        } = await supabase
        .from("categories_answers")
        .update({
            validation_status:
            result.status,
            validation_source:
            result.source,
            validation_reason:
            result.reason,
            points,
        })
        .eq("id", answer.id)
        .select(
            "id, validation_status, validation_source, validation_reason, points",
        )
        .single();

        if (error) {
        throw new Error(
            `Could not save validation: ${error.message}`,
        );
        }

        console.log(
        "Validation saved:",
        updatedAnswer,
    );

    /*
     * Be gentle with the public
     * geographic service.
     */
    if (
      answer.categoryKey ===
        "city" &&
      index <
        answers.length - 1
    ) {
      await sleep(1100);
    }
  }
}