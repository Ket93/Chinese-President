export const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'] as const;
export type Rank = (typeof RANKS)[number];

export const RANK_VALUE: Record<Rank, number> = Object.fromEntries(
  RANKS.map((r, i) => [r, i]),
) as Record<Rank, number>;

export const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'] as const;
export type Suit = (typeof SUITS)[number];

/** Tiebreak ordering between cards of the same rank: Clubs < Diamonds < Hearts < Spades. */
export const SUIT_VALUE: Record<Suit, number> = { clubs: 0, diamonds: 1, hearts: 2, spades: 3 };

/** Disambiguates duplicate rank+suit cards when deckCount === 2. */
export type DeckIndex = 0 | 1;

export interface Card {
  id: string;
  rank: Rank;
  suit: Suit;
  deckIndex: DeckIndex;
}

export function makeCardId(rank: Rank, suit: Suit, deckIndex: DeckIndex): string {
  return `${rank}-${suit}-${deckIndex}`;
}
