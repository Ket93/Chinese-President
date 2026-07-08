import { makeCardId, type Card, type DeckIndex, type Rank, type Suit } from '../../types/card.js';
import type { RuleContext } from '../ruleContext.js';

let autoSuitCycle: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades'];

export function card(rank: Rank, suit: Suit = 'clubs', deckIndex: DeckIndex = 0): Card {
  return { id: makeCardId(rank, suit, deckIndex), rank, suit, deckIndex };
}

/** Builds N cards of the same rank across distinct suits/decks, for pair/bomb tests. */
export function cardsOfRank(rank: Rank, count: number): Card[] {
  const cards: Card[] = [];
  for (let i = 0; i < count; i++) {
    const suit = autoSuitCycle[i % 4]!;
    const deckIndex = (i >= 4 ? 1 : 0) as DeckIndex;
    cards.push(card(rank, suit, deckIndex));
  }
  return cards;
}

export function runCards(ranks: Rank[]): Card[] {
  return ranks.map((r) => card(r));
}

export function ctx(overrides: Partial<RuleContext> = {}): RuleContext {
  return { deckCount: 1, runLength: 5, revolutionActive: false, ...overrides };
}
