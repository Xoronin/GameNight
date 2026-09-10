/*
 * Deciding whether a typed guess is the answer.
 *
 * Players race to type a title, so being strict about it punishes the
 * wrong thing: "the lion king", "Lion King", "Der König der Löwen" and a
 * one-key slip are all somebody who got it. Being loose is worse still —
 * accepting a near-miss hands out points for a guess nobody would call
 * right — so the tolerance is bounded and grows only with length.
 */

const LEADING_ARTICLES = [
  "the",
  "a",
  "an",
  "der",
  "die",
  "das",
  "den",
  "dem",
  "ein",
  "eine",
];

/** Typos forgiven, by length of the answer being matched. */
const TYPO_BUDGET = [
  { upTo: 4, allowed: 0 },
  { upTo: 8, allowed: 1 },
  { upTo: 16, allowed: 2 },
];

const MAX_TYPOS = 3;

export function normalizeAnswer(
  value: string,
): string {
  const stripped = value
    .toLowerCase()
    .normalize("NFD")
    /* Combining marks: é becomes e, ü becomes u. */
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(/[&]/g, " and ")
    .replace(
      /[^a-z0-9ß\s]/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();

  const [first, ...rest] =
    stripped.split(" ");

  /* "The Matrix" and "Matrix" are the same guess. */
  return rest.length > 0 &&
    LEADING_ARTICLES.includes(
      first,
    )
    ? rest.join(" ")
    : stripped;
}

/** Levenshtein distance, giving up once it passes the budget. */
function editDistance(
  a: string,
  b: string,
  budget: number,
): number {
  if (
    Math.abs(a.length - b.length) >
    budget
  ) {
    return budget + 1;
  }

  let previous = Array.from(
    { length: b.length + 1 },
    (_, index) => index,
  );

  for (
    let i = 1;
    i <= a.length;
    i += 1
  ) {
    const current = [i];

    let best = i;

    for (
      let j = 1;
      j <= b.length;
      j += 1
    ) {
      const cost =
        a[i - 1] === b[j - 1]
          ? 0
          : 1;

      const value = Math.min(
        current[j - 1]! + 1,
        previous[j]! + 1,
        previous[j - 1]! + cost,
      );

      current.push(value);

      best = Math.min(best, value);
    }

    /* Every path through this row already costs too much. */
    if (best > budget) {
      return budget + 1;
    }

    previous = current;
  }

  return previous[b.length]!;
}

function typosAllowed(
  length: number,
): number {
  return (
    TYPO_BUDGET.find(
      ({ upTo }) =>
        length <= upTo,
    )?.allowed ?? MAX_TYPOS
  );
}

/**
 * Whether a guess counts as one of the accepted answers.
 *
 * Pass every spelling worth accepting — both languages' titles and any
 * aliases — since a German room still shouts the English name.
 */
export function matchesAnswer(
  guess: string,
  accepted: readonly string[],
): boolean {
  const typed =
    normalizeAnswer(guess);

  if (typed.length === 0) {
    return false;
  }

  return accepted.some(
    (candidate) => {
      const answer =
        normalizeAnswer(candidate);

      if (answer.length === 0) {
        return false;
      }

      if (typed === answer) {
        return true;
      }

      const budget = typosAllowed(
        answer.length,
      );

      return (
        budget > 0 &&
        editDistance(
          typed,
          answer,
          budget,
        ) <= budget
      );
    },
  );
}
