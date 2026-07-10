import {
  RANK_VALUE,
  buildDeck,
  dealCards,
  generateLegalMoves,
  isValidPlay,
  shuffle,
  type Card,
  type GameConfig,
  type Rank,
  type RoundState,
  type SeatRankTitle,
  type Suit,
  type TrickEndReason,
  type ValidationFailureReason,
} from '@chinese-president/shared';
import { ExchangeEngine, type ExchangeActionResult } from './ExchangeEngine.js';
import { applyPostPlayHooks } from './houseRules/index.js';
import type { RoundEngineParams, ServerPlayer } from './types.js';

export type PlayActionResult = { ok: true } | { ok: false; reason: ValidationFailureReason | string };

export class RoundEngine {
  readonly roundNumber: number;
  readonly config: GameConfig;
  readonly state: RoundState;

  private readonly players: ServerPlayer[];
  private readonly order: string[];
  private readonly hands: Map<string, Card[]>;
  private readonly leaderIdOverride: string | undefined;
  private readonly previousRankTitles: Map<string, SeatRankTitle> | undefined;
  private exchangeEngine: ExchangeEngine | undefined;

  constructor(params: RoundEngineParams) {
    this.roundNumber = params.roundNumber;
    this.config = params.config;
    this.players = params.players;
    this.order = [...params.players].sort((a, b) => a.seatIndex - b.seatIndex).map((p) => p.id);
    this.leaderIdOverride = params.leaderIdOverride;
    this.previousRankTitles = params.previousRankTitles;
    this.hands = new Map(this.order.map((id) => [id, [] as Card[]]));
    this.state = {
      roundNumber: this.roundNumber,
      phase: 'dealing',
      trick: { currentCombo: null, leaderId: null, activePlayerId: null, turnOrderSeatIndexes: [], passedPlayerIds: [], log: [] },
      finishedOrder: [],
      revolutionActive: false,
      openingPlayRequiresThreeClubs: this.roundNumber === 1 && !params.leaderIdOverride,
      trickHistory: [],
      lastTrickResolution: null,
    };
  }

  startRound(): void {
    const deck = shuffle(buildDeck(this.config.deckCount));
    const dealt = dealCards(deck, this.order);
    for (const [id, hand] of dealt) this.hands.set(id, hand);

    if (this.roundNumber > 1 && this.previousRankTitles) {
      const exchangeEngine = this.tryBuildExchangeEngine(this.previousRankTitles);
      if (exchangeEngine) {
        this.exchangeEngine = exchangeEngine;
        this.state.phase = 'exchange';
        this.state.exchange = exchangeEngine.state;
        return;
      }
    }

    this.startTrickTakingPhase(this.leaderIdOverride ?? this.determineFirstLeader());
  }

  getHand(playerId: string): Card[] {
    return this.hands.get(playerId) ?? [];
  }

  /** Test-only: bypasses shuffling/dealing to set up an exact scenario, then starts trick-taking directly. */
  startTrickTakingForTesting(hands: Record<string, Card[]>, leaderId: string): void {
    for (const [id, cards] of Object.entries(hands)) this.hands.set(id, [...cards]);
    this.startTrickTakingPhase(leaderId);
  }

  getRankTitles(): Map<string, SeatRankTitle> {
    const order = this.state.finishedOrder;
    const n = order.length;
    const map = new Map<string, SeatRankTitle>();
    // With fewer than 4 finishers there's no room for a distinct Vice
    // President / Vice Asshole pair (the exchange phase needs all four
    // titles to exist, and correctly skips itself when they don't — see
    // tryBuildExchangeEngine). A 2-player round is just president/asshole; a
    // 3-player round is president/citizen/asshole.
    order.forEach((id, i) => {
      let title: SeatRankTitle;
      if (i === 0) title = 'president';
      else if (i === n - 1) title = 'asshole';
      else if (n >= 4 && i === 1) title = 'vicePresident';
      else if (n >= 4 && i === n - 2) title = 'viceAsshole';
      else title = 'citizen';
      map.set(id, title);
    });
    return map;
  }

  getAssholeId(): string | undefined {
    return this.state.finishedOrder[this.state.finishedOrder.length - 1];
  }

  // --- Exchange phase ---------------------------------------------------

  submitExchangeRequest(playerId: string, rank: Rank, suit?: Suit): ExchangeActionResult {
    if (this.state.phase !== 'exchange' || !this.exchangeEngine) return { ok: false, reason: 'WRONG_PHASE' };
    const result = this.exchangeEngine.submitRequest(playerId, rank, suit);
    this.afterExchangeStep();
    return result;
  }

