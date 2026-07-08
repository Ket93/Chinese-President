import { describe, expect, it } from 'vitest';
import { classifyCombo } from '../comboClassifier.js';
import { isValidPlay } from '../comboValidator.js';
import { generateLegalMoves } from '../legalMoves.js';
import { card, cardsOfRank, ctx, runCards } from './testHelpers.js';

describe('generateLegalMoves', () => {
  it('only returns combos that isValidPlay also accepts', () => {
    const hand = [card('3'), card('4'), card('5'), card('6'), card('7'), ...cardsOfRank('9', 2), ...cardsOfRank('K', 4)];
    const table = classifyCombo(cardsOfRank('8', 1), ctx())!;
    const moves = generateLegalMoves(hand, table, ctx());
    expect(moves.length).toBeGreaterThan(0);
    for (const combo of moves) {
      expect(isValidPlay(combo.cards, table, ctx()).ok).toBe(true);
    }
  });

  it('returns an empty list when nothing in hand can beat the table (and passing is the only option)', () => {
    const hand = [card('3'), card('4', 'diamonds')];
    const table = classifyCombo(cardsOfRank('A', 1), ctx())!;
    const moves = generateLegalMoves(hand, table, ctx());
    expect(moves).toEqual([]);
  });

  it('always includes an available bomb regardless of the table combo kind', () => {
    const hand = [...cardsOfRank('3', 4), card('9')];
    const table = classifyCombo(runCards(['9', '10', 'J', 'Q', 'K']), ctx())!;
    const moves = generateLegalMoves(hand, table, ctx());
    expect(moves.some((m) => m.kind === 'bomb')).toBe(true);
  });

  it('offers every valid shape when leading', () => {
    const hand = [card('4'), ...cardsOfRank('5', 2), ...cardsOfRank('7', 3), ...cardsOfRank('9', 2)];
    const moves = generateLegalMoves(hand, null, ctx());
    const kinds = new Set(moves.map((m) => m.kind));
    expect(kinds.has('single')).toBe(true);
    expect(kinds.has('pair')).toBe(true);
    expect(kinds.has('fullHouse')).toBe(true);
  });

  it('respects the configured run length when enumerating runs', () => {
    const hand = [card('3'), card('4'), card('5'), card('6')];
    const movesLenFour = generateLegalMoves(hand, null, ctx({ runLength: 4 }));
    expect(movesLenFour.some((m) => m.kind === 'run')).toBe(true);

    const movesLenFive = generateLegalMoves(hand, null, ctx({ runLength: 5 }));
    expect(movesLenFive.some((m) => m.kind === 'run')).toBe(false);
  });
});
