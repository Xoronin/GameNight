/*
 * GENERATED FILE — do not edit by hand.
 * Run `node scripts/generate-map-data.mjs` to rebuild.
 *
 * Which countries each region can ask about. A roster country is left
 * out where its centre of mass falls outside that region's frame —
 * Russia on a European map — so it is drawn as context but never asked.
 */

import type { MapRegionId } from "./atlasMapPaths";

export const mapRegionIds: MapRegionId[] =
  ["europe","africa","asia","americas"];

export const mapPlayableIds: Record<
  MapRegionId,
  string[]
> = {
 "europe": [
  "at",
  "be",
  "bg",
  "ch",
  "cz",
  "de",
  "dk",
  "ee",
  "es",
  "fi",
  "fr",
  "gb",
  "gr",
  "hu",
  "ie",
  "is",
  "it",
  "lt",
  "lu",
  "nl",
  "no",
  "pl",
  "pt",
  "ro",
  "se",
  "ua"
 ],
 "africa": [
  "bw",
  "dz",
  "eg",
  "et",
  "ga",
  "gn",
  "ke",
  "ma",
  "ml",
  "ng",
  "sl",
  "za"
 ],
 "asia": [
  "am",
  "cn",
  "id",
  "in",
  "jp",
  "kz",
  "sa",
  "th",
  "tr",
  "vn",
  "ye"
 ],
 "americas": [
  "ar",
  "bo",
  "br",
  "ca",
  "cl",
  "co",
  "mx",
  "pe",
  "us"
 ]
};
