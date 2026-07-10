import { DEFAULT_GAME_CONFIG, type Card, type DeckIndex, type GameConfig, type Rank, type Suit } from '@chinese-president/shared';
import { describe, expect, it } from 'vitest';
import { RoundEngine } from '../RoundEngine.js';
import type { ServerPlayer } from '../types.js';

function card(rank: Rank, suit: Suit = 'clubs', deckIndex: DeckIndex = 0): Card {
  return { id: `${rank}-${suit}-${deckIndex}`, rank, suit, deckIndex };
}

function makePlayers(ids: string[]): ServerPlayer[] {
  return ids.map((id, seatIndex) => ({
    id,
    name: id,
    seatIndex,
    isBot: false,
    connected: true,
    socketId: null,
    playerToken: `token-${id}`,
  }));
}

function makeEngine(ids: string[], configOverrides: Partial<GameConfig> = {}, roundNumber = 2): RoundEngine {
  const config: GameConfig = { ...DEFAULT_GAME_CONFIG, ...configOverrides, houseRules: { ...DEFAULT_GAME_CONFIG.houseRules, ...configOverrides.houseRules } };
  // roundNumber defaults to 2 (with no leaderIdOverride) so the "opening play
  // must include 3 of clubs" rule (round 1 only) doesn't interfere with tests
  // that aren't about that rule specifically.
  return new RoundEngine({ roundNumber, players: makePlayers(ids), config, leaderIdOverride: ids[0] });
}

describe('RoundEngine trick resolution', () => {
  it('resolves to the player who played the highest combo, only after everyone else passes in one clean rotation', () => {
    // Everyone still holds a card that COULD beat the current combo at every
    // step (so the auto-resolve-when-unbeatable feature never kicks in) —
    // they just choose to pass anyway, so this exercises the "wait for a
    // full rotation of explicit passes" path specifically.
    const engine = makeEngine(['A', 'B', 'C', 'D']);
    engine.startTrickTakingForTesting(
      {
        A: [card('4', 'spades'), card('2', 'hearts')],
        B: [card('6', 'diamonds'), card('2', 'diamonds')],
        C: [card('9', 'clubs'), card('10', 'clubs')],
        D: [card('7', 'hearts'), card('2', 'spades')],
      },
      'A',
    );

    expect(engine.applyPlay('A', ['4-spades-0'])).toEqual({ ok: true }); // A leads 4♠
    expect(engine.state.trick.activePlayerId).toBe('B');

    expect(engine.applyPass('B')).toEqual({ ok: true }); // B passes on 4 (even though 6♦ could beat it)
    expect(engine.state.trick.activePlayerId).toBe('C');

    expect(engine.applyPlay('C', ['9-clubs-0'])).toEqual({ ok: true }); // C beats with 9♣
    expect(engine.state.trick.leaderId).toBe('C');
    expect(engine.state.trick.activePlayerId).toBe('D'); // next after C

    expect(engine.applyPass('D')).toEqual({ ok: true }); // D passes despite holding 2♠ (would beat 9)
    // A never explicitly passed (only led) — should be reconsidered against C's 9.
    expect(engine.state.trick.activePlayerId).toBe('A');

    expect(engine.applyPass('A')).toEqual({ ok: true }); // A passes despite holding 2♥ (would beat 9)
    // B passed earlier against the OLD combo (4♠) — since C raised the bar,
    // B must be reconsidered against the NEW combo (9♣), not skipped.
    expect(engine.state.trick.activePlayerId).toBe('B');

    expect(engine.applyPass('B')).toEqual({ ok: true }); // B passes despite holding 2♦ (would beat 9)
    // Full rotation complete (D, A, B all passed against C's 9) — trick resolves to C.
    expect(engine.state.trick.currentCombo).toBeNull();
    expect(engine.state.trick.leaderId).toBe('C');
    expect(engine.state.trick.activePlayerId).toBe('C');
    expect(engine.state.trick.passedPlayerIds).toEqual([]);
  });

  it('auto-resolves immediately when nobody else can possibly beat the combo', () => {
    const engine = makeEngine(['A', 'B', 'C', 'D']);
    engine.startTrickTakingForTesting(
      {
        A: [card('2', 'spades'), card('4', 'spades')],
        B: [card('3', 'diamonds')],
        C: [card('5', 'clubs')],
        D: [card('6', 'hearts')],
      },
      'A',
    );

    expect(engine.applyPlay('A', ['2-spades-0'])).toEqual({ ok: true }); // highest possible single
    // Nobody holds a 2 or a bomb — trick should resolve immediately, no
    // waiting for B/C/D to explicitly pass.
    expect(engine.state.trick.currentCombo).toBeNull();
    expect(engine.state.trick.leaderId).toBe('A');
    expect(engine.state.trick.activePlayerId).toBe('A');
  });

  it('does NOT auto-resolve while at least one other player could still beat the combo', () => {
    const engine = makeEngine(['A', 'B', 'C', 'D']);
    engine.startTrickTakingForTesting(
      {
        A: [card('4', 'spades')],
        B: [card('3', 'diamonds')],
        C: [card('9', 'clubs')], // could beat 4
        D: [card('5', 'hearts')],
      },
      'A',
    );

    expect(engine.applyPlay('A', ['4-spades-0'])).toEqual({ ok: true });
    // C can still beat this with 9♣, so the trick must not auto-resolve —
    // B goes next as normal.
    expect(engine.state.trick.currentCombo).not.toBeNull();
    expect(engine.state.trick.activePlayerId).toBe('B');
  });

  it('passes leadership to the next active player if the trick winner just emptied their hand', () => {
    const engine = makeEngine(['A', 'B', 'C', 'D']);
    engine.startTrickTakingForTesting(
      {
        A: [card('2', 'spades')], // winning play is also A's last card
        B: [card('3', 'diamonds')],
        C: [card('5', 'clubs')],
        D: [card('6', 'hearts')],
      },
      'A',
    );

    expect(engine.applyPlay('A', ['2-spades-0'])).toEqual({ ok: true });
    expect(engine.state.finishedOrder).toEqual(['A']);
    // A is out of cards and can't lead — leadership passes to the next
    // active player in seat order (B).
    expect(engine.state.trick.leaderId).toBe('B');
    expect(engine.state.trick.activePlayerId).toBe('B');
  });

  it('requires the opening play of round 1 to include the literal 3 of clubs', () => {
    const config = { ...DEFAULT_GAME_CONFIG, houseRules: { ...DEFAULT_GAME_CONFIG.houseRules } };
    const engine = new RoundEngine({ roundNumber: 1, players: makePlayers(['A', 'B', 'C', 'D']), config });
    engine.startTrickTakingForTesting(
      {
        A: [card('3', 'clubs'), card('9', 'spades')],
        B: [card('4', 'diamonds')],
        C: [card('5', 'clubs')],
        D: [card('6', 'hearts')],
      },
      'A',
    );

    expect(engine.applyPlay('A', ['9-spades-0'])).toEqual({ ok: false, reason: 'OPENING_PLAY_MUST_INCLUDE_THREE_OF_CLUBS' });
    expect(engine.state.trick.currentCombo).toBeNull();

    expect(engine.applyPlay('A', ['3-clubs-0'])).toEqual({ ok: true });
    expect(engine.state.openingPlayRequiresThreeClubs).toBe(false);
  });

  it('archives completed tricks (most recent first) and records why each one ended', () => {
    const engine = makeEngine(['A', 'B', 'C', 'D']);
    engine.startTrickTakingForTesting(
      {
        A: [card('2', 'spades'), card('4', 'spades')],
        B: [card('3', 'diamonds')],
        C: [card('5', 'clubs')],
        D: [card('6', 'hearts')],
      },
      'A',
    );

    expect(engine.applyPlay('A', ['2-spades-0'])).toEqual({ ok: true }); // unbeatable, auto-resolves
    expect(engine.state.lastTrickResolution).toEqual({ winnerId: 'A', reason: 'noOneCanBeat' });
    expect(engine.state.trickHistory).toHaveLength(1);
    expect(engine.state.trickHistory[0]).toEqual([{ playerId: 'A', action: expect.objectContaining({ kind: 'single', rank: '2' }) }]);

    expect(engine.applyPlay('A', ['4-spades-0'])).toEqual({ ok: true }); // leads again
    expect(engine.applyPass('B')).toEqual({ ok: true });
    expect(engine.applyPass('C')).toEqual({ ok: true });
    expect(engine.applyPass('D')).toEqual({ ok: true }); // full rotation of passes resolves it
    expect(engine.state.lastTrickResolution).toEqual({ winnerId: 'A', reason: 'allPassed' });
    // Most recent trick is prepended to the front.
    expect(engine.state.trickHistory).toHaveLength(2);
    expect(engine.state.trickHistory[0]).toHaveLength(4); // A's play + 3 passes
    expect(engine.state.trickHistory[1]).toHaveLength(1); // the earlier single-2 trick
  });
});

