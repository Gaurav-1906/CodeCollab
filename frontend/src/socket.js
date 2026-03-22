import { io } from 'socket.io-client';

// IMPORTANT: No fallback to localhost in production!
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

if (!SOCKET_URL) {
  console.error('❌ VITE_SOCKET_URL is not defined in environment variables!');
  console.error('Please add VITE_SOCKET_URL to your Vercel environment variables.');
}

console.log('🔌 Socket.IO configuration:');
console.log('   URL:', SOCKET_URL);

const socket = io(SOCKET_URL, {
  withCredentials: true,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  autoConnect: true
});

// Wait for connection helper
export const waitForSocket = () => {
  return new Promise((resolve) => {
    if (socket.connected) {
      resolve(socket);
    } else {
      socket.once('connect', () => resolve(socket));
    }
  });
};

export default socket;