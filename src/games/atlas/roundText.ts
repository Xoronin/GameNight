import {
  capitalName,
  countryName,
  getAtlasCountry,
} from "../../data/atlasCountries";
import type {
  AtlasRoundPayload,
  AtlasRoundType,
} from "../../types/game";

/** Translation key for the instruction shown above each round type. */
export const promptKeys: Record<
  AtlasRoundType,
  string
> = {
  flag_paint: "atlas.taskFlagPaint",
  flag_choice: "atlas.taskFlagChoice",
  country_from_flag:
    "atlas.taskCountryFromFlag",
  capital_choice:
    "atlas.taskCapitalChoice",
  capital_match:
    "atlas.taskCapitalMatch",
  map_choice: "atlas.taskMapChoice",
  map_place: "atlas.taskMapPlace",
};

/*
 * The map round asks for either the highlighted country or its capital,
 * and which one is drawn per round — so the instruction has to follow the
 * payload rather than the round type, or it labels capitals as countries.
 */
export function promptKeyFor(
  payload: AtlasRoundPayload,
): string {
  if (
    payload.type ===
      "map_choice" &&
    payload.asks === "capital"
  ) {
    return "atlas.taskMapCapital";
  }

  return promptKeys[payload.type];
}

/*
 * Whether a round's options are capital cities rather than country names.
 * The revealed answer has to be named in the same register as the options
 * the player chose between, or it answers a question nobody was asked.
 */
function asksForCapital(
  payload: AtlasRoundPayload,
): boolean {
  return (
    payload.type ===
      "capital_choice" ||
    (payload.type ===
      "map_choice" &&
      payload.asks === "capital")
  );
}

/** The correct answer, worded to match the options. */
export function answerLabel(
  payload: AtlasRoundPayload,
  language: "en" | "de",
): string | null {
  if (
    !("countryId" in payload)
  ) {
    return null;
  }

  const country = getAtlasCountry(
    payload.countryId,
  );

  if (!country) {
    return null;
  }

  return asksForCapital(payload)
    ? capitalName(
        country,
        language,
      )
    : countryName(
        country,
        language,
      );
}

/*
 * What the player on turn is being told to drag. Both boards run on turns
 * and share a component, but one deals capitals and the other countries,
 * so a single string was telling map players to drag a capital.
 */
export function boardDragKey(
  payload: AtlasRoundPayload,
): string {
  return payload.type ===
    "map_place"
    ? "atlas.dragOneCountry"
    : "atlas.dragOne";
}
