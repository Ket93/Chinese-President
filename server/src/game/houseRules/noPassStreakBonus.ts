import type { OnComboPlayedHook } from './types.js';

/**
 * Stub: the config flag and per-round pass tracking (via trick.passedPlayerIds
 * history) are threaded through end-to-end, but the spec never defines what
 * the "bonus" actually is, so this intentionally does nothing yet.
 * TODO(house-rule): define the reward for never passing in a round.
 */
export const noPassStreakBonusHook: OnComboPlayedHook = (ctx) => {
  if (!ctx.config.houseRules.noPassStreakBonus) return;
};
