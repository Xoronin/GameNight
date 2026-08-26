export type Profile = {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  totalGames: number;
  totalWins: number;
  createdAt: string;
  updatedAt: string;
};