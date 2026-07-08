import type { Rank, Suit } from './card.js';

export type ExchangeRole = 'president' | 'vicePresident';

export type ExchangeTransactionStatus =
  | 'awaitingRequest'
  | 'awaitingTargetChoice'
  | 'awaitingReturn'
  | 'complete'
  | 'forfeited';

export interface ExchangeTransaction {
  id: string;
  role: ExchangeRole;
  requesterId: string;
  targetId: string;
  status: ExchangeTransactionStatus;
  requestedRank?: Rank;
  requestedSuit?: Suit;
  /** Shown to target when a <=10 rank request matches more than one card in their hand. */
  candidateCardIds?: string[];
  transferredCardId?: string;
  returnedCardId?: string;
}

export interface ExchangeState {
  transactions: ExchangeTransaction[];
  currentIndex: number;
}
