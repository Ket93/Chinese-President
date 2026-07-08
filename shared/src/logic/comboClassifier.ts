import { RANK_VALUE, type Card, type Rank } from '../types/card.js';
import type { Combo } from '../types/combo.js';
import type { RuleContext } from './ruleContext.js';

function groupByRank(cards: Card[]): Map<Rank, Card[]> {
  const groups = new Map<Rank, Card[]>();
  for (const card of cards) {
    const group = groups.get(card.rank);
    if (group) group.push(card);
    else groups.set(card.rank, [card]);
  }
  return groups;
}

/**
 * Classifies a set of cards into one of the five legal combo shapes, or null
 * if it matches none of them (bare triples, triple+single, double straights,
 * straight flushes, and rockets all correctly fall through to null here).
 */
export function classifyCombo(cards: Card[], ctx: RuleContext): Combo | null {
  if (cards.length === 0) return null;

  const groups = groupByRank(cards);
  const ranks = [...groups.keys()];

  if (cards.length === 1) {
    return { kind: 'single', rank: cards[0]!.rank, cards };
  }

  if (cards.length === 2 && groups.size === 1) {
    return { kind: 'pair', rank: ranks[0]!, cards };
  }

  if (cards.length === 4 && groups.size === 1) {
    return { kind: 'bomb', rank: ranks[0]!, cards };
  }

  if (cards.length === 5 && groups.size === 2) {
    const [rankA, rankB] = ranks as [Rank, Rank];
    const sizeA = groups.get(rankA)!.length;
    const sizeB = groups.get(rankB)!.length;
    if (sizeA === 3 && sizeB === 2) {
      return { kind: 'fullHouse', tripleRank: rankA, pairRank: rankB, cards };
    }
    if (sizeA === 2 && sizeB === 3) {
      return { kind: 'fullHouse', tripleRank: rankB, pairRank: rankA, cards };
    }
  }

  if (cards.length === ctx.runLength && groups.size === cards.length) {
    if (ranks.includes('2')) return null;
    const sorted = [...ranks].sort((a, b) => RANK_VALUE[a] - RANK_VALUE[b]);
    for (let i = 1; i < sorted.length; i++) {
      if (RANK_VALUE[sorted[i]!] !== RANK_VALUE[sorted[i - 1]!] + 1) return null;
    }
    return { kind: 'run', length: ctx.runLength, lowRank: sorted[0]!, highRank: sorted[sorted.length - 1]!, cards };
  }

  return null;
}
