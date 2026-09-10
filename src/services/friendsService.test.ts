import {
  describe,
  expect,
  it,
} from "vitest";
import {
  PREDICTION_POINTS,
  SUBJECT_POINTS_EACH,
  askAbout,
  scoreRound,
  subjectFor,
} from "./friendsService";
import type { FriendsAnswer } from "../types/game";

function answer(
  playerId: string,
  selectedIndex: number,
  isSubject = false,
): FriendsAnswer {
  return {
    id: `answer-${playerId}`,
    roundId: "round-1",
    playerId,
    selectedIndex,
    isSubject,
    isCorrect: false,
    points: 0,
    createdAt:
      "2026-01-01T00:00:00.000Z",
  };
}

describe("askAbout", () => {
  it("puts the subject's name in the prompt", () => {
    expect(
      askAbout(
        "How does {name} spend a free evening?",
        "Anna",
      ),
    ).toBe(
      "How does Anna spend a free evening?",
    );
  });

  /* German prompts use the placeholder twice in a couple of places. */
  it("replaces every occurrence", () => {
    expect(
      askAbout(
        "{name} and {name}",
        "Bo",
      ),
    ).toBe("Bo and Bo");
  });

  it("leaves a prompt without the placeholder alone", () => {
    expect(
      askAbout("No holes here", "Bo"),
    ).toBe("No holes here");
  });
});

describe("subjectFor", () => {
  const players = [
    "a",
    "b",
    "c",
  ];

  /*
   * The point of the game is that everyone gets a turn as the subject, so
   * the rotation has to cover the whole table before it repeats.
   */
  it("gives everyone a turn before repeating", () => {
    expect(
      [1, 2, 3].map((round) =>
        subjectFor(round, players),
      ),
    ).toEqual(["a", "b", "c"]);
  });

  it("wraps around after the last player", () => {
    expect(
      subjectFor(4, players),
    ).toBe("a");

    expect(
      subjectFor(7, players),
    ).toBe("a");
  });

  it("starts at the first player, not the second", () => {
    expect(
      subjectFor(1, players),
    ).toBe("a");
  });

  it("has no subject in an empty room", () => {
    expect(
      subjectFor(1, []),
    ).toBeNull();
  });
});

describe("scoreRound", () => {
  it("pays everyone who matched the subject", () => {
    const points = scoreRound([
      answer("subject", 2, true),
      answer("right", 2),
      answer("wrong", 0),
    ]);

    expect(points["right"]).toBe(
      PREDICTION_POINTS,
    );

    expect(
      points["wrong"],
    ).toBeUndefined();
  });

  /* Being known is worth something, per player who read you right. */
  it("pays the subject per correct reader", () => {
    const points = scoreRound([
      answer("subject", 1, true),
      answer("one", 1),
      answer("two", 1),
      answer("three", 3),
    ]);

    expect(points["subject"]).toBe(
      2 * SUBJECT_POINTS_EACH,
    );
  });

  it("pays the subject nothing when nobody got it", () => {
    const points = scoreRound([
      answer("subject", 1, true),
      answer("one", 0),
      answer("two", 3),
    ]);

    expect(
      points["subject"],
    ).toBeUndefined();
  });

  /*
   * The subject may run out of time without answering. There is then no
   * truth to grade against, so the round is worth nothing to anyone —
   * rather than crediting whoever happened to pick option A.
   */
  it("pays nobody when the subject never answered", () => {
    const points = scoreRound([
      answer("one", 0),
      answer("two", 0),
    ]);

    expect(points).toEqual({});
  });

  it("does not pay the subject for their own answer as a prediction", () => {
    const points = scoreRound([
      answer("subject", 2, true),
    ]);

    expect(points).toEqual({});
  });
});
