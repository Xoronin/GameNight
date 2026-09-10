import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

/*
 * Drag-and-drop for the shared turn-based boards.
 *
 * Extracted so the capital board and the map board share one
 * implementation: the pointer handling here has several details that
 * are easy to get wrong and were fixed once already — the page
 * scrolling under a drag, the chip tracking that scroll, and the pool
 * sitting inside the edge zone so picking a chip up scrolled the board
 * away.
 *
 * Built on pointer events rather than HTML5 drag-and-drop, which does
 * not fire on touch at all. A press that never really moves counts as a
 * tap, giving a select-then-place path as well.
 */

/** Pointer travel, in px, past which a press counts as a drag. */
const DRAG_THRESHOLD = 6;

/*
 * How close to the top of the screen a drag has to get before the page
 * scrolls under it, and how sharply it accelerates from there.
 */
const EDGE_ZONE = 96;
const EDGE_DIVISOR = 5;

type DragState = {
  itemId: string;
  dx: number;
  dy: number;
  moved: boolean;
};

type DragOrigin = {
  x: number;
  y: number;
  scrollY: number;
};

/** The drop target under a screen point, if any. */
function slotUnder(
  x: number,
  y: number,
): string | null {
  /*
   * The dragged chip is pointer-events:none while dragging, so this
   * finds the slot underneath rather than the chip itself.
   */
  return (
    document
      .elementFromPoint(x, y)
      ?.closest("[data-slot]")
      ?.getAttribute("data-slot") ??
    null
  );
}

export function useBoardDrag({
  interactive,
  onDrop,
}: {
  interactive: boolean;
  onDrop: (
    slotId: string,
    itemId: string,
  ) => void;
}) {
  const [drag, setDrag] =
    useState<DragState | null>(
      null,
    );

  const [selected, setSelected] =
    useState<string | null>(null);

  /*
   * The slot the chip is currently over, so the board can light it up.
   * A dragged chip holds the pointer capture, so CSS :hover never fires
   * on what is underneath it — the drop target has to be found by hit
   * testing, exactly as the drop itself is.
   */
  const [overSlot, setOverSlot] =
    useState<string | null>(null);

  /** Mirrors drag.moved so syncDrag can read it without a dependency. */
  const movedRef = useRef(false);

  const originRef =
    useRef<DragOrigin | null>(
      null,
    );

  const pointerRef = useRef({
    x: 0,
    y: 0,
  });

  /** The pool element, so the edge zone can stop at its top edge. */
  const poolRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  /*
   * Recomputes the chip's offset from the pointer *and* the page
   * scroll. Without the scroll term the chip slides out from under the
   * finger the moment the page moves beneath it.
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

    const moved =
      movedRef.current ||
      Math.hypot(
        travelX,
        travelY,
      ) > DRAG_THRESHOLD;

    movedRef.current = moved;

    setDrag((previous) =>
      previous
        ? {
            ...previous,
            dx: travelX,
            dy:
              travelY +
              (window.scrollY -
                origin.scrollY),
            moved,
          }
        : previous,
    );

    setOverSlot(
      moved
        ? slotUnder(
            pointerRef.current.x,
            pointerRef.current.y,
          )
        : null,
    );
  }, []);

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
       * Measuring against the window instead means picking up a chip —
       * which happens inside the pool — instantly scrolls the page out
       * from under the drag.
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
            (floor - EDGE_ZONE)) /
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

  const endDrag = () => {
    setDrag(null);
    setOverSlot(null);
    movedRef.current = false;
    originRef.current = null;
  };

  /** Handlers and state for one draggable item. */
  const itemProps = (
    itemId: string,
  ) => ({
    isDragging:
      drag?.itemId === itemId &&
      drag.moved,
    isSelected: selected === itemId,
    style:
      drag?.itemId === itemId &&
      drag.moved
        ? {
            transform: `translate(${drag.dx}px, ${drag.dy}px)`,
          }
        : undefined,
    handlers: {
      onPointerDown: (
        event: React.PointerEvent,
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
          itemId,
          dx: 0,
          dy: 0,
          moved: false,
        });
      },
      onPointerMove: (
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
      },
      onPointerUp: (
        event: React.PointerEvent,
      ) => {
        if (!drag) {
          return;
        }

        const current = drag;

        endDrag();

        if (!current.moved) {
          /* A press that never moved: treat it as a tap. */
          setSelected((previous) =>
            previous ===
            current.itemId
              ? null
              : current.itemId,
          );

          return;
        }

        const slotId = slotUnder(
          event.clientX,
          event.clientY,
        );

        if (slotId) {
          onDrop(
            slotId,
            current.itemId,
          );

          setSelected(null);
        }
      },
      onPointerCancel: endDrag,
    },
  });

  /** Click handling for a slot, for the tap-then-place path. */
  const slotProps = (
    slotId: string,
  ) => ({
    isOver: overSlot === slotId,
    onClick: () => {
      if (!interactive || !selected) {
        return;
      }

      onDrop(slotId, selected);
      setSelected(null);
    },
  });

  return {
    selected,
    setSelected,
    overSlot,
    poolRef,
    itemProps,
    slotProps,
  };
}
