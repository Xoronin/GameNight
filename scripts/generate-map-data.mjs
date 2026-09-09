/*
 * Generates src/data/atlasMapPaths.ts — one SVG path per country, per
 * region, from Natural Earth 110m outlines (public domain, via the
 * world-atlas package).
 *
 * Run with: node scripts/generate-map-data.mjs
 *
 * The output is committed so the app ships no map dependency and does
 * no projection work at runtime; world-atlas, topojson-client and
 * d3-geo are devDependencies used only here.
 */
import { readFileSync, writeFileSync } from "fs";
import { gzipSync } from "zlib";
import { feature } from "topojson-client";
import { geoCentroid, geoMercator, geoPath } from "d3-geo";

const WIDTH = 1000;
const HEIGHT = 620;
const PADDING = 14;

/*
 * Playable outlines carry one decimal; context outlines are rounded to
 * whole pixels, which is invisible at this scale and roughly halves
 * their cost.
 */
const PRECISION_PLAYABLE = 0;
const PRECISION_CONTEXT = 0;

/* Context shapes smaller than this many square pixels are dropped. */
const MIN_CONTEXT_AREA = 260;

/*
 * Explicit frames, in [west, south, east, north] degrees.
 *
 * Fitting to the member countries instead pulls the frame out to
 * whatever the widest one spans: Russia dragged the European frame all
 * the way to the Pacific and left Europe a smudge in the middle.
 */
const REGION_BOUNDS = {
  europe: [-25, 34, 45, 71],
  africa: [-19, -36, 52, 38],
  asia: [25, -11, 146, 56],
  americas: [-170, -56, -32, 72],
};

/*
 * A country is only answerable in a region if it actually sits in the
 * frame. Judged on its area-weighted centroid: Russia's is in Siberia,
 * so it is context on a European map.
 *
 * Geographic bounds do not work here — Natural Earth folds overseas
 * territories into the parent country, so France's bounds reach French
 * Guiana and Norway's reach Bouvet Island, which made both look mostly
 * off-screen. Projected area does not work either: Mercator wraps
 * Russia's eastern longitudes back into frame, and geoPath.area()
 * ignores clipExtent.
 */
function centroidInFrame(
  featureGeo,
  [west, south, east, north],
) {
  const [lon, lat] = geoCentroid(featureGeo);

  return (
    lon >= west &&
    lon <= east &&
    lat >= south &&
    lat <= north
  );
}

const topo = JSON.parse(
  readFileSync("node_modules/world-atlas/countries-110m.json", "utf8"),
);
const world = feature(topo, topo.objects.countries);

/* Our roster, read straight from the source of truth. */
const source = readFileSync("src/data/atlasCountries.ts", "utf8");
const roster = [];
for (const m of source.matchAll(
  /id:\s*"([a-z]{2})",\s*\n\s*nameEn:\s*"([^"]+)",[\s\S]*?continent:\s*"(\w+)"/g,
)) {
  roster.push({ id: m[1], nameEn: m[2], continent: m[3] });
}
for (const m of source.matchAll(
  /mapCountry\(\s*"([a-z]{2})",\s*"([^"]+)",\s*"[^"]*",\s*"[^"]*",\s*"[^"]*",\s*"(\w+)"\s*\)/g,
)) {
  roster.push({ id: m[1], nameEn: m[2], continent: m[3] });
}

const byName = new Map(world.features.map((f) => [f.properties.name, f]));
const unmatched = roster.filter((c) => !byName.has(c.nameEn));
if (unmatched.length) {
  console.error("NO OUTLINE FOR:", unmatched.map((c) => `${c.id} (${c.nameEn})`).join(", "));
  process.exitCode = 1;
}

const round = (d, places) =>
  d.replace(/-?\d+\.\d+/g, (n) => {
    const v = Number(n).toFixed(places);
    return v.replace(/\.0+$/, "");
  });

const regions = {};
const seen = new Set();

