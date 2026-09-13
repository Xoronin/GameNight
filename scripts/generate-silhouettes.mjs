/*
 * Generates src/data/scaleSilhouettes.ts — one silhouette per object for
 * the Scale game.
 *
 * Run with: node scripts/generate-silhouettes.mjs
 * Add --sheet to also write a contact sheet for eyeballing the set.
 *
 * The shapes are built here from primitives rather than drawn by hand or
 * imported from an icon set. Two reasons. Proportions come out right by
 * construction: each object is described in its own real units (a bus is
 * 11 m by 4.4 m) and normalised afterwards, so nothing is eyeballed. And
 * the app ships no third-party artwork and carries no attribution
 * obligation — the output is committed, so there is no build step either.
 *
 * Everything is one flat colour with no internal detail, so overlapping
 * primitives simply union. Rings use evenodd to keep their hole.
 */
import { writeFileSync } from "fs";

const PRECISION = 2;

const round = (n) =>
  Number(n.toFixed(PRECISION));

/* ---- primitives -------------------------------------------------- */
/* Each returns { d, box: [minX, minY, maxX, maxY] }. */

function rect(x, y, w, h) {
  return {
    d: `M${round(x)} ${round(y)}h${round(w)}v${round(h)}h${round(-w)}z`,
    box: [x, y, x + w, y + h],
  };
}

function poly(points) {
  const [first, ...rest] = points;

  return {
    d:
      `M${round(first[0])} ${round(first[1])}` +
      rest
        .map((p) => `L${round(p[0])} ${round(p[1])}`)
        .join("") +
      "z",
    box: [
      Math.min(...points.map((p) => p[0])),
      Math.min(...points.map((p) => p[1])),
      Math.max(...points.map((p) => p[0])),
      Math.max(...points.map((p) => p[1])),
    ],
  };
}

function ellipse(cx, cy, rx, ry) {
  return {
    d:
      `M${round(cx - rx)} ${round(cy)}` +
      `a${round(rx)} ${round(ry)} 0 1 0 ${round(rx * 2)} 0` +
      `a${round(rx)} ${round(ry)} 0 1 0 ${round(-rx * 2)} 0z`,
    box: [cx - rx, cy - ry, cx + rx, cy + ry],
  };
}

const circle = (cx, cy, r) =>
  ellipse(cx, cy, r, r);

/* A circle with a hole, for wheels. */
function ring(cx, cy, outer, inner) {
  const o = circle(cx, cy, outer);
  const i = circle(cx, cy, inner);

  return {
    d: `${o.d}${i.d}`,
    box: o.box,
    evenodd: true,
  };
}

/*
 * A limb: a quad from one width to another. Legs, necks and trunks are
 * all this shape, which is why they read as one family.
 */
function taper(x1, y1, w1, x2, y2, w2) {
  return poly([
    [x1 - w1 / 2, y1],
    [x1 + w1 / 2, y1],
    [x2 + w2 / 2, y2],
    [x2 - w2 / 2, y2],
  ]);
}

/*
 * Cuts shapes out of another one. A silhouette is one flat colour, so a
 * seam or a handle can only be shown as a hole — and a hole only
 * subtracts when it shares a path with what it cuts, which is why this
 * concatenates them rather than returning separate parts. Without it a
 * fridge, a door and a wardrobe are the same rectangle.
 */
function cut(shape, ...holes) {
  return {
    d: shape.d + holes.map((h) => h.d).join(""),
    box: shape.box,
    evenodd: true,
  };
}

/*
 * A limb that bends: tapers laid end to end along a path. Two long
 * tapers make a visible kink where they meet, which is what a neck must
 * not have, so anything curved is built from five or six short ones.
 */
function chain(points, widths) {
  const out = [];

  for (let i = 0; i < points.length - 1; i += 1) {
    out.push(
      taper(
        points[i][0],
        points[i][1],
        widths[i],
        points[i + 1][0],
        points[i + 1][1],
        widths[i + 1],
      ),
    );
  }

  return out;
}

