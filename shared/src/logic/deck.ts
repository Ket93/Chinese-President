import { RANKS, SUITS, makeCardId, type Card, type DeckIndex } from '../types/card.js';

export function buildDeck(deckCount: 1 | 2): Card[] {
  const cards: Card[] = [];
  for (let deckIndex = 0; deckIndex < deckCount; deckIndex++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({ id: makeCardId(rank, suit, deckIndex as DeckIndex), rank, suit, deckIndex: deckIndex as DeckIndex });
      }
    }
  }
  return cards;
}

export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = result[i]!;
    result[i] = result[j]!;
    result[j] = tmp;
  }
  return result;
}

/**
 * Round-robin deal so any remainder is spread as one extra card each to the
 * first N players, rather than all going to a single player.
 */
export function dealCards(deck: Card[], playerIds: string[]): Map<string, Card[]> {
  const hands = new Map<string, Card[]>(playerIds.map((id) => [id, []]));
  deck.forEach((card, i) => {
    const playerId = playerIds[i % playerIds.length]!;
    hands.get(playerId)!.push(card);
  });
  return hands;
}
