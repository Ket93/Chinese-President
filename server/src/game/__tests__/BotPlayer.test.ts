import { DEFAULT_GAME_CONFIG, type Card, type DeckIndex, type Rank, type Suit } from '@chinese-president/shared';
import { describe, expect, it, vi } from 'vitest';
import { Room } from '../../rooms/Room.js';
import { maybeScheduleBotTurn } from '../BotPlayer.js';
import { RoundEngine } from '../RoundEngine.js';

function card(rank: Rank, suit: Suit = 'clubs', deckIndex: DeckIndex = 0): Card {
  return { id: `${rank}-${suit}-${deckIndex}`, rank, suit, deckIndex };
}

describe('bot scheduling integration (real Room + real timers, driven through maybeScheduleBotTurn)', () => {
  it('lets a bot who wins a trick while still holding cards lead the next trick — not a different bot', () => {
    vi.useFakeTimers();
    try {
      const room = new Room('TEST', 'Bee', 'socket-bee');
      room.getPlayer(room.hostId)!.isBot = true; // all three seats are bots for this test
      const cee = room.addBot();
      const ace = room.addBot();
      const beeId = room.hostId;
      const ceeId = cee.id;
      const aceId = ace.id;

      const engine = new RoundEngine({
        roundNumber: 2,
        players: room.orderedPlayers(),
        config: DEFAULT_GAME_CONFIG,
        leaderIdOverride: beeId,
      });
      // Ace's ONLY legal response to an Ace lead is the 2 (the sole rank
      // above Ace) — forcing a bot to play "the highest card" while still
      // holding other cards afterward, exactly like the reported scenario.
      engine.startTrickTakingForTesting(
        {
          [beeId]: [card('A', 'hearts')],
          [ceeId]: [card('3', 'diamonds')],
          [aceId]: [card('2', 'spades'), card('3', 'clubs'), card('4', 'diamonds')],
        },
        beeId,
      );
      room.roundEngine = engine;

      const onActed = vi.fn();
      function drive() {
        maybeScheduleBotTurn(room, onActed);
        vi.advanceTimersByTime(1300); // safely past the 600-1200ms bot delay range
      }

      drive(); // Bee leads their only card, A♥ (forced) — Bee goes out
      expect(engine.getHand(beeId)).toHaveLength(0);
      expect(engine.state.trick.currentCombo).toMatchObject({ kind: 'single', rank: 'A' });

      drive(); // Cee's 3♦ can't beat an Ace — passes
      expect(engine.state.trick.activePlayerId).toBe(aceId);

      drive(); // Ace's ONLY legal move is the 2♠ (forced)
      expect(engine.getHand(aceId)).toHaveLength(2); // 3♣ and 4♦ remain

      // Nobody can beat a lone 2 — the trick auto-resolves. Ace still holds
      // cards, so Ace — the bot who just played the highest card — must
      // lead the next trick, not Bee (out of cards) or Cee (already passed).
      expect(engine.state.trick.currentCombo).toBeNull();
      expect(engine.state.trick.leaderId).toBe(aceId);
      expect(engine.state.trick.activePlayerId).toBe(aceId);

      drive(); // scheduler must pick Ace to lead again, driven for real
      // Ace's remaining cards (3♣, 4♦) both still beat Cee's lone 3♦ (same
      // rank never beats), so this keeps auto-resolving to Ace every time —
      // correct cascading behavior, not a bug. Ace should still be leading.
      expect(engine.state.trick.leaderId).toBe(aceId);
      expect(engine.state.trick.activePlayerId).toBe(aceId);
      expect(engine.getHand(aceId)).toHaveLength(1); // 3♣ just auto-won, 4♦ remains
      expect(onActed).toHaveBeenCalledTimes(4);

      drive(); // Ace leads their last card, 4♦ — round should end (Cee is the only one left)
      expect(engine.state.phase).toBe('roundEnd');
      expect(engine.state.finishedOrder).toEqual([beeId, aceId, ceeId]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('hands leadership to the correct next active player when the trick winner goes out on that exact play', () => {
    vi.useFakeTimers();
    try {
      const room = new Room('TEST2', 'W', 'socket-w');
      room.getPlayer(room.hostId)!.isBot = true;
      const x = room.addBot();
      const y = room.addBot();
      const z = room.addBot();
      const wId = room.hostId;
      const xId = x.id;
      const yId = y.id;
      const zId = z.id;

      const engine = new RoundEngine({
        roundNumber: 2,
        players: room.orderedPlayers(),
        config: DEFAULT_GAME_CONFIG,
        leaderIdOverride: wId,
      });
      // W's only card is an unbeatable 2 — winning the trick and going out
      // on the very same play. Nobody else should be asked (auto-resolve),
      // and leadership must land on X specifically (the next seat), not Y,
      // Z, or W itself.
      engine.startTrickTakingForTesting(
        {
          [wId]: [card('2', 'spades')],
          [xId]: [card('3', 'diamonds'), card('5', 'diamonds')],
          [yId]: [card('3', 'clubs'), card('6', 'clubs')],
          [zId]: [card('3', 'hearts'), card('7', 'hearts')],
        },
        wId,
      );
      room.roundEngine = engine;

      const onActed = vi.fn();
      maybeScheduleBotTurn(room, onActed);
      vi.advanceTimersByTime(1300);

      expect(engine.state.finishedOrder).toEqual([wId]);
      expect(engine.state.trick.currentCombo).toBeNull();
      expect(engine.state.trick.leaderId).toBe(xId);
      expect(engine.state.trick.activePlayerId).toBe(xId);
      expect(onActed).toHaveBeenCalledTimes(1); // only W ever acted — X/Y/Z were never asked

      // And the scheduler must correctly pick X (not Y/Z/W) to lead next.
      maybeScheduleBotTurn(room, onActed);
      vi.advanceTimersByTime(1300);
      expect(engine.state.trick.log[0]?.playerId).toBe(xId);
    } finally {
      vi.useRealTimers();
    }
  });
});