  submitExchangeTargetChoice(playerId: string, cardId: string): ExchangeActionResult {
    if (this.state.phase !== 'exchange' || !this.exchangeEngine) return { ok: false, reason: 'WRONG_PHASE' };
    const result = this.exchangeEngine.submitTargetChoice(playerId, cardId);
    this.afterExchangeStep();
    return result;
  }

  submitExchangeReturn(playerId: string, cardId: string): ExchangeActionResult {
    if (this.state.phase !== 'exchange' || !this.exchangeEngine) return { ok: false, reason: 'WRONG_PHASE' };
    const result = this.exchangeEngine.submitReturn(playerId, cardId);
    this.afterExchangeStep();
    return result;
  }

  private tryBuildExchangeEngine(rankTitles: Map<string, SeatRankTitle>): ExchangeEngine | undefined {
    const byTitle = (title: SeatRankTitle) => [...rankTitles.entries()].find(([, t]) => t === title)?.[0];
    const presidentId = byTitle('president');
    const assholeId = byTitle('asshole');
    const vicePresidentId = byTitle('vicePresident');
    const viceAssholeId = byTitle('viceAsshole');
    if (!presidentId || !assholeId || !vicePresidentId || !viceAssholeId) return undefined;
    return new ExchangeEngine({ presidentId, assholeId, vicePresidentId, viceAssholeId, hands: this.hands, config: this.config });
  }

  private afterExchangeStep(): void {
    if (this.exchangeEngine?.isComplete()) {
      this.exchangeEngine = undefined;
      this.state.exchange = undefined;
      this.startTrickTakingPhase(this.leaderIdOverride ?? this.determineFirstLeader());
    }
  }

  // --- Trick-taking phase -------------------------------------------------

  applyPlay(playerId: string, cardIds: string[]): PlayActionResult {
    if (this.state.phase !== 'trickTaking') return { ok: false, reason: 'WRONG_PHASE' };
    if (this.state.trick.activePlayerId !== playerId) return { ok: false, reason: 'NOT_YOUR_TURN' };

    const hand = this.hands.get(playerId) ?? [];
    const cardSet = new Set(cardIds);
    const cards = hand.filter((c) => cardSet.has(c.id));
    if (cards.length !== cardIds.length) return { ok: false, reason: 'CARDS_NOT_IN_HAND' };

    const validation = isValidPlay(cards, this.state.trick.currentCombo, this.ruleContext());
    if (!validation.ok) return { ok: false, reason: validation.reason };

    if (this.state.openingPlayRequiresThreeClubs && this.state.trick.currentCombo === null) {
      const includesThreeClubs = cards.some((c) => c.rank === '3' && c.suit === 'clubs');
      if (!includesThreeClubs) return { ok: false, reason: 'OPENING_PLAY_MUST_INCLUDE_THREE_OF_CLUBS' };
    }

    this.hands.set(playerId, hand.filter((c) => !cardSet.has(c.id)));
    this.state.trick.currentCombo = validation.combo;
    this.state.trick.leaderId = playerId;
    this.state.trick.log.push({ playerId, action: validation.combo });
    this.state.openingPlayRequiresThreeClubs = false;
    // A new combo raises the bar for everyone else, so players who already
    // passed against the previous (lower) combo get reconsidered once the
    // rotation reaches them again, rather than being locked out for the
    // whole trick.
    this.state.trick.passedPlayerIds = [];

    let forcedWinner: string | null = null;
    applyPostPlayHooks({
      config: this.config,
      state: this.state,
      combo: validation.combo,
      playerId,
      forceResolveTrick: (winnerId) => {
        forcedWinner = winnerId;
      },
    });

    if ((this.hands.get(playerId) ?? []).length === 0) {
      this.state.finishedOrder.push(playerId);
    }

    if (this.checkAndHandleRoundEnd()) return { ok: true };

    if (forcedWinner) {
      this.resolveTrick(forcedWinner, 'eightEndsRound');
    } else if (this.noRemainingPlayerCanBeat(playerId)) {
      // Nobody else holds a hand capable of beating this combo — end the
      // trick immediately instead of making everyone pass in turn.
      this.resolveTrick(playerId, 'noOneCanBeat');
    } else {
      this.advanceOrResolve(playerId);
    }
    return { ok: true };
  }

  applyPass(playerId: string): PlayActionResult {
    if (this.state.phase !== 'trickTaking') return { ok: false, reason: 'WRONG_PHASE' };
    if (this.state.trick.activePlayerId !== playerId) return { ok: false, reason: 'NOT_YOUR_TURN' };
    if (this.state.trick.currentCombo === null) return { ok: false, reason: 'CANNOT_PASS_WHEN_LEADING' };

    this.state.trick.passedPlayerIds = [...this.state.trick.passedPlayerIds, playerId];
    this.state.trick.log.push({ playerId, action: 'pass' });
    this.advanceOrResolve(playerId);
    return { ok: true };
  }

