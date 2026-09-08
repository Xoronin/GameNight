import {
  flagRegions,
} from "../../data/atlasFlags";
import type {
  FlagRegion,
} from "../../data/atlasFlags";
import type { FlagSpec } from "../../data/atlasCountries";

/*
 * Renders a flag from its declarative spec.
 *
 * `regionColors` lets the paint round drive the fill per region instead
 * of using the real colours: any region missing from the map is drawn
 * as an empty, outlined slot. The region ids produced here are the same
 * ones `flagRegions` returns, so the paint UI and the renderer always
 * agree on what is clickable.
 */

const VIEW_W = 90;
const VIEW_H = 60;

/** Cross bar thickness and hoist offset, in viewBox units. */
const CROSS_W = 12;
const NORDIC_X = 30;

type FlagProps = {
  spec: FlagSpec;
  /**
   * Region id → colour. When omitted the flag draws its real colours.
   * When present, unmapped regions render empty.
   */
  regionColors?: Record<
    string,
    string
  >;
  /** Called with a region id when that region is clicked. */
  onRegionClick?: (
    regionId: string,
  ) => void;
  /** Region drawn with a selection outline. */
  activeRegion?: string | null;
  className?: string;
  title?: string;
};

function Flag({
  spec,
  regionColors,
  onRegionClick,
  activeRegion,
  className,
  title,
}: FlagProps) {
  const painting = Boolean(
    regionColors,
  );

  const fillFor = (
    region: FlagRegion,
  ) =>
    painting
      ? (regionColors?.[
          region.id
        ] ?? "transparent")
      : region.color;

  const interactive = Boolean(
    onRegionClick,
  );

  const regionProps = (
    region: FlagRegion,
  ) => ({
    fill: fillFor(region),
    className: [
      "flagRegion",
      interactive
        ? "flagRegionInteractive"
        : "",
      activeRegion === region.id
        ? "flagRegionActive"
        : "",
      painting &&
      !regionColors?.[region.id]
        ? "flagRegionEmpty"
        : "",
    ]
      .filter(Boolean)
      .join(" "),
    onClick: onRegionClick
      ? () =>
          onRegionClick(region.id)
      : undefined,
  });

  const regions =
    flagRegions(spec);

  const byId = (id: string) =>
    regions.find(
      (region) =>
        region.id === id,
    )!;

  return (
    <svg
      className={`atlasFlag ${
        className ?? ""
      }`}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      role="img"
      aria-label={title}
      preserveAspectRatio="none"
    >
      {title && (
        <title>{title}</title>
      )}

      {spec.kind ===
        "stripes" && (
        <StripeBands
          spec={spec}
          regions={regions}
          regionProps={
            regionProps
          }
        />
      )}

      {spec.kind ===
        "nordicCross" && (
        <>
          <rect
            x={0}
            y={0}
            width={VIEW_W}
            height={VIEW_H}
            {...regionProps(
              byId("field"),
            )}
          />

          {spec.border && (
            <CrossBars
              x={NORDIC_X}
              width={
                CROSS_W + 8
              }
              {...regionProps(
                byId("border"),
              )}
            />
          )}

          <CrossBars
            x={NORDIC_X}
            width={CROSS_W}
            {...regionProps(
              byId("cross"),
            )}
          />
        </>
      )}

      {spec.kind ===
        "centeredCross" && (
        <>
          <rect
            x={0}
            y={0}
            width={VIEW_W}
            height={VIEW_H}
            {...regionProps(
              byId("field"),
            )}
          />

          <CrossBars
            x={VIEW_W / 2}
            width={VIEW_H * 0.2}
            armLength={
              VIEW_H * 0.72
            }
            {...regionProps(
              byId("cross"),
            )}
          />
        </>
      )}

      <rect
        x={0}
        y={0}
        width={VIEW_W}
        height={VIEW_H}
        className="atlasFlagFrame"
      />
    </svg>
  );
}

function StripeBands({
  spec,
  regions,
  regionProps,
}: {
  spec: Extract<
    FlagSpec,
    { kind: "stripes" }
  >;
  regions: FlagRegion[];
  regionProps: (
    region: FlagRegion,
  ) => Record<string, unknown>;
}) {
  const weights =
    spec.weights ??
    spec.bands.map(() => 1);

  const total = weights.reduce(
    (sum, weight) =>
      sum + weight,
    0,
  );

  const horizontal =
    spec.direction ===
    "horizontal";

  const span = horizontal
    ? VIEW_H
    : VIEW_W;

  /*
   * Each band's start is the sum of the bands before it. Computed up
   * front rather than accumulated inside the map, so rendering stays
   * free of side effects.
   */
  const offsets = weights.reduce<
    number[]
  >((acc, _weight, index) => {
    acc.push(
      index === 0
        ? 0
        : acc[index - 1] +
            (weights[index - 1] /
              total) *
              span,
    );

    return acc;
  }, []);

  return (
    <>
      {regions.map(
        (region, index) => {
          const size =
            (weights[index] /
              total) *
            span;

          const start =
            offsets[index];

          return (
            <rect
              key={region.id}
              x={
                horizontal
                  ? 0
                  : start
              }
              y={
                horizontal
                  ? start
                  : 0
              }
              width={
                horizontal
                  ? VIEW_W
                  : size
              }
              height={
                horizontal
                  ? size
                  : VIEW_H
              }
              {...regionProps(
                region,
              )}
            />
          );
        },
      )}
    </>
  );
}

/**
 * The two bars of a cross, centred on `x` horizontally.
 *
 * `armLength` makes the cross free-standing: a Nordic cross runs to
 * every edge, but the Swiss cross floats clear of them, so passing a
 * length shortens both bars about their centre.
 */
function CrossBars({
  x,
  width,
  armLength,
  ...rest
}: {
  x: number;
  width: number;
  armLength?: number;
} & Record<string, unknown>) {
  const vLength =
    armLength ?? VIEW_H;

  const hLength =
    armLength ?? VIEW_W;

  return (
    <g {...rest}>
      <rect
        x={x - width / 2}
        y={
          VIEW_H / 2 -
          vLength / 2
        }
        width={width}
        height={vLength}
      />

      <rect
        x={x - hLength / 2}
        y={
          VIEW_H / 2 - width / 2
        }
        width={hLength}
        height={width}
      />
    </g>
  );
}

export default Flag;
