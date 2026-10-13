import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';

// userId -> socketId
const onlineUsers = new Map();

let io;

export const getReceiverSocketId = (userId) => onlineUsers.get(userId.toString());

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    },
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
    },
  });

  io.on('connection', (socket) => {
    let userId;
    try {
      const cookies = cookie.parse(socket.handshake.headers.cookie || '');
      const token = cookies['nexus-jwt'];
      if (!token) {
        socket.disconnect(true);
        return;
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.userId;
    } catch {
      socket.disconnect(true);
      return;
    }

    onlineUsers.set(userId, socket.id);
    io.emit('onlineUsers', Array.from(onlineUsers.keys()));

    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      io.emit('onlineUsers', Array.from(onlineUsers.keys()));
    });
  });

  return io;
};

export { io };
