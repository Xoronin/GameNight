export type Player = {
  id: string;
  name: string;
  isHost: boolean;
};

export type RoomPlayer = Player & {
  roomId: string;
  score: number;
  joinedAt: string;
};