describe('RoundEngine rank titles for small player counts', () => {
  it('assigns just president/asshole for a 2-player round (no VP or Vice Asshole)', () => {
    const engine = makeEngine(['A', 'B']);
    engine.startTrickTakingForTesting({ A: [card('4', 'spades')], B: [card('3', 'diamonds')] }, 'A');
    expect(engine.applyPlay('A', ['4-spades-0'])).toEqual({ ok: true });
    // Round ends immediately: only B still holds cards.
    expect(engine.state.finishedOrder).toEqual(['A', 'B']);
    expect(engine.getRankTitles()).toEqual(
      new Map([
        ['A', 'president'],
        ['B', 'asshole'],
      ]),
    );
  });

  it('assigns president/citizen/asshole for a 3-player round (no VP or Vice Asshole)', () => {
    const engine = makeEngine(['A', 'B', 'C']);
    engine.startTrickTakingForTesting({ A: [card('2', 'spades')], B: [card('3', 'diamonds')], C: [card('4', 'clubs')] }, 'A');

    expect(engine.applyPlay('A', ['2-spades-0'])).toEqual({ ok: true }); // unbeatable single, auto-resolves, A goes out
    expect(engine.state.finishedOrder).toEqual(['A']);
    expect(engine.state.trick.leaderId).toBe('B'); // A has no cards left to lead with

    expect(engine.applyPlay('B', ['3-diamonds-0'])).toEqual({ ok: true }); // B's only card — goes out too, round ends
    expect(engine.state.finishedOrder).toEqual(['A', 'B', 'C']);

    expect(engine.getRankTitles()).toEqual(
      new Map([
        ['A', 'president'],
        ['B', 'citizen'],
        ['C', 'asshole'],
      ]),
    );
  });
});
