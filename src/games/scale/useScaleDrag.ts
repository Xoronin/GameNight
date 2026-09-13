import {
  useCallback,
  useRef,
  useState,
} from "react";

/*
 * The drag that sets the guess.
 *
 * The mapping from finger to ratio is logarithmic, for the same reason the
 * scoring is: the useful range runs from a twelfth of the reference to
 * twelve times it, and spreading that linearly across a phone would give
 * the whole bottom half of the range about four pixels. In log space every
 * doubling costs the same travel, so a mug against a bus is as adjustable
 * as a door against a person.
 */

export const MIN_RATIO = 1 / 14;
export const MAX_RATIO = 14;

const LOG_MIN = Math.log(MIN_RATIO);
const LOG_MAX = Math.log(MAX_RATIO);

/** Track position 0..1 to a ratio. */
export function ratioAt(
  position: number,
): number {
  const clamped = Math.min(
    1,
    Math.max(0, position),
  );

  return Math.exp(
    LOG_MIN +
      clamped * (LOG_MAX - LOG_MIN),
  );
}

/** And back, for placing the handle. */
export function positionOf(
  ratio: number,
): number {
  if (ratio <= 0) {
    return 0;
  }

  return Math.min(
    1,
    Math.max(
      0,
      (Math.log(ratio) - LOG_MIN) /
        (LOG_MAX - LOG_MIN),
    ),
  );
}

/** One arrow-key press, as a fraction of the track. */
const KEY_STEP = 0.02;

export function useScaleDrag(options: {
  initial?: number;
  disabled?: boolean;
  onChange?: (
    ratio: number,
  ) => void;
}) {
  const [position, setPosition] =
    useState(() =>
      positionOf(
        options.initial ?? 1,
      ),
    );

  const [dragging, setDragging] =
    useState(false);

  const trackRef =
    useRef<HTMLDivElement>(null);

  const move = useCallback(
    (clientY: number) => {
      const track =
        trackRef.current;

      if (!track) {
        return;
      }

      const box =
        track.getBoundingClientRect();

      if (box.height === 0) {
        return;
      }

      /* Up is more, so the track is read from the bottom. */
      const next =
        1 -
        (clientY - box.top) /
          box.height;

      const clamped = Math.min(
        1,
        Math.max(0, next),
      );

      setPosition(clamped);

      options.onChange?.(
        ratioAt(clamped),
      );
    },
    [options],
  );

  const step = useCallback(
    (delta: number) => {
      setPosition((current) => {
        const next = Math.min(
          1,
          Math.max(
            0,
            current + delta,
          ),
        );

        options.onChange?.(
          ratioAt(next),
        );

        return next;
      });
    },
    [options],
  );

  const handleProps = {
    onPointerDown: (
      event: React.PointerEvent,
    ) => {
      if (options.disabled) {
        return;
      }

      event.preventDefault();

      (
        event.currentTarget as HTMLElement
      ).setPointerCapture(
        event.pointerId,
      );

      setDragging(true);

      move(event.clientY);
    },
    onPointerMove: (
      event: React.PointerEvent,
    ) => {
      if (
        !dragging ||
        options.disabled
      ) {
        return;
      }

      move(event.clientY);
    },
    onPointerUp: (
      event: React.PointerEvent,
    ) => {
      if (
        (
          event.currentTarget as HTMLElement
        ).hasPointerCapture(
          event.pointerId,
        )
      ) {
        (
          event.currentTarget as HTMLElement
        ).releasePointerCapture(
          event.pointerId,
        );
      }

      setDragging(false);
    },
    onKeyDown: (
      event: React.KeyboardEvent,
    ) => {
      if (options.disabled) {
        return;
      }

      const by =
        event.key === "ArrowUp" ||
        event.key === "ArrowRight"
          ? KEY_STEP
          : event.key ===
                "ArrowDown" ||
              event.key ===
                "ArrowLeft"
            ? -KEY_STEP
            : event.key === "PageUp"
              ? KEY_STEP * 5
              : event.key ===
                  "PageDown"
                ? -KEY_STEP * 5
                : 0;

      if (by === 0) {
        return;
      }

      event.preventDefault();

      step(by);
    },
  };

  return {
    trackRef,
    position,
    ratio: ratioAt(position),
    dragging,
    handleProps,
  };
}
