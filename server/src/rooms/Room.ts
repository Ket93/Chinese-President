import { randomUUID } from 'node:crypto';
import {
  DEFAULT_GAME_CONFIG,
  MAX_PLAYERS,
  MIN_PLAYERS,
  type ExchangeTransaction,
  type GameConfig,
  type GameStatePayload,
  type PlayerPrivate,
  type PlayerPublic,
  type RoomStatePayload,
  type RoundState,
  type SessionStats,
} from '@chinese-president/shared';
import { RoundEngine } from '../game/RoundEngine.js';
import type { ServerPlayer } from '../game/types.js';

export type RoomPhase = 'lobby' | 'inGame';

export class Room {
  readonly code: string;
  hostId: string;
  phase: RoomPhase = 'lobby';
  config: GameConfig;
  roundEngine: RoundEngine | undefined;
  sessionStats: SessionStats = { presidentCounts: {} };

  private readonly players = new Map<string, ServerPlayer>();
  private seatCounter = 0;
  private roundEndFinalized = false;

  constructor(code: string, hostName: string, hostSocketId: string, configOverrides?: Partial<GameConfig>) {
    this.code = code;
    this.config = mergeConfig(DEFAULT_GAME_CONFIG, configOverrides);
    const { player } = this.addPlayer(hostName, hostSocketId);
    this.hostId = player.id;
  }

  addPlayer(name: string, socketId: string): { player: ServerPlayer; playerToken: string } {
    const player: ServerPlayer = {
      id: randomUUID(),
      name,
      seatIndex: this.seatCounter++,
      isBot: false,
      connected: true,
      socketId,
      playerToken: randomUUID(),
    };
    this.players.set(player.id, player);
    return { player, playerToken: player.playerToken };
  }

  addBot(): ServerPlayer {
    const botNumber = [...this.players.values()].filter((p) => p.isBot).length + 1;
    const player: ServerPlayer = {
      id: randomUUID(),
      name: `Bot ${botNumber}`,
      seatIndex: this.seatCounter++,
      isBot: true,
      connected: true,
      socketId: null,
      playerToken: randomUUID(),
    };
    this.players.set(player.id, player);
    return player;
  }

  removeBot(playerId: string): boolean {
    const player = this.players.get(playerId);
    if (!player || !player.isBot || this.phase !== 'lobby') return false;
    return this.players.delete(playerId);
  }

  getPlayer(playerId: string): ServerPlayer | undefined {
    return this.players.get(playerId);
  }

  findByToken(playerToken: string): ServerPlayer | undefined {
    return [...this.players.values()].find((p) => p.playerToken === playerToken);
  }

  findBySocketId(socketId: string): ServerPlayer | undefined {
    return [...this.players.values()].find((p) => p.socketId === socketId);
  }

  reconnect(playerToken: string, socketId: string): ServerPlayer | undefined {
    const player = this.findByToken(playerToken);
    if (!player) return undefined;
    player.socketId = socketId;
    player.connected = true;
    return player;
  }

  /** Returns true if the room is now empty and should be cleaned up. */
  markDisconnected(socketId: string): boolean {
    const player = this.findBySocketId(socketId);
    if (!player) return this.players.size === 0;

    if (this.phase === 'lobby') {
      this.players.delete(player.id);
      if (this.hostId === player.id) {
        const next = this.orderedPlayers()[0];
        if (next) this.hostId = next.id;
      }
    } else {
      player.connected = false;
      player.socketId = null;
    }
    return this.players.size === 0;
  }

  updateConfig(partial: Partial<GameConfig>): void {
    if (this.phase !== 'lobby') return;
    this.config = mergeConfig(this.config, partial);
  }

  canStart(): boolean {
    return this.phase === 'lobby' && this.players.size >= MIN_PLAYERS && this.players.size <= MAX_PLAYERS;
  }

  startGame(): void {
    this.phase = 'inGame';
    this.roundEndFinalized = false;
    this.roundEngine = new RoundEngine({ roundNumber: 1, players: this.orderedPlayers(), config: this.config });
    this.roundEngine.startRound();
  }

