import { describe, expect, it } from 'vitest';
import { classifyCombo } from '../comboClassifier.js';
import { isValidPlay } from '../comboValidator.js';
import { cardsOfRank, ctx, runCards } from './testHelpers.js';

describe('isValidPlay', () => {
  it('accepts any valid shape when leading (no table combo)', () => {
    const result = isValidPlay(cardsOfRank('7', 1), null, ctx());
    expect(result.ok).toBe(true);
  });

  it('rejects an invalid shape when leading', () => {
    const result = isValidPlay(cardsOfRank('7', 3), null, ctx());
    expect(result).toEqual({ ok: false, reason: 'NOT_A_VALID_COMBO_SHAPE' });
  });

  it('rejects a kind mismatch against the table combo', () => {
    const table = classifyCombo(cardsOfRank('4', 2), ctx())!; // pair
    const result = isValidPlay(cardsOfRank('9', 1), table, ctx()); // single
    expect(result).toEqual({ ok: false, reason: 'KIND_MISMATCH' });
  });

  it('rejects a run-length mismatch against a table run', () => {
    const table = classifyCombo(runCards(['3', '4', '5', '6', '7']), ctx({ runLength: 5 }))!;
    const result = isValidPlay(runCards(['4', '5', '6', '7']), table, ctx({ runLength: 4 }));
    expect(result).toEqual({ ok: false, reason: 'RUN_LENGTH_MISMATCH' });
  });

  it('rejects a play that does not beat the table combo', () => {
    const table = classifyCombo(cardsOfRank('9', 1), ctx())!;
    const result = isValidPlay(cardsOfRank('5', 1), table, ctx());
    expect(result).toEqual({ ok: false, reason: 'DOES_NOT_BEAT_TABLE' });
  });

  it('accepts a higher single beating a lower single', () => {
    const table = classifyCombo(cardsOfRank('9', 1), ctx())!;
    const result = isValidPlay(cardsOfRank('K', 1), table, ctx());
    expect(result.ok).toBe(true);
  });

  it('requires a non-bomb combo to be beaten by a bomb, not a higher same-kind combo', () => {
    const table = classifyCombo(cardsOfRank('3', 4), ctx())!; // bomb on the table
    const result = isValidPlay(cardsOfRank('A', 1), table, ctx()); // single can't beat a bomb
    expect(result).toEqual({ ok: false, reason: 'MUST_BEAT_BOMB_WITH_BOMB' });
  });

  it('lets a bomb override any non-bomb table combo', () => {
    const table = classifyCombo(runCards(['9', '10', 'J', 'Q', 'K']), ctx())!;
    const result = isValidPlay(cardsOfRank('3', 4), table, ctx());
    expect(result.ok).toBe(true);
  });

  it('requires a higher bomb to beat a lower bomb', () => {
    const table = classifyCombo(cardsOfRank('J', 4), ctx())!;
    const lower = isValidPlay(cardsOfRank('4', 4), table, ctx());
    const higher = isValidPlay(cardsOfRank('A', 4), table, ctx());
    expect(lower).toEqual({ ok: false, reason: 'DOES_NOT_BEAT_TABLE' });
    expect(higher.ok).toBe(true);
  });
});
