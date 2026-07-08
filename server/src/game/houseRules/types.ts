import type { Combo, GameConfig, RoundState } from '@chinese-president/shared';

export interface HouseRuleHookContext {
  config: GameConfig;
  state: RoundState;
  combo: Combo;
  playerId: string;
  /** Immediately ends the current trick with `winnerId` as the winner, bypassing normal turn advancement. */
  forceResolveTrick: (winnerId: string) => void;
}

export type OnComboPlayedHook = (ctx: HouseRuleHookContext) => void;
