import type { GameStatePayload, RoomStatePayload } from '@chinese-president/shared';

export interface ClientState {
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  playerId?: string;
  playerToken?: string;
  roomState?: RoomStatePayload;
  gameState?: GameStatePayload;
  errorMessage?: string;
}

export const initialClientState: ClientState = {
  connectionStatus: 'connecting',
};

export type ClientAction =
  | { type: 'CONNECTED' }
  | { type: 'DISCONNECTED' }
  | { type: 'ROOM_JOINED'; playerId: string; playerToken: string; roomState: RoomStatePayload }
  | { type: 'ROOM_STATE'; roomState: RoomStatePayload }
  | { type: 'GAME_STATE'; gameState: GameStatePayload }
  | { type: 'ERROR'; message: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'LEAVE_ROOM' };

export function gameReducer(state: ClientState, action: ClientAction): ClientState {
  switch (action.type) {
    case 'CONNECTED':
      return { ...state, connectionStatus: 'connected' };
    case 'DISCONNECTED':
      return { ...state, connectionStatus: 'disconnected' };
    case 'ROOM_JOINED':
      return { ...state, playerId: action.playerId, playerToken: action.playerToken, roomState: action.roomState, gameState: undefined, errorMessage: undefined };
    case 'ROOM_STATE':
      return { ...state, roomState: action.roomState };
    case 'GAME_STATE':
      return { ...state, gameState: action.gameState };
    case 'ERROR':
      return { ...state, errorMessage: action.message };
    case 'CLEAR_ERROR':
      return { ...state, errorMessage: undefined };
    case 'LEAVE_ROOM':
      return { ...state, playerId: undefined, playerToken: undefined, roomState: undefined, gameState: undefined };
    default:
      return state;
  }
}
