import type { Card, Rank } from './card.js';

export type ComboKind = 'single' | 'pair' | 'fullHouse' | 'run' | 'bomb';

interface ComboBase {
  cards: Card[];
}

export interface SingleCombo extends ComboBase {
  kind: 'single';
  rank: Rank;
}

export interface PairCombo extends ComboBase {
  kind: 'pair';
  rank: Rank;
}

export interface FullHouseCombo extends ComboBase {
  kind: 'fullHouse';
  tripleRank: Rank;
  pairRank: Rank;
}

export interface RunCombo extends ComboBase {
  kind: 'run';
  length: number;
  highRank: Rank;
  lowRank: Rank;
}

export interface BombCombo extends ComboBase {
  kind: 'bomb';
  rank: Rank;
}

export type Combo = SingleCombo | PairCombo | FullHouseCombo | RunCombo | BombCombo;
