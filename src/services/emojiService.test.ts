import {
  describe,
  expect,
  it,
} from "vitest";
import {
  BASE_POINTS,
  FIRST_SOLVE_BONUS,
  MAX_SOLVE_POINTS,
  POINTS_PER_SECOND,
  isSolved,
  mapPuzzle,
  scoreSolve,
} from "./emojiService";

/*
 * The scoring is what makes this a race rather than a quiz, and the
 * accepted-answer list is what stops a right answer being rejected for
 * being in the wrong language.
 */

const ROW = {
  id: "p1",
  emojis: "🦁👑",
  category_en: "Movie",
  category_de: "Film",
  answer_en: "The Lion King",
  answer_de: "Der König der Löwen",
  aliases_en: ["Lion King"],
  aliases_de: ["König der Löwen"],
  difficulty: "easy" as const,
};

describe("mapPuzzle", () => {
  it("shows the room's language", () => {
    expect(
      mapPuzzle(ROW, "de").answer,
    ).toBe("Der König der Löwen");

    expect(
      mapPuzzle(ROW, "de").category,
    ).toBe("Film");

    expect(
      mapPuzzle(ROW, "en").answer,
    ).toBe("The Lion King");
  });

  /*
   * A German group still shouts "Lion King", and refusing that would feel
   * like a bug rather than a rule.
   */
  it("accepts either language whichever is being shown", () => {
    const puzzle = mapPuzzle(
      ROW,
      "de",
    );

    for (const guess of [
      "Der König der Löwen",
      "The Lion King",
      "Lion King",
    ]) {
      expect(
        isSolved(guess, puzzle),
        guess,
      ).toBe(true);
    }
  });

  it("survives a row with no aliases", () => {
    const puzzle = mapPuzzle(
      {
        ...ROW,
        aliases_en: null,
        aliases_de: null,
      },
      "en",
    );

    expect(
      puzzle.accepted,
    ).toEqual([
      "The Lion King",
      "Der König der Löwen",
    ]);

    expect(
      isSolved(
        "the lion king",
        puzzle,
      ),
    ).toBe(true);
  });

  it("still rejects a different answer", () => {
    const puzzle = mapPuzzle(
      ROW,
      "en",
    );

    expect(
      isSolved(
        "The Jungle Book",
        puzzle,
      ),
    ).toBe(false);

    expect(
      isSolved("", puzzle),
    ).toBe(false);
  });
});

describe("scoreSolve", () => {
  it("pays more the more clock is left", () => {
    const quick = scoreSolve(
      30,
      false,
    );

    const slow = scoreSolve(
      5,
      false,
    );

    expect(
      quick,
    ).toBeGreaterThan(slow);

    expect(slow).toBe(
      BASE_POINTS +
        5 * POINTS_PER_SECOND,
    );
  });

  it("pays a bonus for getting there first", () => {
    expect(
      scoreSolve(10, true) -
        scoreSolve(10, false),
    ).toBe(FIRST_SOLVE_BONUS);
  });

  /*
   * Without the cap a long timer would make one lucky round worth more
   * than the rest of the game put together.
   */
  it("caps what the clock alone can be worth", () => {
    expect(
      scoreSolve(9_999, false),
    ).toBe(MAX_SOLVE_POINTS);

    expect(
      scoreSolve(9_999, true),
    ).toBe(
      MAX_SOLVE_POINTS +
        FIRST_SOLVE_BONUS,
    );
  });

  it("still pays for a solve on the buzzer", () => {
    expect(scoreSolve(0, false)).toBe(
      BASE_POINTS,
    );

    /* A clock read after time is up must not go negative. */
    expect(
      scoreSolve(-20, false),
    ).toBe(BASE_POINTS);
  });

  it("never pays less for being faster", () => {
    let previous = 0;

    for (
      let seconds = 0;
      seconds <= 120;
      seconds += 1
    ) {
      const points = scoreSolve(
        seconds,
        false,
      );

      expect(
        points,
      ).toBeGreaterThanOrEqual(
        previous,
      );

      previous = points;
    }
  });
});
