import type { FlagSpec } from "./atlasCountries";

/*
 * The paintable regions of a flag, in draw order.
 *
 * Kept beside the flag specs rather than in the renderer so that both
 * the SVG component and the scoring code agree on region ids without
 * the service having to import a component.
 */

export type FlagRegion = {
  id: string;
  /** The correct colour for this region. */
  color: string;
};

export function flagRegions(
  spec: FlagSpec,
): FlagRegion[] {
  if (spec.kind === "stripes") {
    return spec.bands.map(
      (color, index) => ({
        id: `band-${index}`,
        color,
      }),
    );
  }

  if (
    spec.kind === "centeredCross"
  ) {
    return [
      {
        id: "field",
        color: spec.field,
      },
      {
        id: "cross",
        color: spec.cross,
      },
    ];
  }

  const regions: FlagRegion[] = [
    {
      id: "field",
      color: spec.field,
    },
  ];

  if (spec.border) {
    regions.push({
      id: "border",
      color: spec.border,
    });
  }

  regions.push({
    id: "cross",
    color: spec.cross,
  });

  return regions;
}