  private ruleContext() {
    return { deckCount: this.config.deckCount, runLength: this.config.runLength, revolutionActive: this.state.revolutionActive };
  }

  private startTrickTakingPhase(leaderId: string): void {
    this.state.phase = 'trickTaking';
    this.state.trick = {
      currentCombo: null,
      leaderId,
      activePlayerId: leaderId,
      turnOrderSeatIndexes: this.order.map((id) => this.players.find((p) => p.id === id)!.seatIndex),
      passedPlayerIds: [],
      log: [],
    };
  }

  private determineFirstLeader(): string {
    const holders = new Set<string>();
    for (const [playerId, hand] of this.hands) {
      if (hand.some((c) => c.rank === '3' && c.suit === 'clubs')) holders.add(playerId);
    }
    const holderList = [...holders];
    if (holderList.length === 1) return holderList[0]!;
    if (holderList.length === 0) {
      throw new Error('No 3 of clubs found in deck — deck construction is broken');
    }

    if (this.config.threeClubsTiebreak === 'mostLowCards') {
      let best = holderList[0]!;
      let bestCount = -1;
      for (const id of holderList) {
        const count = this.hands.get(id)!.filter((c) => RANK_VALUE[c.rank] <= RANK_VALUE['7']).length;
        if (count > bestCount || (count === bestCount && Math.random() < 0.5)) {
          best = id;
          bestCount = count;
        }
      }
      return best;
    }

    return holderList[Math.floor(Math.random() * holderList.length)]!;
  }

  private checkAndHandleRoundEnd(): boolean {
    const stillHolding = this.order.filter((id) => (this.hands.get(id) ?? []).length > 0);
    if (stillHolding.length <= 1) {
      if (stillHolding.length === 1 && !this.state.finishedOrder.includes(stillHolding[0]!)) {
        this.state.finishedOrder.push(stillHolding[0]!);
      }
      this.state.phase = 'roundEnd';
      this.state.trick.activePlayerId = null;
      return true;
    }
    return false;
  }

  /** True if every other active (still-holding, in-hand) player has no legal move that beats the current combo. */
  private noRemainingPlayerCanBeat(leaderId: string): boolean {
    const ctx = this.ruleContext();
    for (const id of this.order) {
      if (id === leaderId) continue;
      const hand = this.hands.get(id) ?? [];
      if (hand.length === 0) continue;
      if (generateLegalMoves(hand, this.state.trick.currentCombo, ctx).length > 0) return false;
    }
    return true;
  }

  private advanceOrResolve(afterId: string): void {
    const next = this.nextActivePlayer(afterId);
    if (next) {
      this.state.trick.activePlayerId = next;
    } else {
      this.resolveTrick(this.state.trick.leaderId!, 'allPassed');
    }
  }

  private nextActivePlayer(afterId: string): string | null {
    const startIdx = this.order.indexOf(afterId);
    const passed = new Set(this.state.trick.passedPlayerIds);
    const leaderId = this.state.trick.leaderId;
    for (let step = 1; step <= this.order.length; step++) {
      const candidate = this.order[(startIdx + step) % this.order.length]!;
      if (candidate === leaderId) continue;
      if (passed.has(candidate)) continue;
      if ((this.hands.get(candidate) ?? []).length === 0) continue;
      return candidate;
    }
    return null;
  }

  private firstActivePlayerAfter(afterId: string): string {
    const startIdx = this.order.indexOf(afterId);
    for (let step = 1; step <= this.order.length; step++) {
      const candidate = this.order[(startIdx + step) % this.order.length]!;
      if ((this.hands.get(candidate) ?? []).length > 0) return candidate;
    }
    throw new Error('No active player found — round should have already ended');
  }

  private resolveTrick(winnerId: string, reason: TrickEndReason): void {
    if (this.state.trick.log.length > 0) {
      this.state.trickHistory = [this.state.trick.log, ...this.state.trickHistory];
    }
    this.state.lastTrickResolution = { winnerId, reason };

    const winnerHasCards = (this.hands.get(winnerId) ?? []).length > 0;
    const nextLeader = winnerHasCards ? winnerId : this.firstActivePlayerAfter(winnerId);
    this.state.trick = {
      currentCombo: null,
      leaderId: nextLeader,
      activePlayerId: nextLeader,
      turnOrderSeatIndexes: this.state.trick.turnOrderSeatIndexes,
      passedPlayerIds: [],
      log: [],
    };
  }
}
