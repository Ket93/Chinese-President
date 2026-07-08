import { RANKS, RANK_VALUE, type Card, type Rank } from '../types/card.js';
import type { Combo } from '../types/combo.js';
import { isValidPlay } from './comboValidator.js';
import type { RuleContext } from './ruleContext.js';

function groupByRank(hand: Card[]): Map<Rank, Card[]> {
  const groups = new Map<Rank, Card[]>();
  for (const card of hand) {
    const group = groups.get(card.rank);
    if (group) group.push(card);
    else groups.set(card.rank, [card]);
  }
  return groups;
}

/**
 * Enumerates every combo shape the hand can physically form, then filters
 * through isValidPlay against the current table combo. Hand sizes are small
 * (at most ~27 cards even at 8 players / 2 decks), so brute-force enumeration
 * is trivially fast — no need for anything cleverer.
 *
 * Used by AI bots for decision-making and by the client for instant
 * play/invalid feedback; the server's isValidPlay call remains the sole
 * source of truth.
 */
export function generateLegalMoves(hand: Card[], currentTableCombo: Combo | null, ctx: RuleContext): Combo[] {
  const groups = groupByRank(hand);
  const candidates: Card[][] = [];

  for (const [, cards] of groups) {
    if (cards.length >= 1) candidates.push([cards[0]!]); // single
    if (cards.length >= 2) candidates.push(cards.slice(0, 2)); // pair
    if (cards.length >= 4) candidates.push(cards.slice(0, 4)); // bomb
  }

  // Full house: one representative per viable triple rank, paired with the
  // lowest available distinct kicker rank (comparison only depends on the
  // triple's rank, so the kicker choice doesn't affect legality).
  for (const [tripleRank, tripleCards] of groups) {
    if (tripleCards.length < 3) continue;
    for (const rank of RANKS) {
      if (rank === tripleRank) continue;
      const kickerCards = groups.get(rank);
      if (kickerCards && kickerCards.length >= 2) {
        candidates.push([...tripleCards.slice(0, 3), ...kickerCards.slice(0, 2)]);
        break;
      }
    }
  }

  // Runs: sliding window of ctx.runLength consecutive non-'2' ranks.
  const nonTwoRanks = RANKS.filter((r) => r !== '2');
  for (let start = 0; start + ctx.runLength <= nonTwoRanks.length; start++) {
    const window = nonTwoRanks.slice(start, start + ctx.runLength);
    const cardsForWindow: Card[] = [];
    let complete = true;
    for (const rank of window) {
      const group = groups.get(rank);
      if (!group || group.length === 0) {
        complete = false;
        break;
      }
      cardsForWindow.push(group[0]!);
    }
    if (complete) candidates.push(cardsForWindow);
  }

  const legalCombos: Combo[] = [];
  for (const cards of candidates) {
    const result = isValidPlay(cards, currentTableCombo, ctx);
    if (result.ok) legalCombos.push(result.combo);
  }

  return legalCombos.sort((a, b) => RANK_VALUE[definingRankForSort(a)] - RANK_VALUE[definingRankForSort(b)]);
}

function definingRankForSort(combo: Combo): Rank {
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
