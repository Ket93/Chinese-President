import type { GameConfig } from '@chinese-president/shared';
import { Room } from './Room.js';
import { generateRoomCode } from '../util/roomCode.js';

export class RoomManager {
  private readonly rooms = new Map<string, Room>();

  createRoom(hostName: string, hostSocketId: string, configOverrides?: Partial<GameConfig>): Room {
    let code = generateRoomCode();
    while (this.rooms.has(code)) code = generateRoomCode();
    const room = new Room(code, hostName, hostSocketId, configOverrides);
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  findRoomBySocketId(socketId: string): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.findBySocketId(socketId)) return room;
    }
    return undefined;
  }

  removeRoomIfEmpty(code: string): void {
    const room = this.rooms.get(code);
    if (room && room.isEmpty()) this.rooms.delete(code);
  }
}
