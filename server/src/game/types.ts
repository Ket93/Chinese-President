import type { Card, GameConfig, SeatRankTitle } from '@chinese-president/shared';

export interface ServerPlayer {
  id: string;
  name: string;
  seatIndex: number;
  isBot: boolean;
  connected: boolean;
  socketId: string | null;
  playerToken: string;
  rankTitle?: SeatRankTitle;
}

export interface RoundEngineParams {
  roundNumber: number;
  players: ServerPlayer[];
  config: GameConfig;
  /** Previous round's Asshole — leads directly, skipping the 3-club search. Omit for round 1. */
  leaderIdOverride?: string;
  /** Previous round's rank titles, used to build the exchange transaction queue for round > 1. */
  previousRankTitles?: Map<string, SeatRankTitle>;
}