for (const continent of ["europe", "africa", "asia", "americas"]) {
  const members = roster.filter(
    (c) => c.continent === continent && byName.has(c.nameEn),
  );

  const [west, south, east, north] =
    REGION_BOUNDS[continent];

  /*
   * Fitted to the frame's corner points rather than a polygon of them:
   * d3-geo treats polygons as spherical, where winding order decides
   * inside from outside, and a ring wound the other way is read as
   * "everything except this box" — which scaled every region out to the
   * whole globe.
   */
  const frame = {
    type: "MultiPoint",
    coordinates: [
      [west, south],
      [east, south],
      [east, north],
      [west, north],
    ],
  };

  const projection = geoMercator().fitExtent(
    [
      [PADDING, PADDING],
      [WIDTH - PADDING, HEIGHT - PADDING],
    ],
    frame,
  );

  /*
   * Clip to the frame. Without this a country merely overlapping the
   * edge — Russia in the European frame — contributes its entire
   * outline, most of it off-screen, and dwarfs everything else.
   */
  projection.clipExtent([
    [0, 0],
    [WIDTH, HEIGHT],
  ]);

  const path = geoPath(projection);

  /*
   * Context outlines: any country that lands inside the frame, so the
   * region reads as a map rather than as floating shapes. Drawn without
   * an id, so they can never be an answer.
   */
  const shapes = [];
  const clipped = [];
  for (const f of world.features) {
    const bounds = path.bounds(f);
    const [[x0, y0], [x1, y1]] = bounds;
    const onScreen =
      x1 > 0 && x0 < WIDTH && y1 > 0 && y0 < HEIGHT &&
      Number.isFinite(x0) && Number.isFinite(y0);
    if (!onScreen) continue;

    let member = members.find((c) => c.nameEn === f.properties.name);

    /* Demote a member whose centre of mass is outside the frame. */
    if (
      member &&
      !centroidInFrame(
        f,
        REGION_BOUNDS[continent],
      )
    ) {
      clipped.push(member.id);
      member = undefined;
    }

    /* Drop specks: unlabelled islands add bytes and nothing else. */
    if (!member && path.area(f) < MIN_CONTEXT_AREA) continue;

    const d = round(
      path(f) ?? "",
      member ? PRECISION_PLAYABLE : PRECISION_CONTEXT,
    );
    if (!d) continue;
    shapes.push({ id: member ? member.id : null, d });
    if (member) seen.add(member.id);
  }

  /* Answerable countries first is irrelevant to painting order, but a
   * stable sort keeps the generated file's diffs readable. */
  shapes.sort((a, b) => (a.id ?? "~").localeCompare(b.id ?? "~"));

  const playableIds = shapes
    .filter((s) => s.id)
    .map((s) => s.id)
    .sort();

  regions[continent] = {
    viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
    playableIds,
    shapes,
  };

  if (clipped.length) {
    console.log(`  ${continent}: context only — ${clipped.join(", ")}`);
  }

  const bytes = shapes.reduce((n, s) => n + s.d.length, 0);
  console.log(
    `${continent.padEnd(9)} ${String(playableIds.length).padStart(2)} playable, ` +
      `${String(shapes.length).padStart(3)} shapes, ${Math.round(bytes / 1024)} KB`,
  );
}

const header = `/*
 * GENERATED FILE — do not edit by hand.
 * Run \`node scripts/generate-map-data.mjs\` to rebuild.
 *
 * Country outlines from Natural Earth 110m (public domain), projected
 * per region with d3-geo's Mercator, clipped to the frame.
 * Shapes with a null id are context only and can never be an answer.
 */

export type MapRegionId =
  | "europe"
  | "africa"
  | "asia"
  | "americas";

export type MapShape = {
  id: string | null;
  d: string;
};

export type MapRegion = {
  viewBox: string;
  playableIds: string[];
  shapes: MapShape[];
};

export const mapRegions: Record<
  MapRegionId,
  MapRegion
> = `;

writeFileSync(
  "src/data/atlasMapPaths.ts",
  header + JSON.stringify(regions, null, 1) + ";\n",
);
/*
 * The playable-id lists go in their own tiny module. Round creation
 * needs to know which countries a region can ask about, and importing
 * that from the paths file would drag 40 KB of outlines into the main
 * bundle for every player, map round or not.
 */
const idsHeader = `/*
 * GENERATED FILE — do not edit by hand.
 * Run \`node scripts/generate-map-data.mjs\` to rebuild.
 *
 * Which countries each region can ask about. A roster country is left
 * out where its centre of mass falls outside that region's frame —
 * Russia on a European map — so it is drawn as context but never asked.
 */

import type { MapRegionId } from "./atlasMapPaths";

export const mapRegionIds: MapRegionId[] =
  ${JSON.stringify(Object.keys(regions))};

export const mapPlayableIds: Record<
  MapRegionId,
  string[]
> = `;

writeFileSync(
  "src/data/atlasMapRegions.ts",
  idsHeader +
    JSON.stringify(
      Object.fromEntries(
        Object.entries(regions).map(([k, v]) => [k, v.playableIds]),
      ),
      null,
      1,
    ) +
    ";\n",
);

const out = readFileSync("src/data/atlasMapPaths.ts");
console.log(
  `\nwrote src/data/atlasMapPaths.ts — ${Math.round(out.length / 1024)} KB raw, ` +
    `${Math.round(gzipSync(out).length / 1024)} KB gzipped`,
);
