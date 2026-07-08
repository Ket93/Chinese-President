import type { Server, Socket } from 'socket.io';
import type { GameConfig, Rank, Suit } from '@chinese-president/shared';
import { maybeScheduleBotTurn } from '../game/BotPlayer.js';
import type { Room } from '../rooms/Room.js';
import { RoomManager } from '../rooms/RoomManager.js';

interface SocketSessionData {
  roomCode?: string;
  playerId?: string;
}

function sessionData(socket: Socket): SocketSessionData {
  return socket.data as SocketSessionData;
}

function broadcastRoomState(io: Server, room: Room): void {
  io.to(room.code).emit('room:state', room.getRoomStateBroadcast());
}

function broadcastGameState(io: Server, room: Room): void {
  for (const player of room.orderedPlayers()) {
    if (!player.socketId) continue;
    const gameState = room.getGameStateFor(player.id);
    if (gameState) io.to(player.socketId).emit('game:state', gameState);
  }
}

/** Central hook called after every state-mutating action: broadcasts fresh state, then lets bots take their turn if it's their move. */
function afterMutation(io: Server, room: Room): void {
  room.maybeFinalizeRoundEnd();
  if (room.phase === 'inGame') broadcastGameState(io, room);
  broadcastRoomState(io, room);
  maybeScheduleBotTurn(room, () => afterMutation(io, room));
}

