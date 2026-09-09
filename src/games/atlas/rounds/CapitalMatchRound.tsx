import {
  Check,
  Heart,
  X,
} from "lucide-react";
import {
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
  };
};

type DragState = {
  capitalId: string;
  dx: number;
  dy: number;
  moved: boolean;
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

  const startRef = useRef({
    x: 0,
    y: 0,
  });

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

    startRef.current = {
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

    const dx =
      event.clientX -
      startRef.current.x;

    const dy =
      event.clientY -
      startRef.current.y;

    setDrag({
      ...drag,
      dx,
      dy,
      moved:
        drag.moved ||
        Math.hypot(dx, dy) >
          DRAG_THRESHOLD,
    });
  };

  const handlePointerUp = (
    event: React.PointerEvent,
  ) => {
    if (!drag) {
      return;
    }

    const current = drag;

    setDrag(null);

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
        pool.length > 0 && (
          <div
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
