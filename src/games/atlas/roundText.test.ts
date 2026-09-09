import {
  describe,
  expect,
  it,
} from "vitest";
import { translate } from "../../i18n/i18n";
import type { TranslationKey } from "../../i18n/i18n";
import type { AtlasRoundPayload } from "../../types/game";
import {
  answerLabel,
  promptKeyFor,
  promptKeys,
} from "./roundText";

/*
 * The map round draws its question per round: half the time it lights up a
 * country and asks for the country, half the time for its capital. The
 * instruction shipped as one fixed string, so a capital round told players
 * to name the country while listing cities. These tests pin the pairing.
 */

/* translate() echoes the key back when it cannot resolve one. */
const text = (
  language: "en" | "de",
  key: string,
) =>
  translate(
    language,
    key as TranslationKey,
  );

const mapChoice = (
  asks: "country" | "capital",
): AtlasRoundPayload => ({
  type: "map_choice",
  region: "europe",
  countryId: "fr",
  optionIds: ["fr"],
  asks,
});

describe("Atlas round instructions", () => {
  it("asks for a capital when the options are capitals", () => {
    const key = promptKeyFor(
      mapChoice("capital"),
    );

    expect(
      text("en", key),
    ).toMatch(/capital/i);

    expect(
      text("de", key),
    ).toMatch(/hauptstadt/i);
  });

  it("asks for a country when the options are countries", () => {
    const key = promptKeyFor(
      mapChoice("country"),
    );

    expect(
      text("en", key),
    ).not.toMatch(/capital/i);

    expect(
      text("de", key),
    ).not.toMatch(/hauptstadt/i);
  });

  it("gives the two map questions different instructions", () => {
    expect(
      promptKeyFor(
        mapChoice("capital"),
      ),
    ).not.toBe(
      promptKeyFor(
        mapChoice("country"),
      ),
    );
  });

  it("names the revealed answer as a capital when a capital was asked for", () => {
    expect(
      answerLabel(
        mapChoice("capital"),
        "en",
      ),
    ).toBe("Paris");

    expect(
      answerLabel(
        {
          type: "capital_choice",
          countryId: "fr",
          optionIds: ["fr"],
        },
        "en",
      ),
    ).toBe("Paris");
  });

  it("names the revealed answer as a country when a country was asked for", () => {
    expect(
      answerLabel(
        mapChoice("country"),
        "en",
      ),
    ).toBe("France");

    expect(
      answerLabel(
        mapChoice("country"),
        "de",
      ),
    ).toBe("Frankreich");

    expect(
      answerLabel(
        {
          type: "country_from_flag",
          countryId: "fr",
          optionIds: ["fr"],
        },
        "en",
      ),
    ).toBe("France");
  });

  it("has no revealed answer for the turn-based boards", () => {
    expect(
      answerLabel(
        {
          type: "capital_match",
          countryIds: ["fr"],
          capitalOrder: ["fr"],
        },
        "en",
      ),
    ).toBeNull();
  });

  it("has a translated instruction for every round type", () => {
    const keys = [
      ...Object.values(promptKeys),
      "atlas.taskMapCapital",
    ];

    for (const key of keys) {
      expect(
        text("en", key),
        `${key} is missing from en`,
      ).not.toBe(key);

      expect(
        text("de", key),
        `${key} is missing from de`,
      ).not.toBe(key);
    }
  });
});
