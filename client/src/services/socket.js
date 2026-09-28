import { io } from 'socket.io-client';

const rawSocketUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL;
const SOCKET_URL = rawSocketUrl
  ? rawSocketUrl.replace(/\/api\/?$/, '').replace(/\/$/, '')
  : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001');

const socket = io(SOCKET_URL, {
  autoConnect: false,
});

export const authenticate = (userId) => {
  if (!userId) return;
  socket.connect();
  socket.emit('authenticate', { userId });
};

export const joinSpace = (spaceId) => {
  if (!spaceId) return;
  socket.emit('space:join', spaceId);
};

export const joinSession = (sessionId) => {
  if (!sessionId) return;
  socket.emit('session:join', sessionId);
};

export const leaveSession = (sessionId) => {
  if (!sessionId) return;
  socket.emit('session:leave', sessionId);
};

export default socket;
