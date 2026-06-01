import { io, type Socket } from 'socket.io-client';

const SOCKET_URL = 'https://api-apexarenas.onrender.com';

let _socket: Socket | null = null;

export function getOrCreateSocket(token: string): Socket {
  if (_socket) {
    (_socket as any).auth = { token };
    if (!_socket.connected) _socket.connect();
    return _socket;
  }

  _socket = io(`${SOCKET_URL}/community`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  return _socket;
}

export function disconnectSocket(): void {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }
}
