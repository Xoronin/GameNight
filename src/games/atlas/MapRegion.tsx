import type { MapRegionId } from "../../data/atlasMapPaths";
import { useMapRegion } from "./useMapRegion";

/*
 * One region of the world, drawn from generated outlines.
 *
 * Shapes with no id are context: they make the frame read as a map
 * rather than as floating blobs, and are never answerable or clickable.
 * The countries that matter this round are drawn on top of them.
 */

type MapRegionViewProps = {
  region: MapRegionId;
  /** Drawn as the question — "which country is this?". */
  highlightId?: string | null;
  /** Countries in play this round; everything else stays context. */
  targetIds?: string[];
  /** Countries already correctly placed. */
  solvedIds?: string[];
  /** Country the player has picked up but not yet placed. */
  selectedId?: string | null;
  /** Shape the dragged chip is currently over, to light it up. */
  overId?: string | null;
  /**
   * Marks target shapes as drop targets. Off when it is not your turn,
   * so a stray drop cannot land on someone else's move.
   */
  droppable?: boolean;
  onShapeClick?: (
    countryId: string,
  ) => void;
  /** Shown in place of the map while its chunk is still loading. */
  loadingLabel: string;
};

function MapRegionView({
  region,
  highlightId,
  targetIds,
  solvedIds,
  selectedId,
  overId,
  droppable,
  onShapeClick,
  loadingLabel,
}: MapRegionViewProps) {
  const data = useMapRegion(region);

  if (!data) {
    return (
      <div className="atlasMapLoading">
        {loadingLabel}
      </div>
    );
  }

  const targets = new Set(
    targetIds ?? [],
  );

  const solved = new Set(
    solvedIds ?? [],
  );

  return (
    <div className="atlasMapFrame">
      <svg
        className="atlasMap"
        viewBox={data.viewBox}
        role="img"
      >
        {data.shapes.map(
          (shape, index) => {
            const isTarget =
              !!shape.id &&
              targets.has(shape.id);

            const isSolved =
              !!shape.id &&
              solved.has(shape.id);

            const isHighlight =
              !!shape.id &&
              shape.id ===
                highlightId;

            /*
             * Whether a shape carries an id is a detail of the generated
             * map data, not something a player should be able to see. A
             * country that is not in play this round is background,
             * however it got here — otherwise the map shows three greys
             * for two meanings and the middle one means nothing.
             */
            const inPlay =
              isTarget || isHighlight;

            const className = [
              "atlasMapShape",
              inPlay
                ? ""
                : "atlasMapContext",
              isTarget
                ? "target"
                : "",
              !!shape.id &&
              shape.id === overId
                ? "over"
                : "",
              isSolved
                ? "solved"
                : "",
              isHighlight
                ? "highlight"
                : "",
              !!shape.id &&
              shape.id ===
                selectedId
                ? "selected"
                : "",
            ]
              .filter(Boolean)
              .join(" ");

            const live =
              isTarget && !isSolved;

            return (
              <g
                key={`${
                  shape.id ??
                  "ctx"
                }-${index}`}
              >
                <path
                  d={shape.d}
                  className={className}
                />

                {/*
                 * A separate, invisible hit path with a fat
                 * screen-space stroke. On a phone the region map is
                 * only a couple of hundred pixels tall, and most
                 * European countries come out a few pixels across —
                 * far too small to tap. The stroke does not scale with
                 * the viewBox, so the target stays finger-sized
                 * however the map is sized.
                 */}
                {live && (
                  <path
                    d={shape.d}
                    className="atlasMapHit"
                    data-slot={
                      droppable
                        ? shape.id
                        : undefined
                    }
                    onClick={
                      onShapeClick &&
                      shape.id
                        ? () =>
                            onShapeClick(
                              shape.id!,
                            )
                        : undefined
                    }
                  />
                )}
              </g>
            );
          },
        )}
      </svg>
    </div>
  );
}

export default MapRegionView;
