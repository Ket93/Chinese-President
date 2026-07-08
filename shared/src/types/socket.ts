import type { GameConfig } from './config.js';
import type { RoundState, SessionStats } from './game.js';
import type { PlayerPrivate, PlayerPublic } from './player.js';

export type RoomPhase = 'lobby' | 'inGame';

export interface RoomStatePayload {
  roomCode: string;
  phase: RoomPhase;
  config: GameConfig;
  hostId: string;
  players: PlayerPublic[];
}

export interface GameStatePayload {
  round: RoundState;
  you: PlayerPrivate;
  players: PlayerPublic[];
  sessionStats: SessionStats;
}

export interface RoomJoinedPayload {
  playerId: string;
  playerToken: string;
  roomState: RoomStatePayload;
}

export interface RoomErrorPayload {
  message: string;
}

export interface GameActionErrorPayload {
  code: string;
  message: string;
}
