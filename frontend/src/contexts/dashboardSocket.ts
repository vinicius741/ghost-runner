import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

/**
 * Returns the singleton Socket.io client instance.
 * Ensures that different dashboard hooks share the same connection.
 */
export function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io();
  }
  return socketInstance;
}
