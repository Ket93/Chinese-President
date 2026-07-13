import { SUIT_VALUE, type Rank } from '../types/card.js';
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
 * Suit tiebreak power for a combo, used only when two combos tie on rank
 * (e.g. two singles of the same rank, or two pairs/bombs of the same rank).
 * Takes the highest-suited card among those matching the combo's defining
 * rank — for a run that's just the single high-rank card; for pair/
 * fullHouse/bomb it's the best-suited card within that rank's group.
 * Suit order (low to high) is fixed regardless of revolution: Clubs <
 * Diamonds < Hearts < Spades.
 */
function suitPower(combo: Combo): number {
  const rank = definingRank(combo);
  const relevantSuits = combo.cards.filter((c) => c.rank === rank).map((c) => SUIT_VALUE[c.suit]);
  return Math.max(...relevantSuits);
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
    const rankDiff = rankValue(a.rank, ctx.revolutionActive) - rankValue(b.rank, ctx.revolutionActive);
    return rankDiff !== 0 ? rankDiff : suitPower(a) - suitPower(b);
  }

  if (a.kind !== b.kind) {
    throw new Error(`Cannot compare mismatched combo kinds: ${a.kind} vs ${b.kind}`);
  }
  if (a.kind === 'run' && b.kind === 'run' && a.length !== b.length) {
    throw new Error(`Cannot compare runs of different length: ${a.length} vs ${b.length}`);
  }

  const rankDiff = rankValue(definingRank(a), ctx.revolutionActive) - rankValue(definingRank(b), ctx.revolutionActive);
  return rankDiff !== 0 ? rankDiff : suitPower(a) - suitPower(b);
}
