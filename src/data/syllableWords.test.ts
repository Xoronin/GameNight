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
import { GAME_TIMER_DEFAULTS } from "./gameTimers";

/*
 * The dictionary and the fragments live in a migration rather than in the
 * code, so nothing here would otherwise look at them — and the property
 * that makes the game playable is a relationship between the two: every
 * fragment has to be solvable from the words that shipped alongside it.
 *
 * Get that wrong and the failure is invisible until a real round deals the
 * bad fragment and nobody in the room can answer it.
 */

const MIGRATIONS = "supabase/migrations";
const LANGUAGES = ["en", "de"] as const;

type Language = (typeof LANGUAGES)[number];

type Prompt = {
  language: Language;
  fragment: string;
  wordCount: number;
  examples: string[];
};

function sql(): string {
  return readdirSync(MIGRATIONS)
    .filter(
      (file) =>
        file.includes(
          "syllable_rush",
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
}

function quoted(
  block: string,
): string[] {
  return [
    ...block.matchAll(/'([^']*)'/g),
  ].map((match) => match[1]);
}

const source = sql();

const words: Record<
  Language,
  Set<string>
> = { en: new Set(), de: new Set() };

for (const block of source.matchAll(
  /select '(en|de)', word from unnest\(ARRAY\[([\s\S]*?)\]\) as word/g,
)) {
  for (const word of quoted(
    block[2],
  )) {
    words[block[1] as Language].add(
      word,
    );
  }
}

const prompts: Prompt[] = [
  ...source.matchAll(
    /\n {2}\('(en|de)', '([^']+)', (\d+), ARRAY\[([^\]]*)\]\)/g,
  ),
].map((match) => ({
  language: match[1] as Language,
  fragment: match[2],
  wordCount: Number(match[3]),
  examples: quoted(match[4]),
}));

/*
 * How many of the shipped words contain each fragment. Counted once from
 * the dictionary rather than per prompt, which keeps this from being a
 * thousand scans of twenty thousand words.
 */
const contains: Record<
  Language,
  Map<string, number>
> = { en: new Map(), de: new Map() };

for (const language of LANGUAGES) {
  for (const word of words[
    language
  ]) {
    const seen = new Set<string>();

    for (
      let i = 0;
      i <= word.length - 3;
      i += 1
    ) {
      seen.add(word.slice(i, i + 3));
    }

    for (const fragment of seen) {
      contains[language].set(
        fragment,
        (contains[language].get(
          fragment,
        ) ?? 0) + 1,
      );
    }
  }
}

const ALPHABET: Record<
  Language,
  RegExp
> = {
  en: /^[a-z]+$/,
  de: /^[a-zäöüß]+$/,
};

describe("Syllable Rush content", () => {
  /* If the scrape finds nothing, the rest of this proves nothing. */
  it("reads the dictionary and the fragments", () => {
    for (const language of LANGUAGES) {
      expect(
        words[language].size,
        `${language} dictionary`,
      ).toBeGreaterThan(5000);
    }

    expect(
      prompts.length,
    ).toBeGreaterThan(200);
  });

  it("ships fragments for both languages", () => {
    for (const language of LANGUAGES) {
      expect(
        prompts.filter(
          (prompt) =>
            prompt.language ===
            language,
        ).length,
        `${language} fragments`,
      ).toBeGreaterThan(100);
    }
  });

  it("uses three lowercase letters per fragment", () => {
    for (const prompt of prompts) {
      expect(
        prompt.fragment.length,
        `fragment "${prompt.fragment}"`,
      ).toBe(3);

      expect(
        prompt.fragment,
      ).toMatch(
        ALPHABET[prompt.language],
      );
    }
  });

  /*
   * The one that matters. A player has to be able to answer with a word
   * that actually shipped, or the fragment is unanswerable in practice.
   */
  it("can answer every fragment out of its own dictionary", () => {
    for (const prompt of prompts) {
      const found =
        contains[
          prompt.language
        ].get(prompt.fragment) ?? 0;

      expect(
        found,
        `"${prompt.fragment}" (${prompt.language}) is in ${found} shipped words`,
      ).toBeGreaterThanOrEqual(
        prompt.wordCount,
      );
    }
  });

  it("only claims a word count it can back up", () => {
    for (const prompt of prompts) {
      expect(
        prompt.wordCount,
        `"${prompt.fragment}"`,
      ).toBeGreaterThanOrEqual(30);
    }
  });

  /* Shown after a miss, so they had better be answers. */
  it("gives examples that would have been accepted", () => {
    for (const prompt of prompts) {
      expect(
        prompt.examples.length,
      ).toBeGreaterThan(0);

      for (const example of prompt.examples) {
        expect(
          example,
          `"${example}" does not contain "${prompt.fragment}"`,
        ).toContain(
          prompt.fragment,
        );

        expect(
          words[
            prompt.language
          ].has(example),
          `"${example}" is not in the ${prompt.language} dictionary`,
        ).toBe(true);
      }
    }
  });

  it("has no duplicate fragments", () => {
    const keys = prompts.map(
      (prompt) =>
        `${prompt.language}:${prompt.fragment}`,
    );

    expect(new Set(keys).size).toBe(
      keys.length,
    );
  });

  /*
   * Submissions are lowercased and stripped to letters before the lookup,
   * so a stored word outside that alphabet could never be matched.
   */
  it("stores words in the form a submission is compared in", () => {
    for (const language of LANGUAGES) {
      for (const word of words[
        language
      ]) {
        expect(
          word,
          `"${word}" (${language})`,
        ).toMatch(
          ALPHABET[language],
        );
      }
    }
  });

  /*
   * The opening clock has to leave room to think. Fragments are three
   * letters, so the shortest honest answer is usually four or five.
   */
  it("opens with a clock long enough to type a word", () => {
    expect(
      GAME_TIMER_DEFAULTS[
        "syllable-rush"
      ],
    ).toBeGreaterThanOrEqual(8);
  });
});
