import { definingRank } from '@chinese-president/shared';
import type { OnComboPlayedHook } from './types.js';

/**
 * Playing an 8 as the defining rank of a single/pair/full-house immediately
 * ends the trick. A run merely passing through 8 does not trigger it.
 */
export const eightEndsRoundHook: OnComboPlayedHook = (ctx) => {
  if (!ctx.config.houseRules.eightEndsRound) return;
  if (ctx.combo.kind !== 'single' && ctx.combo.kind !== 'pair' && ctx.combo.kind !== 'fullHouse') return;
  if (definingRank(ctx.combo) !== '8') return;
  ctx.forceResolveTrick(ctx.playerId);
};
