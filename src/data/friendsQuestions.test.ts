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
import { GAME_ROUND_COUNT_OPTIONS } from "./gameTimers";

/*
 * The questions live in a migration rather than in the code, so nothing
 * here would otherwise look at them. Two of the database's CHECK
 * constraints — four options, a {name} placeholder in both prompts — would
 * only fail when the migration is applied, which is on the user's machine
 * and not in CI, so they are checked here where a mistake is cheap.
 */

const MIGRATIONS = "supabase/migrations";

type Question = {
  promptEn: string;
  promptDe: string;
  optionsEn: string[];
  optionsDe: string[];
};

function unquote(value: string): string {
  return value.replaceAll("''", "'");
}

function items(array: string): string[] {
  return [
    ...array.matchAll(
      /'((?:[^']|'')*)'/g,
    ),
  ].map((match) =>
    unquote(match[1]),
  );
}

/** Reads the inserted rows out of the Know Your Friends migrations. */
function questions(): Question[] {
  const sql = readdirSync(MIGRATIONS)
    .filter(
      (file) =>
        file.includes(
          "know_your_friends",
        ) && file.endsWith(".sql"),
    )
    .sort()
    .map((file) =>
      readFileSync(
        join(MIGRATIONS, file),
        "utf8",
      ),
    )
    .join("\n");

  return [
    ...sql.matchAll(
      /\n {2}\('((?:[^']|'')*)', '((?:[^']|'')*)',\n\s*ARRAY\[([^\]]*)\],\n\s*ARRAY\[([^\]]*)\]\)/g,
    ),
  ].map((match) => ({
    promptEn: unquote(match[1]),
    promptDe: unquote(match[2]),
    optionsEn: items(match[3]),
    optionsDe: items(match[4]),
  }));
}

describe("Know Your Friends questions", () => {
  const all = questions();

  /* If the scrape finds nothing, the rest of this proves nothing. */
  it("finds the seeded questions", () => {
    expect(
      all.length,
    ).toBeGreaterThan(20);
  });

  it("has enough for the longest game", () => {
    const longest = Math.max(
      ...GAME_ROUND_COUNT_OPTIONS[
        "know-your-friends"
      ],
    );

    expect(
      all.length,
      `a ${longest}-round game needs ${longest} questions`,
    ).toBeGreaterThanOrEqual(
      longest,
    );
  });

  it("puts the {name} placeholder in both prompts", () => {
    for (const question of all) {
      expect(
        question.promptEn,
        `English prompt has no {name}: ${question.promptEn}`,
      ).toContain("{name}");

      expect(
        question.promptDe,
        `German prompt has no {name}: ${question.promptDe}`,
      ).toContain("{name}");
    }
  });

  it("gives every question exactly four options in both languages", () => {
    for (const question of all) {
      expect(
        question.optionsEn.length,
        `English options for "${question.promptEn}"`,
      ).toBe(4);

      expect(
        question.optionsDe.length,
        `German options for "${question.promptEn}"`,
      ).toBe(4);
    }
  });

  /*
   * Two identical options make one of them unpickable as a prediction —
   * the player who chose the other is marked wrong for the same answer.
   */
  it("keeps a question's options distinct", () => {
    for (const question of all) {
      for (const options of [
        question.optionsEn,
        question.optionsDe,
      ]) {
        expect(
          new Set(options).size,
          `duplicate option in "${question.promptEn}": ${options.join(" | ")}`,
        ).toBe(options.length);
      }
    }
  });

  it("does not ask the same thing twice", () => {
    const seen = new Set(
      all.map(
        (question) =>
          question.promptEn,
      ),
    );

    expect(seen.size).toBe(
      all.length,
    );
  });

  /* An empty string renders as a blank button nobody can read. */
  it("has no empty text anywhere", () => {
    for (const question of all) {
      for (const text of [
        question.promptEn,
        question.promptDe,
        ...question.optionsEn,
        ...question.optionsDe,
      ]) {
        expect(
          text.trim().length,
        ).toBeGreaterThan(0);
      }
    }
  });
});
