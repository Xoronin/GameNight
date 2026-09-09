/*
 * The link that opens the join screen with the code already filled in.
 * Built from the running origin so it works the same on a preview deploy,
 * a phone on the local network, and production.
 */
export function joinUrlFor(
  roomCode: string,
  origin = typeof window ===
  "undefined"
    ? ""
    : window.location.origin,
): string {
  const code = roomCode
    .trim()
    .toUpperCase();

  return `${origin}/join?code=${encodeURIComponent(code)}`;
}
