/*
 * Keeps the app honest about whether it is still hearing from the server.
 *
 * Supabase rejoins a dropped channel on its own, but nothing replays what
 * changed while it was gone — so a phone that was locked for a minute comes
 * back to a board frozen two rounds ago, with no sign anything is wrong.
 * This tracks the connection and hands out a generation number that every
 * subscribing hook keeps in its effect dependencies: bumping it tears the
 * subscriptions down, re-establishes them and refetches, which is exactly
 * what recovering from a gap requires.
 */

export type ConnectionStatus =
  | "live"
  | "reconnecting"
  | "offline";

/*
 * Coming back to a tab that was hidden for a moment is not a reconnect —
 * only a gap long enough for the socket to have died quietly is worth a
 * round of refetches.
 */
const STALE_AFTER_MS = 10_000;

type Snapshot = {
  status: ConnectionStatus;
  /** Increments on every recovery; deps that include it refetch. */
  generation: number;
};

const isOnline = () =>
  typeof navigator ===
    "undefined" ||
  navigator.onLine;

let snapshot: Snapshot = {
  status: isOnline()
    ? "live"
    : "offline",
  generation: 0,
};

const listeners =
  new Set<() => void>();

function publish(next: Snapshot) {
  snapshot = next;

  for (const listener of listeners) {
    listener();
  }
}

function setStatus(
  status: ConnectionStatus,
) {
  if (
    snapshot.status !== status
  ) {
    publish({
      ...snapshot,
      status,
    });
  }
}

/** Back in touch: refetch whatever was missed. */
function recover() {
  if (!isOnline()) {
    setStatus("offline");

    return;
  }

  publish({
    status: "live",
    generation:
      snapshot.generation + 1,
  });
}

export function getConnection() {
  return snapshot;
}

export function subscribeToConnection(
  listener: () => void,
) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

/*
 * Passed to every channel's subscribe(). A channel that errors and later
 * comes back is the clearest signal of a gap, so that round trip is what
 * triggers a recovery. The broken flag is shared on purpose: when several
 * channels drop together, coming back should cost one round of refetches,
 * not one per channel.
 */
let broken = false;

export function reportChannelStatus(
  channelStatus: string,
) {
  if (
    channelStatus === "SUBSCRIBED"
  ) {
    if (broken) {
      broken = false;

      recover();
    } else if (isOnline()) {
      setStatus("live");
    }

    return;
  }

  if (
    channelStatus ===
      "CHANNEL_ERROR" ||
    channelStatus === "TIMED_OUT"
  ) {
    broken = true;

    setStatus(
      isOnline()
        ? "reconnecting"
        : "offline",
    );
  }
}

if (typeof window !== "undefined") {
  let hiddenAt: number | null =
    null;

  window.addEventListener(
    "online",
    recover,
  );

  window.addEventListener(
    "offline",
    () => setStatus("offline"),
  );

  document.addEventListener(
    "visibilitychange",
    () => {
      if (
        document.visibilityState ===
        "hidden"
      ) {
        hiddenAt = Date.now();

        return;
      }

      /*
       * Phones suspend timers and sockets in the background, and the
       * socket often reports nothing on the way back — so a long absence
       * is treated as a gap whether or not a channel complained.
       */
      const away =
        hiddenAt === null
          ? 0
          : Date.now() - hiddenAt;

      hiddenAt = null;

      if (away >= STALE_AFTER_MS) {
        recover();
      }
    },
  );
}
