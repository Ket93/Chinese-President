import { randomUUID } from 'node:crypto';
import { RANK_VALUE, type Card, type ExchangeState, type ExchangeTransaction, type GameConfig, type Rank, type Suit } from '@chinese-president/shared';

export type ExchangeActionResult =
  | { ok: true; outcome: 'forfeited'; transactionId: string }
  | { ok: true; outcome: 'needsTargetChoice'; transactionId: string; candidateCardIds: string[] }
  | { ok: true; outcome: 'transferred'; transactionId: string; card: Card; fromId: string; toId: string }
  | { ok: true; outcome: 'returned'; transactionId: string; card: Card; fromId: string; toId: string }
  | { ok: false; reason: string };

function isHighRank(rank: Rank): boolean {
  return RANK_VALUE[rank] > RANK_VALUE['10'];
}

/**
 * Drives the strictly-sequential 3-transaction exchange queue: president's
 * two requests (each fully resolved before the next starts), then the vice
 * president's one request. Never interleaved.
 */
export class ExchangeEngine {
  readonly state: ExchangeState;
  private readonly hands: Map<string, Card[]>;
  private readonly config: GameConfig;

  constructor(params: {
    presidentId: string;
    assholeId: string;
    vicePresidentId: string;
    viceAssholeId: string;
    hands: Map<string, Card[]>;
    config: GameConfig;
  }) {
    this.hands = params.hands;
    this.config = params.config;
    this.state = {
      currentIndex: 0,
      transactions: [
        this.buildTransaction('president', params.presidentId, params.assholeId),
        this.buildTransaction('president', params.presidentId, params.assholeId),
        this.buildTransaction('vicePresident', params.vicePresidentId, params.viceAssholeId),
      ],
    };
  }

  private buildTransaction(role: ExchangeTransaction['role'], requesterId: string, targetId: string): ExchangeTransaction {
    return { id: randomUUID(), role, requesterId, targetId, status: 'awaitingRequest' };
  }

  get current(): ExchangeTransaction | undefined {
    return this.state.transactions[this.state.currentIndex];
  }

  isComplete(): boolean {
    return this.state.currentIndex >= this.state.transactions.length;
  }

  submitRequest(playerId: string, rank: Rank, suit?: Suit): ExchangeActionResult {
    const tx = this.current;
    if (!tx || tx.status !== 'awaitingRequest') return { ok: false, reason: 'NO_ACTIVE_REQUEST' };
    if (playerId !== tx.requesterId) return { ok: false, reason: 'NOT_YOUR_REQUEST' };
    if (isHighRank(rank) && !suit) return { ok: false, reason: 'SUIT_REQUIRED_FOR_HIGH_RANK' };

    tx.requestedRank = rank;
    tx.requestedSuit = isHighRank(rank) ? suit : undefined;

    const targetHand = this.hands.get(tx.targetId) ?? [];
    const matches = isHighRank(rank)
      ? targetHand.filter((c) => c.rank === rank && c.suit === suit)
      : targetHand.filter((c) => c.rank === rank);

    if (matches.length === 0) {
      if (this.config.retryFailedRequest) {
        tx.requestedRank = undefined;
        tx.requestedSuit = undefined;
        return { ok: true, outcome: 'forfeited', transactionId: tx.id };
      }
      tx.status = 'forfeited';
      this.advance();
      return { ok: true, outcome: 'forfeited', transactionId: tx.id };
    }

    if (matches.length === 1) {
      return this.transferCard(tx, tx.targetId, tx.requesterId, matches[0]!.id);
    }

    tx.status = 'awaitingTargetChoice';
    tx.candidateCardIds = matches.map((c) => c.id);
    return { ok: true, outcome: 'needsTargetChoice', transactionId: tx.id, candidateCardIds: tx.candidateCardIds };
  }

  submitTargetChoice(playerId: string, cardId: string): ExchangeActionResult {
    const tx = this.current;
    if (!tx || tx.status !== 'awaitingTargetChoice') return { ok: false, reason: 'NO_ACTIVE_TARGET_CHOICE' };
    if (playerId !== tx.targetId) return { ok: false, reason: 'NOT_YOUR_CHOICE' };
    if (!tx.candidateCardIds?.includes(cardId)) return { ok: false, reason: 'NOT_A_VALID_CANDIDATE' };
    return this.transferCard(tx, tx.targetId, tx.requesterId, cardId);
  }

  submitReturn(playerId: string, cardId: string): ExchangeActionResult {
    const tx = this.current;
    if (!tx || tx.status !== 'awaitingReturn') return { ok: false, reason: 'NO_ACTIVE_RETURN' };
    if (playerId !== tx.requesterId) return { ok: false, reason: 'NOT_YOUR_RETURN' };
    const requesterHand = this.hands.get(tx.requesterId) ?? [];
    if (!requesterHand.some((c) => c.id === cardId)) return { ok: false, reason: 'CARD_NOT_IN_HAND' };

    const card = this.moveCard(tx.requesterId, tx.targetId, cardId)!;
    tx.returnedCardId = cardId;
    tx.status = 'complete';
    this.advance();
    return { ok: true, outcome: 'returned', transactionId: tx.id, card, fromId: tx.requesterId, toId: tx.targetId };
  }

  private transferCard(tx: ExchangeTransaction, fromId: string, toId: string, cardId: string): ExchangeActionResult {
    const card = this.moveCard(fromId, toId, cardId)!;
    tx.transferredCardId = cardId;
    tx.status = 'awaitingReturn';
    return { ok: true, outcome: 'transferred', transactionId: tx.id, card, fromId, toId };
  }

  private moveCard(fromId: string, toId: string, cardId: string): Card | undefined {
    const fromHand = this.hands.get(fromId);
    const toHand = this.hands.get(toId);
    if (!fromHand || !toHand) return undefined;
    const idx = fromHand.findIndex((c) => c.id === cardId);
    if (idx === -1) return undefined;
    const [card] = fromHand.splice(idx, 1);
    toHand.push(card!);
    return card;
  }

  private advance(): void {
    this.state.currentIndex += 1;
  }
}
