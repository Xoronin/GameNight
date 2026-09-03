import type { CategoriesAnswer } from "../../types/game";

type GameLanguage = "en" | "de";

export function answerStartsWithLetter(
  answer: string,
  letter: string,
  language: GameLanguage,
) {
  const trimmed = answer.trim();

  if (!trimmed || !letter) {
    return false;
  }

  return (
    trimmed
      .charAt(0)
      .toLocaleUpperCase(language) ===
    letter.toLocaleUpperCase(language)
  );
}

function normalizeAnswerText(
  value: string,
) {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, " ");
}

export function countDuplicateAnswers(
  answer: CategoriesAnswer,
  answers: CategoriesAnswer[],
) {
  const normalized =
    normalizeAnswerText(
      answer.answer,
    );

  return answers.filter(
    (other) =>
      other.categoryKey ===
        answer.categoryKey &&
      normalizeAnswerText(
        other.answer,
      ) === normalized,
  ).length;
}

/*
 * The answer's own author can't vote on it, so
 * "majority" is measured against the other players
 * in the room, not the full player count — otherwise
 * a 2-player game could never reach a majority at
 * all (1 eligible voter can never outvote nobody).
 */
export function isMajorityRejected(
  rejectVotes: number,
  playerCount: number,
) {
  const eligibleVoters = Math.max(
    playerCount - 1,
    0,
  );

  return (
    rejectVotes >
    Math.floor(eligibleVoters / 2)
  );
}

/*
 * Every answer counts by default as long as it
 * starts with the round's letter (the one rule
 * that isn't up for a vote). Beyond that, players
 * decide by voting an answer down — once a
 * majority of the room has rejected it, it stops
 * scoring. Duplicate answers within a category are
 * worth half points, same as before.
 */
export function computeAnswerPoints(
  answer: CategoriesAnswer,
  answers: CategoriesAnswer[],
  letter: string,
  language: GameLanguage,
  rejectVotes: number,
  playerCount: number,
) {
  if (
    !answerStartsWithLetter(
      answer.answer,
      letter,
      language,
    )
  ) {
    return 0;
  }

  if (
    isMajorityRejected(
      rejectVotes,
      playerCount,
    )
  ) {
    return 0;
  }

  const duplicates =
    countDuplicateAnswers(
      answer,
      answers,
    );

  return duplicates > 1 ? 5 : 10;
}
