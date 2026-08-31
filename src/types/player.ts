export type Player = {
  id: string;
  name: string;
  isHost: boolean;
  profileId?: string | null;
};

export type RoomPlayer = Player & {
  roomId: string;
  score: number;
  joinedAt: string;
};