/* A rectangle with the top corners rounded off. */
function dome(x, y, w, h, r) {
  const right = x + w;
  const bottom = y + h;

  return {
    d:
      `M${round(x)} ${round(bottom)}` +
      `V${round(y + r)}` +
      `a${round(r)} ${round(r)} 0 0 1 ${round(r)} ${round(-r)}` +
      `h${round(w - r * 2)}` +
      `a${round(r)} ${round(r)} 0 0 1 ${round(r)} ${round(r)}` +
      `V${round(bottom)}z`,
    box: [x, y, right, bottom],
  };
}

/* ---- object definitions ------------------------------------------ */
/*
 * Each `draw` works in whatever units suit it, with y counting down from
 * the top of the object. Nothing has to add up to a particular number:
 * the drawing is normalised against its own bounding box afterwards, so
 * only the proportions between the parts matter.
 */

/*
 * A note on what is in here. These primitives are very good at rigid
 * man-made things and expensive at organic ones: the bus, the bicycle and
 * the hydrant were right first time, while the flamingo took three passes
 * and still read as an ostrich, so it was dropped. The set leans towards
 * objects deliberately. That suits the game anyway — a kitchen counter is
 * something your eye has a real opinion about.
 */
const OBJECTS = [
  { key: "coffee_cup", draw: () => [
    poly([[-26, 8], [26, 8], [20, 92], [-20, 92]]),
    rect(-30, 2, 60, 8),
    ring(30, 38, 22, 12),
  ] },
  { key: "smartphone", draw: () => [
    dome(-24, 0, 48, 100, 6),
  ] },
  { key: "wine_glass", draw: () => [
    poly([[-26, 4], [26, 4], [16, 46], [-16, 46]]),
    rect(-4, 44, 8, 44),
    ellipse(0, 92, 26, 8),
  ] },
  { key: "toaster", draw: () => [
    dome(-46, 12, 92, 88, 12),
    rect(-26, 6, 16, 8),
    rect(10, 6, 16, 8),
  ] },
  { key: "football", draw: () => [
    circle(0, 50, 50),
  ] },
  { key: "bowling_pin", draw: () => [
    ellipse(0, 74, 24, 26),
    ellipse(0, 22, 13, 22),
    rect(-9, 30, 18, 30),
  ] },
  { key: "wine_bottle", draw: () => [
    dome(-16, 38, 32, 62, 9),
    rect(-6, 6, 12, 34),
    rect(-8, 0, 16, 8),
  ] },
  { key: "microwave", draw: () => [
    rect(-88, 0, 176, 100),
    rect(56, 14, 24, 60),
  ] },
  { key: "suitcase", draw: () => [
    dome(-58, 14, 116, 86, 8),
    chain([[-14, 14], [-14, 2], [14, 2], [14, 14]], [7, 7, 7, 7]),
  ] },
  { key: "fire_hydrant", draw: () => [
    dome(-17, 16, 34, 84, 10),
    circle(0, 12, 9),
    rect(-27, 34, 54, 13),
    rect(-24, 88, 48, 12),
  ] },
  { key: "traffic_cone", draw: () => [
    poly([[-12, 0], [12, 0], [34, 86], [-34, 86]]),
    rect(-46, 86, 92, 14),
  ] },
  { key: "desk", draw: () => [
    rect(-90, 0, 180, 14),
    rect(-84, 14, 16, 86),
    rect(68, 14, 16, 86),
  ] },
  { key: "park_bench", draw: () => [
    rect(-70, 52, 140, 12),
    rect(-70, 0, 140, 10),
    rect(-70, 16, 140, 10),
    rect(-70, 32, 140, 10),
    rect(-64, 64, 12, 36),
    rect(52, 64, 12, 36),
  ] },
  { key: "washing_machine", draw: () => [
    rect(-46, 0, 92, 100),
    ring(0, 58, 28, 18),
    rect(-36, 8, 72, 12),
  ] },
  { key: "guitar", draw: () => [
    ellipse(0, 78, 26, 22),
    ellipse(0, 55, 20, 17),
    rect(-5, 10, 10, 46),
    rect(-9, 0, 18, 12),
  ] },
  { key: "chair", draw: () => [
    rect(-26, 0, 10, 62),
    rect(-26, 56, 56, 10),
    rect(-24, 66, 8, 34),
    rect(20, 66, 8, 34),
    rect(-22, 4, 46, 8),
    rect(-22, 22, 46, 8),
  ] },
  { key: "bicycle", draw: () => [
    ring(-27, 68, 32, 23),
    ring(27, 68, 32, 23),
    taper(-27, 68, 5, -4, 30, 5),
    taper(-4, 30, 5, 14, 66, 5),
    taper(-27, 68, 5, 16, 44, 5),
    taper(16, 44, 5, 27, 68, 5),
    rect(-16, 26, 22, 5),
    taper(16, 44, 5, 20, 8, 5),
    rect(6, 4, 22, 5),
  ] },
  { key: "wheelie_bin", draw: () => [
    poly([[-34, 12], [34, 12], [30, 88], [-30, 88]]),
    rect(-38, 2, 76, 12),
    ring(-22, 90, 10, 4),
    ring(22, 90, 10, 4),
  ] },
  { key: "office_chair", draw: () => [
    rect(-24, 0, 48, 44),
    rect(-30, 44, 60, 10),
    rect(-5, 54, 10, 26),
    taper(0, 80, 10, -34, 96, 6),
    taper(0, 80, 10, 34, 96, 6),
    ring(-34, 96, 6, 2),
    ring(34, 96, 6, 2),
  ] },
  { key: "double_bass", draw: () => [
    ellipse(0, 76, 30, 24),
    ellipse(0, 52, 23, 19),
    rect(-6, 10, 12, 44),
    dome(-11, 0, 22, 14, 6),
  ] },
  { key: "postbox", draw: () => [
    dome(-26, 0, 52, 100, 26),
    rect(-16, 26, 32, 6),
  ] },
  { key: "person", draw: () => [
    circle(0, 9, 9),
    taper(0, 18, 20, 0, 55, 17),
    taper(-8, 20, 6, -13, 46, 5),
    taper(8, 20, 6, 13, 46, 5),
    taper(-5, 53, 9, -6, 100, 7),
    taper(5, 53, 9, 6, 100, 7),
  ] },
  { key: "penguin", draw: () => [
    ellipse(0, 58, 26, 34),
    ellipse(2, 18, 17, 18),
    poly([[14, 16], [30, 21], [14, 25]]),
    taper(-22, 48, 10, -30, 76, 6),
    poly([[-8, 92], [-24, 100], [-4, 100]]),
    poly([[8, 92], [24, 100], [4, 100]]),
  ] },
  { key: "door", draw: () => [
    rect(-21, 0, 42, 100),
    circle(14, 55, 3),
  ] },
  { key: "fridge", draw: () => [
    cut(
      rect(-38, 0, 76, 100),
      rect(-34, 33, 68, 6),
      rect(20, 12, 8, 17),
      rect(20, 45, 8, 17),
    ),
  ] },
  { key: "wardrobe", draw: () => [
    cut(
      rect(-44, 0, 88, 92),
      rect(-3, 6, 6, 78),
      circle(-12, 48, 4.5),
      circle(12, 48, 4.5),
    ),
    rect(-40, 92, 12, 8),
    rect(28, 92, 12, 8),
  ] },
  { key: "phone_box", draw: () => [
    rect(-32, 8, 64, 92),
    dome(-36, 0, 72, 12, 4),
    rect(-24, 18, 48, 46),
  ] },
  { key: "car", draw: () => [
    dome(-66, 30, 132, 52, 10),
    dome(-34, 6, 62, 28, 12),
    ring(-40, 82, 18, 8),
    ring(40, 82, 18, 8),
  ] },
  { key: "street_sign", draw: () => [
    rect(-4, 22, 8, 76),
    dome(-30, 0, 60, 24, 4),
    rect(-12, 97, 24, 3),
  ] },
  { key: "ladder", draw: () => [
    rect(-22, 0, 8, 100),
    rect(14, 0, 8, 100),
    rect(-22, 12, 44, 6),
    rect(-22, 32, 44, 6),
    rect(-22, 52, 44, 6),
    rect(-22, 72, 44, 6),
  ] },
  { key: "traffic_light", draw: () => [
    dome(-11, 0, 22, 34, 8),
    rect(-4, 32, 8, 62),
    rect(-13, 94, 26, 6),
  ] },
  { key: "basketball_hoop", draw: () => [
    rect(-6, 24, 10, 74),
    cut(
      rect(-30, 0, 56, 30),
      rect(-19, 11, 34, 15),
    ),
    rect(24, 24, 20, 4),
    poly([[26, 28], [42, 28], [38, 38], [30, 38]]),
    rect(-20, 97, 40, 3),
  ] },
  { key: "lorry", draw: () => [
    rect(-110, 4, 150, 78),
    dome(40, 30, 62, 52, 8),
    ring(-80, 82, 17, 8),
    ring(-42, 82, 17, 8),
    ring(62, 82, 17, 8),
  ] },
  { key: "lamp_post", draw: () => [
    rect(-3, 8, 6, 90),
    poly([[-11, 8], [11, 8], [7, 0], [-7, 0]]),
    rect(-9, 97, 18, 3),
  ] },
  { key: "bus_double_decker", draw: () => [
    dome(-125, 0, 250, 84, 16),
    ring(-72, 84, 17, 8),
    ring(70, 84, 17, 8),
  ] },
  {
    /*
     * A giraffe is half legs. Drawing the body first and hanging short
     * legs off it — the obvious way round — produces a horse.
     */
    key: "giraffe",
    draw: () => [
      taper(-14, 52, 7, -18, 100, 5),
      taper(-5, 54, 7, -8, 100, 5),
      taper(14, 52, 7, 18, 100, 5),
      taper(23, 54, 7, 27, 100, 5),
      ellipse(4, 48, 27, 13),
      chain(
        [[12, 46], [4, 36], [-6, 27], [-15, 18], [-22, 12]],
        [17, 14, 12, 10, 9],
      ),
      ellipse(-26, 12, 9, 6),
      poly([[-32, 10], [-40, 14], [-31, 17]]),
      taper(-25, 8, 2.5, -28, 1, 2.5),
      taper(-19, 8, 2.5, -22, 1, 2.5),
      chain([[28, 43], [33, 55], [34, 68]], [5, 3, 2]),
    ],
  },
  { key: "tree_oak", draw: () => [
    rect(-8, 52, 16, 48),
    circle(0, 32, 34),
    circle(-26, 44, 22),
    circle(26, 44, 22),
    circle(-14, 16, 20),
    circle(16, 16, 20),
  ] },
];



