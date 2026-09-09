import { AlarmClock } from "lucide-react";
import {
  useEffect,
  useState,
} from "react";
import { playTimeWarning } from "../utils/sounds";

/*
 * A warning that the clock is nearly out.
 *
 * Deliberately a slim banner pinned to the top rather than a centred
 * popup: it fires at the exact moment you are trying to act, so it must
 * not cover the board. It also ignores pointer events.
 *
 * The sound fires once per countdown, not once per second — `roundKey`
 * re-arms it, so a new round or turn warns again.
 */

type LowTimeBannerProps = {
  /** Seconds remaining, or null when nothing is being timed. */
  secondsLeft: number | null;
  /** Identifies the current countdown, so each one warns once. */
  roundKey: string | null;
  label: string;
  /** Warn at or below this many seconds. */
  threshold?: number;
};

function LowTimeBanner({
  secondsLeft,
  roundKey,
  label,
  threshold = 5,
}: LowTimeBannerProps) {
  const [warnedKey, setWarnedKey] =
    useState<string | null>(null);

  const active =
    secondsLeft !== null &&
    secondsLeft > 0 &&
    secondsLeft <= threshold;

  const shouldWarn =
    active &&
    !!roundKey &&
    roundKey !== warnedKey;

  if (shouldWarn) {
    setWarnedKey(roundKey);
  }

  useEffect(() => {
    if (!warnedKey) {
      return;
    }

    playTimeWarning();
  }, [warnedKey]);

  if (!active) {
    return null;
  }

  return (
    <div
      className="lowTimeBanner"
      role="alert"
    >
      <AlarmClock size={16} />

      {label}

      <strong>{secondsLeft}s</strong>
    </div>
  );
}

export default LowTimeBanner;
