import {
  Check,
  Heart,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  capitalName,
  countryName,
  getAtlasCountry,
} from "../../../data/atlasCountries";
import type { AtlasPlacement, AtlasRoundPayload } from "../../../types/game";
import type { RoomPlayer } from "../../../types/player";
import Flag from "../Flag";

/*
 * The shared, turn-based capital board.
 *
 * Ten countries and ten capitals are laid out for everyone, and players
 * take turns placing a single capital. A correct placement locks onto
 * the board and scores; a wrong one costs the placer a life.
 *
 * Dragging is built on pointer events rather than HTML5 drag-and-drop,
 * which does not fire on touch at all — this is a party game, so phones
 * matter. A press that never really moves counts as a tap, giving a
 * select-then-place path as well.
 */

/** Pointer travel, in px, past which a press counts as a drag. */
const DRAG_THRESHOLD = 6;

/*
 * How close to a screen edge a drag has to get before the page starts
 * scrolling under it, and how sharply it accelerates from there.
 */
const EDGE_ZONE = 96;
const EDGE_DIVISOR = 5;

type CapitalMatchRoundProps = {
  payload: Extract<
    AtlasRoundPayload,
    { type: "capital_match" }
  >;
  language: "en" | "de";
  placements: AtlasPlacement[];
  players: RoomPlayer[];
  currentPlayerId: string | null;
  localPlayerId: string;
  playerLives: Record<
    string,
    number
  >;
  outPlayerIds: string[];
  startingLives: number;
  onPlace: (
    countryId: string,
    capitalCountryId: string,
  ) => void;
  /** True while a placement is in flight, or the round is over. */
  disabled: boolean;
  revealed: boolean;
  labels: {
    yourTurn: string;
    waitingFor: string;
    outOfLives: string;
    placedBy: string;
    dragHint: string;
  };
};

type DragState = {
  capitalId: string;
  dx: number;
  dy: number;
  moved: boolean;
};

type DragOrigin = {
  x: number;
  y: number;
  scrollY: number;
};