/* ---- emit --------------------------------------------------------- */

function build(object) {
  /* chain() returns several tapers, so a draw list is one level deep. */
  const parts = object.draw().flat();

  const box = parts.reduce(
    (acc, part) => [
      Math.min(acc[0], part.box[0]),
      Math.min(acc[1], part.box[1]),
      Math.max(acc[2], part.box[2]),
      Math.max(acc[3], part.box[3]),
    ],
    [Infinity, Infinity, -Infinity, -Infinity],
  );

  /*
   * Normalise against the drawing's own bounding box, not the units it
   * was written in. The silhouette is the object, so its ink is its
   * height — and the caller asks for a pixel height and expects to get
   * exactly that. Scaling by the declared units instead would draw
   * anything that does not happen to span 0..100 short of what was
   * asked for, which in a game about heights is a wrong answer rather
   * than a cosmetic one.
   */
  const scale =
    100 / (box[3] - box[1]);

  const width = (box[2] - box[0]) * scale;
  const height = 100;

  return {
    key: object.key,
    width: round(width),
    height: round(height),
    paths: parts.map((part) => part.d),
    evenodd: parts.some((part) => part.evenodd),
    offset: [round(-box[0] * scale), round(-box[1] * scale)],
    scale: round(scale),
  };
}

const built = OBJECTS.map(build);

