import { describe, expect, it } from 'vitest';
import { classifyCombo } from '../comboClassifier.js';
import { compareCombo } from '../comboComparator.js';
import { cardsOfRank, ctx, runCards } from './testHelpers.js';

describe('compareCombo', () => {
  it('ranks higher singles above lower singles', () => {
    const low = classifyCombo(cardsOfRank('7', 1), ctx())!;
    const high = classifyCombo(cardsOfRank('K', 1), ctx())!;
    expect(compareCombo(high, low, ctx())).toBeGreaterThan(0);
    expect(compareCombo(low, high, ctx())).toBeLessThan(0);
  });

  it('treats 2 as the highest single', () => {
    const two = classifyCombo(cardsOfRank('2', 1), ctx())!;
    const ace = classifyCombo(cardsOfRank('A', 1), ctx())!;
    expect(compareCombo(two, ace, ctx())).toBeGreaterThan(0);
  });

  it('any bomb beats any non-bomb, regardless of kind', () => {
    const bomb = classifyCombo(cardsOfRank('3', 4), ctx())!;
    const run = classifyCombo(runCards(['9', '10', 'J', 'Q', 'K']), ctx())!;
    expect(compareCombo(bomb, run, ctx())).toBeGreaterThan(0);
    expect(compareCombo(run, bomb, ctx())).toBeLessThan(0);
  });

  it('a higher bomb beats a lower bomb', () => {
    const lowBomb = classifyCombo(cardsOfRank('4', 4), ctx())!;
    const highBomb = classifyCombo(cardsOfRank('J', 4), ctx())!;
    expect(compareCombo(highBomb, lowBomb, ctx())).toBeGreaterThan(0);
  });

  it('compares full houses by triple rank only', () => {
    const a = classifyCombo([...cardsOfRank('5', 3), ...cardsOfRank('K', 2)], ctx())!;
    const b = classifyCombo([...cardsOfRank('6', 3), ...cardsOfRank('3', 2)], ctx())!;
    expect(compareCombo(b, a, ctx())).toBeGreaterThan(0);
  });

  it('compares runs of the same length by high rank', () => {
    const low = classifyCombo(runCards(['3', '4', '5', '6', '7']), ctx())!;
    const high = classifyCombo(runCards(['8', '9', '10', 'J', 'Q']), ctx())!;
    expect(compareCombo(high, low, ctx())).toBeGreaterThan(0);
  });

  it('inverts ordering when revolution is active', () => {
    const low = classifyCombo(cardsOfRank('4', 1), ctx())!;
    const high = classifyCombo(cardsOfRank('K', 1), ctx())!;
    expect(compareCombo(high, low, ctx({ revolutionActive: true }))).toBeLessThan(0);
    expect(compareCombo(low, high, ctx({ revolutionActive: true }))).toBeGreaterThan(0);
  });

  it('throws when comparing mismatched non-bomb kinds', () => {
    const single = classifyCombo(cardsOfRank('5', 1), ctx())!;
    const pair = classifyCombo(cardsOfRank('6', 2), ctx())!;
    expect(() => compareCombo(single, pair, ctx())).toThrow();
  });

  it('throws when comparing runs of different length', () => {
    const runFour = classifyCombo(runCards(['3', '4', '5', '6']), ctx({ runLength: 4 }))!;
    const runFive = classifyCombo(runCards(['5', '6', '7', '8', '9']), ctx({ runLength: 5 }))!;
    expect(() => compareCombo(runFive, runFour, ctx())).toThrow();
  });
});
