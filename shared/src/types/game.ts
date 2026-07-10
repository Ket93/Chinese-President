import type { Combo } from './combo.js';
import type { ExchangeState } from './exchange.js';

export type RoundPhase = 'dealing' | 'exchange' | 'trickTaking' | 'roundEnd';

export type TrickEndReason = 'allPassed' | 'noOneCanBeat' | 'eightEndsRound';

export interface TrickLogEntry {
  playerId: string;
  action: Combo | 'pass';
}

export interface TrickState {
  currentCombo: Combo | null;
  leaderId: string | null;
  activePlayerId: string | null;
  /** Active (not-out) seats, in play order, rotating from the current leader. */
  turnOrderSeatIndexes: number[];
  passedPlayerIds: string[];
  log: TrickLogEntry[];
}

export interface RoundState {
  roundNumber: number;
  phase: RoundPhase;
  trick: TrickState;
  finishedOrder: string[];
  revolutionActive: boolean;
  exchange?: ExchangeState;
  /** True only before the very first play of round 1 — that opening play must include the 3 of clubs. */
  openingPlayRequiresThreeClubs: boolean;
  /** Completed tricks this round, most recent first. */
  trickHistory: TrickLogEntry[][];
  /** Set whenever a trick resolves; lets clients show why (everyone passed vs. nothing could beat it). */
  lastTrickResolution: { winnerId: string; reason: TrickEndReason } | null;
}

export interface SessionStats {
  presidentCounts: Record<string, number>;
}
