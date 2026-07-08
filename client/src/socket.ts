import { io, type Socket } from 'socket.io-client';

// In dev, the client (Vite, :5173) and server (:3001) run as separate
// processes, so default to localhost:3001. In a production build served by
// the server itself (single-service deploy), omit the URL entirely so
// socket.io-client connects to the page's own origin.
const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? (import.meta.env.DEV ? 'http://localhost:3001' : undefined);

export const socket: Socket = SERVER_URL ? io(SERVER_URL, { autoConnect: true }) : io({ autoConnect: true });

const ROOM_CODE_KEY = 'cp:roomCode';
const PLAYER_TOKEN_KEY = 'cp:playerToken';

export function saveSession(roomCode: string, playerToken: string): void {
  sessionStorage.setItem(ROOM_CODE_KEY, roomCode);
  sessionStorage.setItem(PLAYER_TOKEN_KEY, playerToken);
}

export function loadSession(): { roomCode: string; playerToken: string } | null {
  const roomCode = sessionStorage.getItem(ROOM_CODE_KEY);
  const playerToken = sessionStorage.getItem(PLAYER_TOKEN_KEY);
  return roomCode && playerToken ? { roomCode, playerToken } : null;
}

export function clearSession(): void {
  sessionStorage.removeItem(ROOM_CODE_KEY);
  sessionStorage.removeItem(PLAYER_TOKEN_KEY);
}
