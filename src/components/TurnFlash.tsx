import {
  useEffect,
  useState,
} from "react";
import { playYourTurn } from "../utils/sounds";

/*
 * An unmissable, non-blocking announcement that it is your turn.
 *
 * Fires whenever `turnKey` changes to a new non-null value, so a game
 * can key it on whatever identifies one turn (round id plus player id,
 * usually) and get exactly one flash per turn — not one per re-render
 * or per realtime event.
 *
 * It sits above the board but ignores pointer events, so it never
 * costs you the moment it is announcing.
 */

type TurnFlashProps = {
  /** A new value announces a new turn; null announces nothing. */
  turnKey: string | null;
  label: string;
  /** Optional second line, e.g. what to do on this turn. */
  hint?: string;
  durationMs?: number;
};

function TurnFlash({
  turnKey,
  label,
  hint,
  durationMs = 1600,
}: TurnFlashProps) {
  const [
    announcedKey,
    setAnnouncedKey,
  ] = useState<string | null>(
    null,
  );

  const [visible, setVisible] =
    useState(false);

  /*
   * Adjusted during render rather than in an effect: React's
   * documented pattern for reacting to a changed value, and it means
   * the flash paints on the same frame the turn arrives.
   */
  if (
    turnKey &&
    turnKey !== announcedKey
  ) {
    setAnnouncedKey(turnKey);
    setVisible(true);
  }

  useEffect(() => {
    if (!announcedKey) {
      return;
    }

    playYourTurn();
  }, [announcedKey]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const timer = window.setTimeout(
      () => setVisible(false),
      durationMs,
    );

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    visible,
    announcedKey,
    durationMs,
  ]);

  if (!visible) {
    return null;
  }

  return (
    <div
      className="turnFlash"
      role="status"
      aria-live="polite"
    >
      <div
        className="turnFlashCard"
        /* Keeps the CSS animation exactly as long as the timeout. */
        style={{
          animationDuration: `${durationMs}ms`,
        }}
      >
        <strong>{label}</strong>

        {hint && <span>{hint}</span>}
      </div>
    </div>
  );
}

export default TurnFlash;
