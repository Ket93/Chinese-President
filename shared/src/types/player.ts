import type { Card } from './card.js';

export type SeatRankTitle = 'president' | 'vicePresident' | 'citizen' | 'viceAsshole' | 'asshole';

export interface PlayerPublic {
  id: string;
  name: string;
  seatIndex: number;
  isBot: boolean;
  connected: boolean;
  cardCount: number;
  isOutOfTrick: boolean;
  rankTitle?: SeatRankTitle;
}

export interface PlayerPrivate extends PlayerPublic {
  hand: Card[];
}
