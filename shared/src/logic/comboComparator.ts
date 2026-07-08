import type { Rank } from '../types/card.js';
import type { Combo } from '../types/combo.js';
import { rankValue } from './rankOrder.js';
import type { RuleContext } from './ruleContext.js';

export function definingRank(combo: Combo): Rank {
  switch (combo.kind) {
    case 'single':
    case 'pair':
    case 'bomb':
      return combo.rank;
    case 'fullHouse':
      return combo.tripleRank;
    case 'run':
      return combo.highRank;
  }
}

/**
 * Compares two combos that are already known to be comparable (bomb vs
 * anything, or same kind + same length). Returns >0 if `a` beats `b`, <0 if
 * `b` beats `a`. Callers must not invoke this for two non-bomb combos of
 * different kinds (or different-length runs) — that comparison is undefined
 * and should be rejected as illegal before reaching here.
 */
export function compareCombo(a: Combo, b: Combo, ctx: RuleContext): number {
  const aIsBomb = a.kind === 'bomb';
  const bIsBomb = b.kind === 'bomb';

  if (aIsBomb && !bIsBomb) return 1;
  if (bIsBomb && !aIsBomb) return -1;

  if (aIsBomb && bIsBomb) {
    return rankValue(a.rank, ctx.revolutionActive) - rankValue(b.rank, ctx.revolutionActive);
  }

  if (a.kind !== b.kind) {
    throw new Error(`Cannot compare mismatched combo kinds: ${a.kind} vs ${b.kind}`);
  }
  if (a.kind === 'run' && b.kind === 'run' && a.length !== b.length) {
    throw new Error(`Cannot compare runs of different length: ${a.length} vs ${b.length}`);
  }

  return rankValue(definingRank(a), ctx.revolutionActive) - rankValue(definingRank(b), ctx.revolutionActive);
}