export function registerSocketHandlers(io: Server, roomManager: RoomManager): void {
  io.on('connection', (socket: Socket) => {
    function getRoom(): Room | undefined {
      const code = sessionData(socket).roomCode;
      return code ? roomManager.getRoom(code) : undefined;
    }

    function requirePlayerId(): string | undefined {
      return sessionData(socket).playerId;
    }

    socket.on('room:create', (payload: { hostName?: string; config?: Partial<GameConfig> }) => {
      const room = roomManager.createRoom(payload?.hostName?.trim() || 'Host', socket.id, payload?.config);
      const player = room.getPlayer(room.hostId)!;
      sessionData(socket).roomCode = room.code;
      sessionData(socket).playerId = player.id;
      socket.join(room.code);
      socket.emit('room:created', { playerId: player.id, playerToken: player.playerToken, roomState: room.getRoomStateBroadcast() });
    });

    socket.on('room:join', (payload: { roomCode?: string; name?: string }) => {
      const room = roomManager.getRoom(payload?.roomCode ?? '');
      if (!room) return socket.emit('room:error', { message: 'Room not found.' });
      if (room.phase !== 'lobby') return socket.emit('room:error', { message: 'That game has already started.' });
      if (room.orderedPlayers().length >= 8) return socket.emit('room:error', { message: 'Room is full (8 players max).' });

      const { player, playerToken } = room.addPlayer(payload?.name?.trim() || 'Player', socket.id);
      sessionData(socket).roomCode = room.code;
      sessionData(socket).playerId = player.id;
      socket.join(room.code);
      socket.emit('room:joined', { playerId: player.id, playerToken, roomState: room.getRoomStateBroadcast() });
      broadcastRoomState(io, room);
    });

    socket.on('room:rejoin', (payload: { roomCode?: string; playerToken?: string }) => {
      const room = roomManager.getRoom(payload?.roomCode ?? '');
      if (!room) return socket.emit('room:error', { message: 'Room not found.' });
      const player = room.reconnect(payload?.playerToken ?? '', socket.id);
      if (!player) return socket.emit('room:error', { message: 'Could not rejoin that room.' });

      sessionData(socket).roomCode = room.code;
      sessionData(socket).playerId = player.id;
      socket.join(room.code);
      socket.emit('room:joined', { playerId: player.id, playerToken: player.playerToken, roomState: room.getRoomStateBroadcast() });
      const gameState = room.getGameStateFor(player.id);
      if (gameState) socket.emit('game:state', gameState);
      broadcastRoomState(io, room);
    });

    socket.on('room:updateConfig', (payload: { config?: Partial<GameConfig> }) => {
      const room = getRoom();
      if (!room || room.hostId !== requirePlayerId()) return;
      room.updateConfig(payload?.config ?? {});
      broadcastRoomState(io, room);
    });

    socket.on('room:addBot', () => {
      const room = getRoom();
      if (!room || room.hostId !== requirePlayerId()) return;
      if (room.orderedPlayers().length >= 8) return socket.emit('room:error', { message: 'Room is full (8 players max).' });
      room.addBot();
      broadcastRoomState(io, room);
    });

    socket.on('room:removeBot', (payload: { playerId?: string }) => {
      const room = getRoom();
      if (!room || room.hostId !== requirePlayerId() || !payload?.playerId) return;
      room.removeBot(payload.playerId);
      broadcastRoomState(io, room);
    });

    socket.on('room:startGame', () => {
      const room = getRoom();
      if (!room || room.hostId !== requirePlayerId()) return;
      if (!room.canStart()) return socket.emit('room:error', { message: 'Need 4-8 players to start.' });
      room.startGame();
      afterMutation(io, room);
    });

    socket.on('room:startNextRound', () => {
      const room = getRoom();
      if (!room || room.hostId !== requirePlayerId()) return;
      if (room.roundEngine?.state.phase !== 'roundEnd') return;
      room.startNextRound();
      afterMutation(io, room);
    });

    socket.on('game:playCards', (payload: { cardIds?: string[] }) => {
      const room = getRoom();
      const playerId = requirePlayerId();
      if (!room || !playerId || !room.roundEngine) return;
      const result = room.roundEngine.applyPlay(playerId, payload?.cardIds ?? []);
      if (!result.ok) return socket.emit('game:actionError', { code: result.reason, message: result.reason });
      afterMutation(io, room);
    });

    socket.on('game:pass', () => {
      const room = getRoom();
      const playerId = requirePlayerId();
      if (!room || !playerId || !room.roundEngine) return;
      const result = room.roundEngine.applyPass(playerId);
      if (!result.ok) return socket.emit('game:actionError', { code: result.reason, message: result.reason });
      afterMutation(io, room);
    });

    socket.on('exchange:submitRequest', (payload: { rank?: Rank; suit?: Suit }) => {
      const room = getRoom();
      const playerId = requirePlayerId();
      if (!room || !playerId || !room.roundEngine || !payload?.rank) return;
      const result = room.roundEngine.submitExchangeRequest(playerId, payload.rank, payload.suit);
      if (!result.ok) return socket.emit('game:actionError', { code: result.reason, message: result.reason });
      afterMutation(io, room);
    });

    socket.on('exchange:submitTargetChoice', (payload: { cardId?: string }) => {
      const room = getRoom();
      const playerId = requirePlayerId();
      if (!room || !playerId || !room.roundEngine || !payload?.cardId) return;
      const result = room.roundEngine.submitExchangeTargetChoice(playerId, payload.cardId);
      if (!result.ok) return socket.emit('game:actionError', { code: result.reason, message: result.reason });
      afterMutation(io, room);
    });

    socket.on('exchange:submitReturn', (payload: { cardId?: string }) => {
      const room = getRoom();
      const playerId = requirePlayerId();
      if (!room || !playerId || !room.roundEngine || !payload?.cardId) return;
      const result = room.roundEngine.submitExchangeReturn(playerId, payload.cardId);
      if (!result.ok) return socket.emit('game:actionError', { code: result.reason, message: result.reason });
      afterMutation(io, room);
    });

    socket.on('disconnect', () => {
      const roomCode = sessionData(socket).roomCode;
      if (!roomCode) return;
      const room = roomManager.getRoom(roomCode);
      if (!room) return;
      const becameEmpty = room.markDisconnected(socket.id);
      if (becameEmpty) {
        roomManager.removeRoomIfEmpty(roomCode);
        return;
      }
      broadcastRoomState(io, room);
    });
  });
}
