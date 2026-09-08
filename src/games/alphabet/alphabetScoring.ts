export function normalizeLetter(letter: string) {
  return letter.trim().toUpperCase();
}

export function wordStartsWithLetter(
  word: string,
  letter: string,
) {
  const trimmed = word.trim();

  if (!trimmed || !letter) {
    return false;
  }

  return (
    trimmed
      .charAt(0)
      .toUpperCase() ===
    normalizeLetter(letter)
  );
}

const RARE_LETTERS = new Set([
  "J",
  "Q",
  "X",
  "Z",
]);

const RARE_LETTER_POINTS = 200;
const COMMON_LETTER_POINTS = 100;

export function pointsForLetter(
  letter: string,
) {
  return RARE_LETTERS.has(
    normalizeLetter(letter),
  )
    ? RARE_LETTER_POINTS
    : COMMON_LETTER_POINTS;
}

/*
 * The word's own author can't vote on it, so
 * "majority" is measured against the other active
 * players, not the full player count — mirrors
 * categoriesScoring.isMajorityRejected.
 */
export function isMajorityRejected(
  rejectVotes: number,
  eligibleVoterCount: number,
) {
  return (
    rejectVotes >
    Math.floor(
      eligibleVoterCount / 2,
    )
  );
}
