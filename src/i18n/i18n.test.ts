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
import en from "./en";
import { translate } from "./i18n";

/*
 * Every translation key the app uses must resolve in both languages.
 *
 * translate() returns the key itself when it cannot resolve one, so a
 * missing translation is not an error — it is a raw "trivia.reveal"
 * shown to a player mid-game. Nothing else catches that.
 */

function sourceFiles(
  dir = "src",
): string[] {
  return readdirSync(dir, {
    withFileTypes: true,
  }).flatMap((entry) => {
    const path = join(
      dir,
      entry.name,
    );

    if (entry.isDirectory()) {
      return sourceFiles(path);
    }

    return /\.tsx?$/.test(
      entry.name,
    ) && !entry.name.endsWith(".test.ts")
      ? [path]
      : [];
  });
}

/*
 * Keys are recognised by their leading section — taken from the English
 * file itself, so an unrelated dotted string like a filename cannot be
 * mistaken for one.
 */
const SECTIONS = new Set(
  Object.keys(en),
);

const KEY_SHAPE =
  /"([a-z][A-Za-z]*\.[A-Za-z][A-Za-z0-9.]*)"/g;

describe("translations", () => {
  const used = new Map<
    string,
    string
  >();

  for (const file of sourceFiles()) {
    const source = readFileSync(
      file,
      "utf8",
    );

    for (const match of source.matchAll(
      KEY_SHAPE,
    )) {
      const key = match[1];

      if (
        SECTIONS.has(
          key.split(".")[0],
        )
      ) {
        used.set(key, file);
      }
    }
  }

  it("finds the keys the app uses", () => {
    /* If the scrape breaks, every other check here passes vacuously. */
    expect(
      used.size,
    ).toBeGreaterThan(200);
  });

  it.each(["en", "de"] as const)(
    "resolves every used key in %s",
    (language) => {
      const missing: string[] = [];

      for (const [
        key,
        file,
      ] of used) {
        if (
          translate(language, key) ===
          key
        ) {
          missing.push(
            `${key} (used in ${file})`,
          );
        }
      }

      expect(
        missing,
        `missing ${language} translations:\n${missing.join(
          "\n",
        )}`,
      ).toEqual([]);
    },
  );

  it("keeps the two languages structurally in step", () => {
    const flatten = (
      value: unknown,
      prefix = "",
    ): string[] =>
      typeof value === "object" &&
      value !== null
        ? Object.entries(
            value as Record<
              string,
              unknown
            >,
          ).flatMap(([key, child]) =>
            flatten(
              child,
              prefix
                ? `${prefix}.${key}`
                : key,
            ),
          )
        : [prefix];

    const english = flatten(en);

    const missingInGerman =
      english.filter(
        (key) =>
          translate("de", key) === key,
      );

    expect(
      missingInGerman,
      `German is missing:\n${missingInGerman.join(
        "\n",
      )}`,
    ).toEqual([]);
  });
});
