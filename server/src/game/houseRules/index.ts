import { eightEndsRoundHook } from './eightEndsRound.js';
import { noPassStreakBonusHook } from './noPassStreakBonus.js';
import { revolutionHook } from './revolution.js';
import type { HouseRuleHookContext } from './types.js';

const hooks = [revolutionHook, eightEndsRoundHook, noPassStreakBonusHook];

/**
 * Extensibility point for regional variants (3-3-3 clears bomb, etc.): add a
 * new hook file exporting an OnComboPlayedHook and register it here — no
 * changes needed to RoundEngine itself.
 */
export function applyPostPlayHooks(ctx: HouseRuleHookContext): void {
  for (const hook of hooks) hook(ctx);
}

export type { HouseRuleHookContext, OnComboPlayedHook } from './types.js';
