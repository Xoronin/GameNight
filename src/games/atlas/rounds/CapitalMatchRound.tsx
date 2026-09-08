import { Check, X } from "lucide-react";
import {
  useRef,
  useState,
} from "react";
import {
  capitalName,
  countryName,
  getAtlasCountry,
} from "../../../data/atlasCountries";
import type { AtlasRoundPayload } from "../../../types/game";
import Flag from "../Flag";

/*
 * Drag each capital onto its country.
 *
 * Built on pointer events rather than HTML5 drag-and-drop, which does
 * not fire on touch at all — this is a party game, so phones matter.
 * A drag that never really moves is treated as a tap instead, giving a
 * select-then-place path for anyone who finds dragging fiddly (and for
 * keyboard-free accessibility on small screens).
 */

/** Pointer travel, in px, past which a press counts as a drag. */
const DRAG_THRESHOLD = 6;

type CapitalMatchRoundProps = {
  payload: Extract<
    AtlasRoundPayload,
    { type: "capital_match" }
  >;
  language: "en" | "de";
  /** Country id → the country id whose capital was dropped on it. */
  assignments: Record<
    string,
    string
  >;
  onAssign: (
    countryId: string,
    capitalCountryId: string,
  ) => void;
  onUnassign: (
    countryId: string,
  ) => void;
  disabled: boolean;
  revealed: boolean;
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
  assignments,
  onAssign,
  onUnassign,
  disabled,
  revealed,
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

  const assignedCapitals =
    new Set(
      Object.values(assignments),
    );

  const place = (
    capitalId: string,
    countryId: string,
  ) => {
    /*
     * A slot holds one capital and a capital sits in one slot, so
     * placing has to evict both sides of any existing pairing.
     */
    for (const [
      slotId,
      heldCapital,
    ] of Object.entries(
      assignments,
    )) {
      if (
        heldCapital === capitalId &&
        slotId !== countryId
      ) {
        onUnassign(slotId);
      }
    }

    onAssign(
      countryId,
      capitalId,
    );

    setSelected(null);
  };

  const handlePointerDown = (
    event: React.PointerEvent,
    capitalId: string,
  ) => {
    if (disabled) {
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
      /* Treat it as a tap: select, or deselect if already selected. */
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
     * finds the slot underneath it rather than the chip itself.
     */
    const target =
      document.elementFromPoint(
        event.clientX,
        event.clientY,
      );

    const slot =
      target?.closest(
        "[data-slot]",
      );

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

  const renderChip = (
    capitalId: string,
    inSlot: boolean,
  ) => {
    const country =
      getAtlasCountry(capitalId);

    if (!country) {
      return null;
    }

    const isDragging =
      drag?.capitalId ===
        capitalId && drag.moved;

    return (
      <button
        key={capitalId}
        type="button"
        disabled={disabled}
        className={[
          "atlasCapitalChip",
          isDragging
            ? "dragging"
            : "",
          selected === capitalId
            ? "selected"
            : "",
          inSlot ? "inSlot" : "",
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
        onPointerDown={(event) =>
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
  };

  const pool =
    payload.capitalOrder.filter(
      (capitalId) =>
        !assignedCapitals.has(
          capitalId,
        ),
    );

  return (
    <div className="atlasMatchRound">
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

            const held =
              assignments[
                countryId
              ];

            const isCorrect =
              held === countryId;

            return (
              <div
                key={countryId}
                data-slot={
                  disabled
                    ? undefined
                    : countryId
                }
                className={[
                  "atlasMatchSlot",
                  revealed &&
                  isCorrect
                    ? "correct"
                    : "",
                  revealed &&
                  held &&
                  !isCorrect
                    ? "incorrect"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => {
                  if (
                    disabled
                  ) {
                    return;
                  }

                  if (selected) {
                    place(
                      selected,
                      countryId,
                    );

                    return;
                  }

                  if (held) {
                    onUnassign(
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
                  {held ? (
                    renderChip(
                      held,
                      true,
                    )
                  ) : (
                    <span className="atlasMatchEmpty" />
                  )}
                </span>

                {revealed &&
                  isCorrect && (
                    <Check
                      size={17}
                    />
                  )}

                {revealed &&
                  held &&
                  !isCorrect && (
                    <X size={17} />
                  )}

                {revealed &&
                  !isCorrect && (
                    <span className="atlasMatchTruth">
                      {capitalName(
                        country,
                        language,
                      )}
                    </span>
                  )}
              </div>
            );
          },
        )}
      </div>

      {!revealed && (
        <div className="atlasMatchPool">
          {pool.length === 0 ? (
            <span className="atlasMatchPoolEmpty" />
          ) : (
            pool.map((capitalId) =>
              renderChip(
                capitalId,
                false,
              ),
            )
          )}
        </div>
      )}
    </div>
  );
}

export default CapitalMatchRound;
