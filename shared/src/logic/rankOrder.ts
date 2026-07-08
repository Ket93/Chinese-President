import { RANK_VALUE, type Rank } from '../types/card.js';

/**
 * Single seam every comparison routes through. Under an active revolution,
 * the ranking is inverted (3 becomes highest, 2 becomes lowest).
 */
export function rankValue(rank: Rank, revolutionActive: boolean): number {
  const base = RANK_VALUE[rank];
  return revolutionActive ? 12 - base : base;
}