const lines = [
  `/*`,
  ` * GENERATED FILE — do not edit by hand.`,
  ` * Run \`node scripts/generate-silhouettes.mjs\` to rebuild.`,
  ` *`,
  ` * Silhouettes for the Scale game, built from geometric primitives in`,
  ` * that script. Each one is drawn in its own units and normalised so its`,
  ` * height is exactly 100, which means \`width\` is the object's true`,
  ` * aspect ratio and a caller can scale it by height alone.`,
  ` *`,
  ` * No third-party artwork: nothing here needs attribution.`,
  ` */`,
  ``,
  `export type Silhouette = {`,
  `  /** Natural width when the height is 100. */`,
  `  width: number;`,
  `  /** Always 100; kept so callers never assume it. */`,
  `  height: number;`,
  `  paths: string[];`,
  `  /** Shapes with holes need evenodd, or a wheel fills in solid. */`,
  `  evenodd: boolean;`,
  `  /** Translate applied before scaling, to sit the art in its box. */`,
  `  offset: [number, number];`,
  `  scale: number;`,
  `};`,
  ``,
  `export const silhouettes: Record<`,
  `  string,`,
  `  Silhouette`,
  `> = {`,
];

for (const item of built) {
  lines.push(`  ${item.key}: {`);
  lines.push(`    width: ${item.width},`);
  lines.push(`    height: ${item.height},`);
  lines.push(`    evenodd: ${item.evenodd},`);
  lines.push(
    `    offset: [${item.offset[0]}, ${item.offset[1]}],`,
  );
  lines.push(`    scale: ${item.scale},`);
  lines.push(`    paths: [`);

  for (const d of item.paths) {
    lines.push(`      ${JSON.stringify(d)},`);
  }

  lines.push(`    ],`);
  lines.push(`  },`);
}

