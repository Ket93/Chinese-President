import { describe, expect, it } from 'vitest';
import { classifyCombo } from '../comboClassifier.js';
import { card, cardsOfRank, ctx, runCards } from './testHelpers.js';

describe('classifyCombo', () => {
  it('recognizes a single', () => {
    const combo = classifyCombo([card('7')], ctx());
    expect(combo).toEqual({ kind: 'single', rank: '7', cards: [card('7')] });
  });

  it('recognizes a pair', () => {
    const cards = cardsOfRank('9', 2);
    const combo = classifyCombo(cards, ctx());
    expect(combo?.kind).toBe('pair');
    expect(combo && 'rank' in combo && combo.rank).toBe('9');
  });

  it('recognizes a bomb (four of a kind)', () => {
    const cards = cardsOfRank('K', 4);
    const combo = classifyCombo(cards, ctx());
    expect(combo?.kind).toBe('bomb');
  });

  it('recognizes a full house and identifies triple vs pair rank', () => {
    const cards = [...cardsOfRank('4', 3), ...cardsOfRank('9', 2)];
    const combo = classifyCombo(cards, ctx());
    expect(combo).toMatchObject({ kind: 'fullHouse', tripleRank: '4', pairRank: '9' });
  });

  it('recognizes a run of the configured length', () => {
    const cards = runCards(['5', '6', '7', '8', '9']);
    const combo = classifyCombo(cards, ctx({ runLength: 5 }));
    expect(combo).toMatchObject({ kind: 'run', length: 5, lowRank: '5', highRank: '9' });
  });

  it('respects a non-default run length', () => {
    const cards = runCards(['5', '6', '7', '8']);
    expect(classifyCombo(cards, ctx({ runLength: 5 }))).toBeNull();
    expect(classifyCombo(cards, ctx({ runLength: 4 }))).toMatchObject({ kind: 'run', length: 4 });
  });

  it('rejects a run containing a 2', () => {
    const cards = runCards(['J', 'Q', 'K', 'A', '2']);
    expect(classifyCombo(cards, ctx({ runLength: 5 }))).toBeNull();
  });

  it('rejects a non-consecutive set of 5 distinct ranks', () => {
    const cards = runCards(['3', '4', '6', '7', '8']);
    expect(classifyCombo(cards, ctx({ runLength: 5 }))).toBeNull();
  });

  it('rejects a bare triple (no legal shape)', () => {
    const cards = cardsOfRank('5', 3);
    expect(classifyCombo(cards, ctx())).toBeNull();
  });

  it('rejects triple + single ("triple with kicker")', () => {
    const cards = [...cardsOfRank('5', 3), card('9')];
    expect(classifyCombo(cards, ctx())).toBeNull();
  });

  it('rejects a double straight (three pairs in sequence)', () => {
    const cards = [...cardsOfRank('5', 2), ...cardsOfRank('6', 2), ...cardsOfRank('7', 2)];
    expect(classifyCombo(cards, ctx({ runLength: 5 }))).toBeNull();
  });

  it('rejects mismatched groupings that are not a full house', () => {
    // 2+2+1 across three ranks is not one of the five legal shapes.
    const cards = [...cardsOfRank('5', 2), ...cardsOfRank('6', 2), card('7')];
    expect(classifyCombo(cards, ctx())).toBeNull();
  });

  it('allows a pair to be formed from duplicate rank+suit across two decks', () => {
    const cards = [card('8', 'clubs', 0), card('8', 'clubs', 1)];
    const combo = classifyCombo(cards, ctx({ deckCount: 2 }));
    expect(combo).toMatchObject({ kind: 'pair', rank: '8' });
  });

  it('allows a bomb formed with duplicate rank+suit pairs across two decks', () => {
    const cards = [
      card('8', 'clubs', 0),
      card('8', 'clubs', 1),
      card('8', 'diamonds', 0),
      card('8', 'diamonds', 1),
    ];
    const combo = classifyCombo(cards, ctx({ deckCount: 2 }));
    expect(combo).toMatchObject({ kind: 'bomb', rank: '8' });
  });

  it('rejects a run built from duplicate ranks even with deckCount 2', () => {
    // Same rank twice instead of consecutive distinct ranks — not a run.
    const cards = [card('5', 'clubs', 0), card('5', 'diamonds', 1), card('6'), card('7'), card('8')];
    expect(classifyCombo(cards, ctx({ deckCount: 2, runLength: 5 }))).toBeNull();
  });
});