function CapitalMatchRound({
  payload,
  language,
  placements,
  players,
  currentPlayerId,
  localPlayerId,
  playerLives,
  outPlayerIds,
  startingLives,
  onPlace,
  disabled,
  revealed,
  labels,
}: CapitalMatchRoundProps) {
  const [drag, setDrag] =
    useState<DragState | null>(
      null,
    );

  const [selected, setSelected] =
    useState<string | null>(null);

  const originRef =
    useRef<DragOrigin | null>(
      null,
    );

  /* Latest pointer position, for the edge-scroll loop to read. */
  const pointerRef = useRef({
    x: 0,
    y: 0,
  });

  const poolRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  /*
   * Recomputes the chip's offset from the pointer *and* the page
   * scroll. Without the scroll term the chip would slide out from under
   * the finger the moment the page moved beneath it.
   */
  const syncDrag = useCallback(() => {
    const origin = originRef.current;

    if (!origin) {
      return;
    }

    const travelX =
      pointerRef.current.x -
      origin.x;

    const travelY =
      pointerRef.current.y -
      origin.y;

    setDrag((previous) =>
      previous
        ? {
            ...previous,
            dx: travelX,
            dy:
              travelY +
              (window.scrollY -
                origin.scrollY),
            moved:
              previous.moved ||
              Math.hypot(
                travelX,
                travelY,
              ) > DRAG_THRESHOLD,
          }
        : previous,
    );
  }, []);

  /* The board is derived from the placement log, not local state. */
  const solvedBy = new Map<
    string,
    string
  >();

  for (const placement of placements) {
    if (placement.isCorrect) {
      solvedBy.set(
        placement.countryId,
        placement.placedBy,
      );
    }
  }

  const lastWrong = [
    ...placements,
  ]
    .reverse()
    .find(
      (placement) =>
        !placement.isCorrect,
    );

  const myTurn =
    currentPlayerId ===
    localPlayerId;

  const interactive =
    myTurn && !disabled && !revealed;

  const pool =
    payload.capitalOrder.filter(
      (capitalId) =>
        !solvedBy.has(capitalId),
    );

  const playerName = (
    playerId: string,
  ) =>
    players.find(
      (player) =>
        player.id === playerId,
    )?.name ?? "?";

  const place = (
    capitalId: string,
    countryId: string,
  ) => {
    if (
      !interactive ||
      solvedBy.has(countryId)
    ) {
      return;
    }

    onPlace(countryId, capitalId);
    setSelected(null);
  };

  const handlePointerDown = (
    event: React.PointerEvent,
    capitalId: string,
  ) => {
    if (!interactive) {
      return;
    }

    originRef.current = {
      x: event.clientX,
      y: event.clientY,
      scrollY: window.scrollY,
    };

    pointerRef.current = {
      x: event.clientX,
      y: event.clientY,
    };

    event.currentTarget.setPointerCapture(
      event.pointerId,
    );

    setDrag({
      capitalId,
      dx: 0,
      dy: 0,
      moved: false,
    });
  };

  const handlePointerMove = (
    event: React.PointerEvent,
  ) => {
    if (!drag) {
      return;
    }

    pointerRef.current = {
      x: event.clientX,
      y: event.clientY,
    };

    syncDrag();
  };

  /*
   * While a drag is in flight, holding near the top or bottom of the
   * screen scrolls the page. On a phone the board is far taller than
   * the viewport, so without this the slots you have scrolled past
   * simply cannot be reached — the chip has nowhere to go.
   */
  const dragging = !!drag?.moved;

  useEffect(() => {
    if (!dragging) {
      return;
    }

    let frame = 0;

    const step = () => {
      const y = pointerRef.current.y;

      /*
       * The pool is pinned to the bottom of the screen, so the usable
       * board ends at its top edge, not at the bottom of the window.
       * Measuring against the window instead would mean picking up a
       * chip — which happens inside the pool — instantly scrolled the
       * page out from under the drag.
       */
      const poolTop =
        poolRef.current?.getBoundingClientRect()
          .top ??
        window.innerHeight;

      const floor = Math.min(
        poolTop,
        window.innerHeight,
      );

      let delta = 0;

      if (y < EDGE_ZONE) {
        delta = -Math.ceil(
          (EDGE_ZONE - y) /
            EDGE_DIVISOR,
        );
      } else if (
        y < floor &&
        y > floor - EDGE_ZONE
      ) {
        delta = Math.ceil(
          (y -
            (floor -
              EDGE_ZONE)) /
            EDGE_DIVISOR,
        );
      }

      if (delta !== 0) {
        window.scrollBy(0, delta);

        /* The page moved, so the chip's offset has to follow it. */
        syncDrag();
      }

      frame =
        window.requestAnimationFrame(
          step,
        );
    };

    frame =
      window.requestAnimationFrame(
        step,
      );

    return () => {
      window.cancelAnimationFrame(
        frame,
      );
    };
  }, [dragging, syncDrag]);

  const handlePointerUp = (
    event: React.PointerEvent,
  ) => {
    if (!drag) {
      return;
    }

    const current = drag;

    setDrag(null);
    originRef.current = null;

    if (!current.moved) {
      setSelected((previous) =>
        previous ===
        current.capitalId
          ? null
          : current.capitalId,
      );

      return;
    }

    /*
     * The dragged chip is pointer-events:none while dragging, so this
     * finds the slot underneath rather than the chip itself.
     */
    const slot = document
      .elementFromPoint(
        event.clientX,
        event.clientY,
      )
      ?.closest("[data-slot]");

    const countryId =
      slot?.getAttribute(
        "data-slot",
      );

    if (countryId) {
      place(
        current.capitalId,
        countryId,
      );
    }
  };

  return (
    <div className="atlasMatchRound">
      <div
        className={`atlasTurnBanner ${
          myTurn ? "mine" : ""
        }`}
      >
        {revealed
          ? null
          : myTurn
            ? labels.yourTurn
            : `${labels.waitingFor} ${playerName(
                currentPlayerId ?? "",
              )}`}
      </div>

      <div className="atlasLives">
        {players.map((player) => {
          const isOut =
            outPlayerIds.includes(
              player.id,
            );

          const lives =
            playerLives[player.id] ??
            startingLives;

          return (
            <div
              key={player.id}
              className={[
                "atlasLifeRow",
                player.id ===
                currentPlayerId
                  ? "current"
                  : "",
                isOut ? "out" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span>
                {player.name}
              </span>

              <span className="atlasHearts">
                {Array.from(
                  {
                    length:
                      startingLives,
                  },
                  (_unused, index) => (
                    <Heart
                      key={index}
                      size={13}
                      className={
                        index < lives
                          ? "filled"
                          : ""
                      }
                    />
                  ),
                )}
              </span>

              {isOut && (
                <span className="atlasOutTag">
                  {labels.outOfLives}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {lastWrong && !revealed && (
        <div className="atlasLastWrong">
          <X size={15} />

          {playerName(
            lastWrong.placedBy,
          )}
          {": "}
          {capitalName(
            getAtlasCountry(
              lastWrong.capitalCountryId,
            )!,
            language,
          )}
          {" → "}
          {countryName(
            getAtlasCountry(
              lastWrong.countryId,
            )!,
            language,
          )}
        </div>
      )}

      <div className="atlasMatchSlots">
        {payload.countryIds.map(
          (countryId) => {
            const country =
              getAtlasCountry(
                countryId,
              );

            if (!country) {
              return null;
            }

            const solver =
              solvedBy.get(countryId);

            return (
              <div
                key={countryId}
                data-slot={
                  interactive &&
                  !solver
                    ? countryId
                    : undefined
                }
                className={[
                  "atlasMatchSlot",
                  solver
                    ? "correct"
                    : "",
                  interactive &&
                  !solver &&
                  selected
                    ? "droppable"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => {
                  if (
                    selected &&
                    !solver
                  ) {
                    place(
                      selected,
                      countryId,
                    );
                  }
                }}
              >
                <span className="atlasMatchFlag">
                  <Flag
                    spec={
                      country.flag
                    }
                  />
                </span>

                <span className="atlasMatchCountry">
                  {countryName(
                    country,
                    language,
                  )}
                </span>

                <span className="atlasMatchDrop">
                  {solver ? (
                    <span className="atlasCapitalChip solved">
                      <Check
                        size={14}
                      />

                      {capitalName(
                        country,
                        language,
                      )}
                    </span>
                  ) : revealed ? (
                    <span className="atlasMatchTruth">
                      {capitalName(
                        country,
                        language,
                      )}
                    </span>
                  ) : (
                    <span className="atlasMatchEmpty" />
                  )}
                </span>

                {solver && (
                  <span className="atlasMatchPlacer">
                    {labels.placedBy}{" "}
                    {playerName(
                      solver,
                    )}
                  </span>
                )}
              </div>
            );
          },
        )}
      </div>

      {!revealed &&
        interactive &&
        pool.length > 0 && (
          <p className="atlasDragHint">
            {labels.dragHint}
          </p>
        )}

      {!revealed &&
        pool.length > 0 && (
          <div
            ref={poolRef}
            className={`atlasMatchPool ${
              interactive
                ? "active"
                : ""
            }`}
          >
            {pool.map((capitalId) => {
              const country =
                getAtlasCountry(
                  capitalId,
                );

              if (!country) {
                return null;
              }

              const isDragging =
                drag?.capitalId ===
                  capitalId &&
                drag.moved;

              return (
                <button
                  key={capitalId}
                  type="button"
                  disabled={
                    !interactive
                  }
                  className={[
                    "atlasCapitalChip",
                    isDragging
                      ? "dragging"
                      : "",
                    selected ===
                    capitalId
                      ? "selected"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={
                    isDragging
                      ? {
                          transform: `translate(${drag.dx}px, ${drag.dy}px)`,
                        }
                      : undefined
                  }
                  onPointerDown={(
                    event,
                  ) =>
                    handlePointerDown(
                      event,
                      capitalId,
                    )
                  }
                  onPointerMove={
                    handlePointerMove
                  }
                  onPointerUp={
                    handlePointerUp
                  }
                  onPointerCancel={() =>
                    setDrag(null)
                  }
                >
                  {capitalName(
                    country,
                    language,
                  )}
                </button>
              );
            })}
          </div>
        )}
    </div>
  );
}

export default CapitalMatchRound;
