import { getGameLibraryEntry } from "../data/gameLibrary";
import type { Room } from "../types/room";

export type TournamentStatus =
  | { isTournament: false }
  | {
      isTournament: true;
      isLastGame: boolean;
      nextGameEntry:
        | ReturnType<
            typeof getGameLibraryEntry
          >
        | undefined;
      currentGameNumber: number;
      totalGames: number;
    };

export function getTournamentStatus(
  room: Room | null | undefined,
): TournamentStatus {
  if (
    !room?.tournamentGames ||
    room.tournamentGames.length === 0
  ) {
    return { isTournament: false };
  }

  const nextIndex =
    room.tournamentIndex + 1;

  const isLastGame =
    nextIndex >=
    room.tournamentGames.length;

  const nextGameEntry = isLastGame
    ? undefined
    : getGameLibraryEntry(
        room.tournamentGames[
          nextIndex
        ],
      );

  return {
    isTournament: true,
    isLastGame,
    nextGameEntry,
    currentGameNumber:
      room.tournamentIndex + 1,
    totalGames:
      room.tournamentGames.length,
  };
}
