import type { Room } from '../rooms/Room.js';
import type { RoundEngine } from './RoundEngine.js';
import { chooseBotExchangeRequestRank, chooseBotPlay, chooseLowestCard } from './botHeuristic.js';

const BOT_DELAY_MIN_MS = 600;
const BOT_DELAY_MAX_MS = 1200;

function botDelay(): number {
  return BOT_DELAY_MIN_MS + Math.random() * (BOT_DELAY_MAX_MS - BOT_DELAY_MIN_MS);
}

/**
 * Tracks whether a bot-action timer is already pending for a given round, so
 * `maybeScheduleBotTurn` never schedules two overlapping timers for the same
 * round. Without this, calling it twice in quick succession while the same
 * bot is still "active" (e.g. once from the action that made them active and
 * again from an unrelated broadcast) would leave two timers racing — the
 * second one firing with a stale view of whose turn it actually is.
 */
const pendingBotTimers = new WeakSet<RoundEngine>();

/**
 * If the next actor (current trick turn, or the active exchange prompt) is a
 * bot seat, schedules it to act after a short UX-pacing delay via the exact
 * same RoundEngine methods human socket handlers call — bots are bound by
 * identical validation, not a separate reimplementation. Calls `onActed`
 * after acting so the caller can broadcast fresh state and re-check for the
 * next bot turn.
 */
export function maybeScheduleBotTurn(room: Room, onActed: () => void): void {
  const engine = room.roundEngine;
  if (!engine || pendingBotTimers.has(engine)) return;

  if (engine.state.phase === 'trickTaking') {
    const activePlayerId = engine.state.trick.activePlayerId;
    if (!activePlayerId) return;
    if (!room.getPlayer(activePlayerId)?.isBot) return;

    pendingBotTimers.add(engine);
    setTimeout(() => {
      pendingBotTimers.delete(engine);
      if (room.roundEngine !== engine) return; // round moved on since this timer was scheduled
      // Re-verify it's still actually this bot's turn — the trick may have
      // already resolved (e.g. via the auto-resolve-when-unbeatable rule)
      // by the time this timer fires.
      if (engine.state.phase !== 'trickTaking' || engine.state.trick.activePlayerId !== activePlayerId) return;

      const hand = engine.getHand(activePlayerId);
      const ctx = {
        deckCount: room.config.deckCount,
        runLength: room.config.runLength,
        revolutionActive: engine.state.revolutionActive,
      };
      const requireThreeClubs = engine.state.openingPlayRequiresThreeClubs && engine.state.trick.currentCombo === null;
      const combo = chooseBotPlay(hand, engine.state.trick.currentCombo, ctx, requireThreeClubs);
      if (combo) engine.applyPlay(activePlayerId, combo.cards.map((c) => c.id));
      else engine.applyPass(activePlayerId);
      onActed();
    }, botDelay());
    return;
  }

  if (engine.state.phase === 'exchange') {
    const tx = engine.state.exchange?.transactions[engine.state.exchange.currentIndex];
    if (!tx) return;
    const txId = tx.id;

    if (tx.status === 'awaitingRequest' && room.getPlayer(tx.requesterId)?.isBot) {
      pendingBotTimers.add(engine);
      setTimeout(() => {
        pendingBotTimers.delete(engine);
        if (room.roundEngine !== engine) return;
        const current = engine.state.exchange?.transactions[engine.state.exchange.currentIndex];
        if (!current || current.id !== txId || current.status !== 'awaitingRequest') return;
        const rank = chooseBotExchangeRequestRank(engine.getHand(tx.requesterId));
        engine.submitExchangeRequest(tx.requesterId, rank);
        onActed();
      }, botDelay());
      return;
    }

    if (tx.status === 'awaitingTargetChoice' && room.getPlayer(tx.targetId)?.isBot) {
      pendingBotTimers.add(engine);
      setTimeout(() => {
        pendingBotTimers.delete(engine);
        if (room.roundEngine !== engine) return;
        const current = engine.state.exchange?.transactions[engine.state.exchange.currentIndex];
        if (!current || current.id !== txId || current.status !== 'awaitingTargetChoice') return;
        const hand = engine.getHand(tx.targetId);
        const candidates = hand.filter((c) => current.candidateCardIds?.includes(c.id));
        const card = chooseLowestCard(candidates.length > 0 ? candidates : hand);
        engine.submitExchangeTargetChoice(tx.targetId, card.id);
        onActed();
      }, botDelay());
      return;
    }

    if (tx.status === 'awaitingReturn' && room.getPlayer(tx.requesterId)?.isBot) {
      pendingBotTimers.add(engine);
      setTimeout(() => {
        pendingBotTimers.delete(engine);
        if (room.roundEngine !== engine) return;
        const current = engine.state.exchange?.transactions[engine.state.exchange.currentIndex];
        if (!current || current.id !== txId || current.status !== 'awaitingReturn') return;
        const card = chooseLowestCard(engine.getHand(tx.requesterId));
        engine.submitExchangeReturn(tx.requesterId, card.id);
        onActed();
      }, botDelay());
      return;
    }
  }
}
