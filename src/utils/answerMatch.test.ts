import {
  describe,
  expect,
  it,
} from "vitest";
import {
  matchesAnswer,
  normalizeAnswer,
} from "./answerMatch";

/*
 * This decides whether a player scores, so both directions matter: a
 * rejected right answer is the more visible failure, but accepting a
 * near-miss quietly hands out points for a guess nobody would call right.
 */

const LION_KING = [
  "The Lion King",
  "Der König der Löwen",
];

describe("normalizeAnswer", () => {
  it("ignores case, spacing and punctuation", () => {
    expect(
      normalizeAnswer(
        "  WALL·E!  ",
      ),
    ).toBe("wall e");
  });

  it("folds accents so a plain keyboard still works", () => {
    expect(
      normalizeAnswer(
        "Der König der Löwen",
      ),
    ).toBe("konig der lowen");
  });

  it("drops a leading article in either language", () => {
    expect(
      normalizeAnswer(
        "The Matrix",
      ),
    ).toBe("matrix");

    expect(
      normalizeAnswer(
        "Die Hard",
      ),
    ).toBe("hard");
  });

  /* "Die Hard" losing its article is why the article is dropped from both
   * sides rather than compared as-is — the answer normalises the same way. */
  it("normalises an article-only answer to the same thing on both sides", () => {
    expect(
      normalizeAnswer(
        "Die Hard",
      ),
    ).toBe(
      normalizeAnswer("hard"),
    );
  });

  it("keeps a bare article that is the whole answer", () => {
    expect(normalizeAnswer("Up")).toBe(
      "up",
    );

    expect(
      normalizeAnswer("The"),
    ).toBe("the");
  });
});

describe("matchesAnswer", () => {
  it("takes the answer in either language", () => {
    for (const guess of [
      "The Lion King",
      "der könig der löwen",
      "Lion King",
      "Konig der Lowen",
    ]) {
      expect(
        matchesAnswer(
          guess,
          LION_KING,
        ),
        guess,
      ).toBe(true);
    }
  });

  it("forgives a slipped key on a long title", () => {
    expect(
      matchesAnswer(
        "The Lion Kong",
        LION_KING,
      ),
    ).toBe(true);
  });

  it("does not forgive a different film", () => {
    for (const guess of [
      "The Jungle Book",
      "Lion",
      "King Kong",
      "Madagascar",
    ]) {
      expect(
        matchesAnswer(
          guess,
          LION_KING,
        ),
        guess,
      ).toBe(false);
    }
  });

  /*
   * On a short answer one letter is the difference between two real words,
   * so there is no budget to spend.
   */
  it("is strict about short answers", () => {
    expect(
      matchesAnswer("Up", ["Up"]),
    ).toBe(true);

    expect(
      matchesAnswer("Us", ["Up"]),
    ).toBe(false);

    expect(
      matchesAnswer(
        "Cars",
        ["Cats"],
      ),
    ).toBe(false);
  });

  it("rejects an empty or blank guess", () => {
    for (const guess of [
      "",
      "   ",
      "!!!",
    ]) {
      expect(
        matchesAnswer(
          guess,
          LION_KING,
        ),
        JSON.stringify(guess),
      ).toBe(false);
    }
  });

  it("does not let a long guess match by containing the answer", () => {
    expect(
      matchesAnswer(
        "The Lion King and something else entirely",
        LION_KING,
      ),
    ).toBe(false);
  });

  it("reads an ampersand as the word", () => {
    expect(
      matchesAnswer(
        "Lilo & Stitch",
        ["Lilo and Stitch"],
      ),
    ).toBe(true);
  });

  it("matches nothing when there is nothing to match", () => {
    expect(
      matchesAnswer(
        "anything",
        [],
      ),
    ).toBe(false);

    expect(
      matchesAnswer("x", [""]),
    ).toBe(false);
  });
});