  startNextRound(): void {
    if (!this.roundEngine) return;
    const nextRoundNumber = this.roundEngine.roundNumber + 1;
    const rankTitles = this.roundEngine.getRankTitles();
    const leaderIdOverride = this.roundEngine.getAssholeId();
    this.roundEndFinalized = false;
    this.roundEngine = new RoundEngine({
      roundNumber: nextRoundNumber,
      players: this.orderedPlayers(),
      config: this.config,
      leaderIdOverride,
      previousRankTitles: rankTitles,
    });
    this.roundEngine.startRound();
  }

  /**
   * Call after every play/pass. Finalizes rank titles + session stats exactly
   * once when a round transitions into roundEnd. Returns true the first time
   * this fires for a given round (callers use that to broadcast round:ended).
   */
  maybeFinalizeRoundEnd(): boolean {
    if (!this.roundEngine || this.roundEndFinalized) return false;
    if (this.roundEngine.state.phase !== 'roundEnd') return false;

    const rankTitles = this.roundEngine.getRankTitles();
    for (const [id, title] of rankTitles) {
      const player = this.players.get(id);
      if (player) player.rankTitle = title;
    }
    const presidentId = [...rankTitles.entries()].find(([, t]) => t === 'president')?.[0];
    if (presidentId) {
      this.sessionStats.presidentCounts[presidentId] = (this.sessionStats.presidentCounts[presidentId] ?? 0) + 1;
    }
    this.roundEndFinalized = true;
    return true;
  }

  orderedPlayers(): ServerPlayer[] {
    return [...this.players.values()].sort((a, b) => a.seatIndex - b.seatIndex);
  }

  getPublicPlayers(): PlayerPublic[] {
    return this.orderedPlayers().map((p) => this.toPublic(p));
  }

  getPrivateState(playerId: string): PlayerPrivate | undefined {
    const player = this.players.get(playerId);
    if (!player) return undefined;
    return { ...this.toPublic(player), hand: this.roundEngine?.getHand(playerId) ?? [] };
  }

  getRoomStateBroadcast(): RoomStatePayload {
    return { roomCode: this.code, phase: this.phase, config: this.config, hostId: this.hostId, players: this.getPublicPlayers() };
  }

  getGameStateFor(playerId: string): GameStatePayload | undefined {
    if (!this.roundEngine) return undefined;
    const you = this.getPrivateState(playerId);
    if (!you) return undefined;
    return {
      round: this.redactRoundStateFor(playerId, this.roundEngine.state),
      you,
      players: this.getPublicPlayers(),
      sessionStats: this.sessionStats,
    };
  }

  isEmpty(): boolean {
    return this.players.size === 0;
  }

  /**
   * Exchange card identities are private: only the two participants in a
   * transaction see which physical card moved or which cards were candidates
   * for a multi-match request. Everyone else just sees that a transfer
   * happened. Requested rank/suit stay visible to all — that part is spoken
   * aloud in the real game.
   */
  private redactRoundStateFor(viewerId: string, state: RoundState): RoundState {
    if (!state.exchange) return state;
    const transactions: ExchangeTransaction[] = state.exchange.transactions.map((tx) => {
      const isParticipant = tx.requesterId === viewerId || tx.targetId === viewerId;
      return {
        ...tx,
        transferredCardId: isParticipant ? tx.transferredCardId : undefined,
        returnedCardId: isParticipant ? tx.returnedCardId : undefined,
        candidateCardIds: viewerId === tx.targetId ? tx.candidateCardIds : undefined,
      };
    });
    return { ...state, exchange: { ...state.exchange, transactions } };
  }

  private toPublic(p: ServerPlayer): PlayerPublic {
    const hand = this.roundEngine?.getHand(p.id) ?? [];
    return {
      id: p.id,
      name: p.name,
      seatIndex: p.seatIndex,
      isBot: p.isBot,
      connected: p.connected,
      cardCount: hand.length,
      isOutOfTrick: !!this.roundEngine && this.roundEngine.state.phase !== 'dealing' && hand.length === 0,
      rankTitle: p.rankTitle,
    };
  }
}

function mergeConfig(base: GameConfig, partial?: Partial<GameConfig>): GameConfig {
  if (!partial) return base;
  return {
    ...base,
    ...partial,
    houseRules: { ...base.houseRules, ...partial.houseRules },
  };
}
