import type { Card } from '../types/card.js';
import type { Combo } from '../types/combo.js';
import { classifyCombo } from './comboClassifier.js';
import { compareCombo } from './comboComparator.js';
import type { RuleContext } from './ruleContext.js';

export type ValidationFailureReason =
  | 'NOT_A_VALID_COMBO_SHAPE'
  | 'KIND_MISMATCH'
  | 'RUN_LENGTH_MISMATCH'
  | 'MUST_BEAT_BOMB_WITH_BOMB'
  | 'DOES_NOT_BEAT_TABLE';

export type ValidationResult = { ok: true; combo: Combo } | { ok: false; reason: ValidationFailureReason };

/**
 * currentTableCombo === null means the player is leading a new trick — any
 * valid combo shape is legal in that case.
 */
export function isValidPlay(cards: Card[], currentTableCombo: Combo | null, ctx: RuleContext): ValidationResult {
  const combo = classifyCombo(cards, ctx);
  if (!combo) return { ok: false, reason: 'NOT_A_VALID_COMBO_SHAPE' };

  if (currentTableCombo === null) return { ok: true, combo };

  if (combo.kind === 'bomb') {
    if (currentTableCombo.kind !== 'bomb') return { ok: true, combo };
    return compareCombo(combo, currentTableCombo, ctx) > 0
      ? { ok: true, combo }
      : { ok: false, reason: 'DOES_NOT_BEAT_TABLE' };
  }

  if (currentTableCombo.kind === 'bomb') {
    return { ok: false, reason: 'MUST_BEAT_BOMB_WITH_BOMB' };
  }

  if (combo.kind !== currentTableCombo.kind) {
    return { ok: false, reason: 'KIND_MISMATCH' };
  }

  if (combo.kind === 'run' && currentTableCombo.kind === 'run' && combo.length !== currentTableCombo.length) {
    return { ok: false, reason: 'RUN_LENGTH_MISMATCH' };
  }

  return compareCombo(combo, currentTableCombo, ctx) > 0
    ? { ok: true, combo }
    : { ok: false, reason: 'DOES_NOT_BEAT_TABLE' };
}
