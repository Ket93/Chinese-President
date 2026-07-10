export type ThreeClubsTiebreak = 'random' | 'mostLowCards';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;

export interface HouseRules {
  revolution: boolean;
  /** Wired end-to-end (config flag + pass-count tracking) but currently a no-op stub — see server/src/game/houseRules/noPassStreakBonus.ts */
  noPassStreakBonus: boolean;
  eightEndsRound: boolean;
  /** Architecture hook only, not implemented — see server/src/game/houseRules/ */
  threeThreeThreeClearsBomb: boolean;
}

export interface GameConfig {
  deckCount: 1 | 2;
  runLength: number;
  threeClubsTiebreak: ThreeClubsTiebreak;
  retryFailedRequest: boolean;
  houseRules: HouseRules;
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  deckCount: 1,
  runLength: 5,
  threeClubsTiebreak: 'random',
  retryFailedRequest: false,
  houseRules: {
    revolution: false,
    noPassStreakBonus: false,
    eightEndsRound: false,
    threeThreeThreeClearsBomb: false,
  },
};
