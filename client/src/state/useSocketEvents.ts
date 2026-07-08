import { useEffect } from 'react';
import type { GameActionErrorPayload, GameStatePayload, RoomErrorPayload, RoomJoinedPayload, RoomStatePayload } from '@chinese-president/shared';
import { loadSession, saveSession, socket } from '../socket.js';
import { useGameDispatch } from './GameContext.js';

export function useSocketEvents(): void {
  const dispatch = useGameDispatch();

  useEffect(() => {
    function handleConnect() {
      dispatch({ type: 'CONNECTED' });
      const saved = loadSession();
      if (saved) socket.emit('room:rejoin', saved);
    }
    function handleDisconnect() {
      dispatch({ type: 'DISCONNECTED' });
    }
    function handleRoomCreatedOrJoined(payload: RoomJoinedPayload) {
      saveSession(payload.roomState.roomCode, payload.playerToken);
      dispatch({ type: 'ROOM_JOINED', playerId: payload.playerId, playerToken: payload.playerToken, roomState: payload.roomState });
    }
    function handleRoomState(payload: RoomStatePayload) {
      dispatch({ type: 'ROOM_STATE', roomState: payload });
    }
    function handleGameState(payload: GameStatePayload) {
      dispatch({ type: 'GAME_STATE', gameState: payload });
    }
    function handleRoomError(payload: RoomErrorPayload) {
      dispatch({ type: 'ERROR', message: payload.message });
    }
    function handleActionError(payload: GameActionErrorPayload) {
      dispatch({ type: 'ERROR', message: payload.message });
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('room:created', handleRoomCreatedOrJoined);
    socket.on('room:joined', handleRoomCreatedOrJoined);
    socket.on('room:state', handleRoomState);
    socket.on('game:state', handleGameState);
    socket.on('room:error', handleRoomError);
    socket.on('game:actionError', handleActionError);

    if (socket.connected) handleConnect();

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('room:created', handleRoomCreatedOrJoined);
      socket.off('room:joined', handleRoomCreatedOrJoined);
      socket.off('room:state', handleRoomState);
      socket.off('game:state', handleGameState);
      socket.off('room:error', handleRoomError);
      socket.off('game:actionError', handleActionError);
    };
  }, [dispatch]);
}
