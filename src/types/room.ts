export type RoomStatus = "lobby" | "playing" | "finished";

export type Room = {
  id: string;
  code: string;
  hostPlayerId: string | null;
  selectedGame: string;
  status: RoomStatus;
  createdAt: string;
};