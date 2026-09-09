import {
  useEffect,
  useRef,
} from "react";

/*
 * Reveal a round on its own once everyone has answered.
 *
 * Only the host runs the write: every client watches the same round row
 * over realtime, so one writer is enough and several would race. The short
 * delay is deliberate — without it the last player's own answer is replaced
 * by the results in the same frame they tapped it.
 */
export const AUTO_REVEAL_DELAY_MS = 900;

type UseAutoRevealOptions = {
  /** Null while no round is loaded; changing it re-arms the reveal. */
  roundId: string | null;
  /** Everyone has answered and the round is still taking answers. */
  ready: boolean;
  isHost: boolean;
  onReveal: () => void;
  delayMs?: number;
};

export function useAutoReveal({
  roundId,
  ready,
  isHost,
  onReveal,
  delayMs = AUTO_REVEAL_DELAY_MS,
}: UseAutoRevealOptions) {
  const firedRef = useRef<
    string | null
  >(null);

  const onRevealRef =
    useRef(onReveal);

  /*
   * Held in a ref so a caller's inline callback does not re-arm the
   * timer on every render and push the reveal further away each time.
   */
  useEffect(() => {
    onRevealRef.current = onReveal;
  }, [onReveal]);

  useEffect(() => {
    if (
      !isHost ||
      !ready ||
      !roundId ||
      firedRef.current === roundId
    ) {
      return;
    }

    const timer =
      window.setTimeout(() => {
        firedRef.current = roundId;

        onRevealRef.current();
      }, delayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    isHost,
    ready,
    roundId,
    delayMs,
  ]);
}
