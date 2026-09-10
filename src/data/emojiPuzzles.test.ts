import {
  readFileSync,
  readdirSync,
} from "node:fs";
import { join } from "node:path";
import {
  describe,
  expect,
  it,
} from "vitest";
import {
  EMOJI_CATEGORY_KEYS,
  GAME_ROUND_COUNT_OPTIONS,
} from "./gameTimers";

/*
 * The puzzles live in migrations rather than in the code, so nothing here
 * ever looked at them. That matters now that a host can play a single
 * category: pick "Books" for twelve rounds and the game needs twelve
 * books, or it runs out and the round simply fails to appear.
 */

const MIGRATIONS = "supabase/migrations";

type Puzzle = {
  emojis: string;
  category: string;
  answerEn: string;
  answerDe: string;
};

/** Reads the inserted rows out of the Emoji Decode migrations. */
function puzzles(): Puzzle[] {
  const sql = readdirSync(MIGRATIONS)
    .filter(
      (file) =>
        file.includes("emoji") &&
        file.endsWith(".sql"),
    )
    .sort()
    .map((file) =>
      readFileSync(
        join(MIGRATIONS, file),
        "utf8",
      ),
    )
    .join("\n");

  const known = new Set<string>(
    EMOJI_CATEGORY_KEYS,
  );

  return sql
    .split("\n")
    .filter((line) =>
      line.startsWith("  ('"),
    )
    .map((line) => {
      const fields = [
        ...line
          .slice(
            0,
            line.indexOf("ARRAY") ===
              -1
              ? undefined
              : line.indexOf("ARRAY"),
          )
          .matchAll(/'([^']*)'/g),
      ].map((match) => match[1]!);

      /*
       * The first migration predates the category key, so its rows carry
       * the English display name where later rows carry the key.
       */
      const keyed = known.has(
        fields[1] ?? "",
      );

      return {
        emojis: fields[0]!,
        category: keyed
          ? fields[1]!
          : (
              fields[1] ?? ""
            ).toLowerCase(),
        answerEn: keyed
          ? fields[4]!
          : fields[3]!,
        answerDe: keyed
          ? fields[5]!
          : fields[4]!,
      };
    });
}

describe("Emoji Decode puzzles", () => {
  const all = puzzles();

  it("parses the migrations at all", () => {
    expect(
      all.length,
    ).toBeGreaterThan(100);

    for (const puzzle of all) {
      expect(
        puzzle.emojis.length,
        JSON.stringify(puzzle),
      ).toBeGreaterThan(0);

      expect(
        puzzle.answerEn.length,
        JSON.stringify(puzzle),
      ).toBeGreaterThan(0);
    }
  });

  it("uses only categories the lobby can offer", () => {
    const known = new Set<string>(
      EMOJI_CATEGORY_KEYS,
    );

    for (const puzzle of all) {
      expect(
        known,
        `"${puzzle.category}" is not a category the lobby lists, so those puzzles can never be dealt`,
      ).toContain(puzzle.category);
    }
  });

  /*
   * The whole point of the selection is that a category can be played on
   * its own, so each one has to cover the longest game on offer.
   */
  it("gives every category enough puzzles for the longest game", () => {
    const longest = Math.max(
      ...GAME_ROUND_COUNT_OPTIONS[
        "emoji-decode"
      ],
    );

    for (const category of EMOJI_CATEGORY_KEYS) {
      const count = all.filter(
        (puzzle) =>
          puzzle.category ===
          category,
      ).length;

      expect(
        count,
        `"${category}" has ${count} puzzles but a game can run ${longest} rounds`,
      ).toBeGreaterThanOrEqual(
        longest,
      );
    }
  });

  it("never repeats an emoji sequence", () => {
    const seen = new Map<
      string,
      string
    >();

    for (const puzzle of all) {
      expect(
        seen.get(puzzle.emojis),
        `${puzzle.emojis} is used for both "${seen.get(
          puzzle.emojis,
        )}" and "${puzzle.answerEn}"`,
      ).toBeUndefined();

      seen.set(
        puzzle.emojis,
        puzzle.answerEn,
      );
    }
  });

  it("never repeats an answer", () => {
    const seen = new Set<string>();

    for (const puzzle of all) {
      const key =
        puzzle.answerEn.toLowerCase();

      expect(
        seen.has(key),
        `"${puzzle.answerEn}" appears twice`,
      ).toBe(false);

      seen.add(key);
    }
  });

  it("answers in both languages", () => {
    for (const puzzle of all) {
      expect(
        puzzle.answerDe.length,
        `"${puzzle.answerEn}" has no German answer`,
      ).toBeGreaterThan(0);
    }
  });
});
