import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';

// userId -> active socket ids
const onlineUsers = new Map();

let io;

export const emitToUser = (userId, event, payload) => {
  if (!io) return;
  io.to(userId.toString()).emit(event, payload);
};

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

    socket.join(userId);
    const sockets = onlineUsers.get(userId) || new Set();
    const wasOffline = sockets.size === 0;
    sockets.add(socket.id);
    onlineUsers.set(userId, sockets);
    socket.emit('onlineUsers', Array.from(onlineUsers.keys()));
    if (wasOffline) io.emit('onlineUsers', Array.from(onlineUsers.keys()));

    socket.on('disconnect', () => {
      const activeSockets = onlineUsers.get(userId);
      if (!activeSockets) return;
      activeSockets.delete(socket.id);
      if (activeSockets.size === 0) {
        onlineUsers.delete(userId);
        io.emit('onlineUsers', Array.from(onlineUsers.keys()));
      }
    });
  });

  return io;
};

export { io };