lines.push(`};`);
lines.push(``);
lines.push(
  `export const silhouetteKeys: string[] =`,
);
lines.push(`  Object.keys(silhouettes);`);
lines.push(``);

const out = "src/data/scaleSilhouettes.ts";

writeFileSync(out, lines.join("\n"));

console.log(
  `wrote ${out}: ${built.length} silhouettes, ${(
    lines.join("\n").length / 1024
  ).toFixed(1)}KB`,
);

/* ---- optional contact sheet --------------------------------------- */

if (process.argv.includes("--sheet")) {
  const cells = built
    .map((item) => {
      const inner = item.paths
        .map(
          (d) =>
            `<path d="${d}" fill="#111" fill-rule="${
              item.evenodd ? "evenodd" : "nonzero"
            }"/>`,
        )
        .join("");

      return `<figure>
  <svg viewBox="0 0 ${item.width} 100" height="150" role="img" aria-label="${item.key}">
    <g transform="scale(${item.scale}) translate(${
        item.offset[0] / item.scale
      } ${item.offset[1] / item.scale})">${inner}</g>
  </svg>
  <figcaption>${item.key}<br><small>${item.width} &times; 100</small></figcaption>
</figure>`;
    })
    .join("\n");

  const sheet = `<!doctype html><meta charset="utf-8">
<style>
  body { background:#fff; color:#111; font:13px system-ui; margin:0; padding:24px; }
  .grid { display:flex; flex-wrap:wrap; gap:28px; align-items:flex-end; }
  figure { margin:0; display:flex; flex-direction:column; align-items:center; gap:8px; }
  figcaption { text-align:center; color:#555; }
  svg { overflow:visible; }
</style>
<div class="grid">${cells}</div>`;

  const sheetPath =
    process.env.SHEET_OUT ??
    "/tmp/silhouette-sheet.html";

  writeFileSync(sheetPath, sheet);

  console.log(`wrote ${sheetPath}`);
}
