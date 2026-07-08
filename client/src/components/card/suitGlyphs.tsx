import type { Suit } from '@chinese-president/shared';

export const SUIT_SYMBOL: Record<Suit, string> = {
  clubs: '♣',
  diamonds: '♦',
  hearts: '♥',
  spades: '♠',
};

export const SUIT_COLOR_VAR: Record<Suit, string> = {
  clubs: 'var(--suit-black)',
  spades: 'var(--suit-black)',
  diamonds: 'var(--suit-red)',
  hearts: 'var(--suit-red)',
};
