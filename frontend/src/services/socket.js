import { io } from 'socket.io-client';

let socket = null;

export const getSocket = (token) => {
  if (!socket && token) {
    socket = io('http://localhost:5000', {
      auth: { token },
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};