import { describe, expect, it } from 'vitest';
import { classifyCombo } from '../comboClassifier.js';
import { compareCombo } from '../comboComparator.js';
import { card, cardsOfRank, ctx, runCards } from './testHelpers.js';

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

  describe('suit tiebreak (Clubs < Diamonds < Hearts < Spades, only applied when rank ties)', () => {
    it('breaks a tie between same-rank singles across the full suit order', () => {
      const clubs9 = classifyCombo([card('9', 'clubs')], ctx())!;
      const diamonds9 = classifyCombo([card('9', 'diamonds')], ctx())!;
      const hearts9 = classifyCombo([card('9', 'hearts')], ctx())!;
      const spades9 = classifyCombo([card('9', 'spades')], ctx())!;

      expect(compareCombo(diamonds9, clubs9, ctx())).toBeGreaterThan(0);
      expect(compareCombo(hearts9, diamonds9, ctx())).toBeGreaterThan(0);
      expect(compareCombo(spades9, hearts9, ctx())).toBeGreaterThan(0);
      expect(compareCombo(clubs9, spades9, ctx())).toBeLessThan(0);
    });

    it('still lets rank dominate over suit', () => {
      const clubsK = classifyCombo([card('K', 'clubs')], ctx())!;
      const spades9 = classifyCombo([card('9', 'spades')], ctx())!;
      expect(compareCombo(clubsK, spades9, ctx())).toBeGreaterThan(0); // K beats 9 regardless of suit
    });

    it('breaks a pair tie by the highest suit within each pair', () => {
      const lowPair = classifyCombo([card('7', 'clubs'), card('7', 'diamonds')], ctx())!;
      const highPair = classifyCombo([card('7', 'hearts'), card('7', 'spades')], ctx())!;
      expect(compareCombo(highPair, lowPair, ctx())).toBeGreaterThan(0);
    });

    it("breaks a full house tie using only the triple's suits, ignoring the kicker pair", () => {
      const lowerTripleSuits = classifyCombo(
        [card('5', 'clubs'), card('5', 'diamonds'), card('5', 'hearts'), card('K', 'clubs'), card('K', 'diamonds')],
        ctx(),
      )!;
      const higherTripleSuits = classifyCombo(
        [card('5', 'clubs'), card('5', 'diamonds'), card('5', 'spades'), card('3', 'clubs'), card('3', 'diamonds')],
        ctx(),
      )!;
      // higherTripleSuits' triple includes a spade (beats hearts) even though
      // its kicker (3) is lower than the other's kicker (K) — kicker never matters.
      expect(compareCombo(higherTripleSuits, lowerTripleSuits, ctx())).toBeGreaterThan(0);
    });

    it('breaks a run tie using the suit of only the highest-ranked card', () => {
      const lowTopSuit = classifyCombo(
        [card('5', 'diamonds'), card('6', 'diamonds'), card('7', 'diamonds'), card('8', 'diamonds'), card('9', 'clubs')],
        ctx({ runLength: 5 }),
      )!;
      const highTopSuit = classifyCombo(
        [card('5', 'clubs'), card('6', 'clubs'), card('7', 'clubs'), card('8', 'clubs'), card('9', 'spades')],
        ctx({ runLength: 5 }),
      )!;
      expect(compareCombo(highTopSuit, lowTopSuit, ctx())).toBeGreaterThan(0);
    });

    it('breaks a bomb tie by the highest suit among its four cards', () => {
      const lowerSuits = classifyCombo(
        [card('J', 'clubs', 0), card('J', 'diamonds', 0), card('J', 'hearts', 0), card('J', 'clubs', 1)],
        ctx({ deckCount: 2 }),
      )!;
      const higherSuits = classifyCombo(
        [card('J', 'diamonds', 1), card('J', 'hearts', 1), card('J', 'spades', 0), card('J', 'spades', 1)],
        ctx({ deckCount: 2 }),
      )!;
      expect(compareCombo(higherSuits, lowerSuits, ctx({ deckCount: 2 }))).toBeGreaterThan(0);
    });
  });
});
