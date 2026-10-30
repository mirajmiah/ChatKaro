import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import User from '../models/user.model.js';
import { SERVER_COMMIT, SERVER_START_TIME } from './version.js';

// userId -> active socket ids
const onlineUsers = new Map();

let io;

export const emitToUser = (userId, event, payload) => {
  if (!io) return;
  io.to(userId.toString()).emit(event, payload);
};

// Broadcast only explicitly sanitized public profile fields, never private account data.
export const emitToAll = (event, payload) => {
  if (!io) return;
  io.emit(event, payload);
};

export const isUserOnline = (userId) => {
  if (!userId) return false;
  const sockets = onlineUsers.get(userId.toString());
  return Boolean(sockets && sockets.size > 0);
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

    const uid = userId.toString();
    socket.join(uid);
    const sockets = onlineUsers.get(uid) || new Set();
    const wasOffline = sockets.size === 0;
    sockets.add(socket.id);
    onlineUsers.set(uid, sockets);
    socket.emit('onlineUsers', Array.from(onlineUsers.keys()));
    if (wasOffline) io.emit('onlineUsers', Array.from(onlineUsers.keys()));
    socket.emit('appVersion', {
      commit: process.env.RENDER_GIT_COMMIT || SERVER_COMMIT,
      buildTime: SERVER_START_TIME,
    });

    socket.on('typing:start', ({ receiverId }) => {
      if (receiverId) {
        emitToUser(receiverId.toString(), 'typing:start', { senderId: uid });
      }
    });

    socket.on('typing:stop', ({ receiverId }) => {
      if (receiverId) {
        emitToUser(receiverId.toString(), 'typing:stop', { senderId: uid });
      }
    });

    socket.on('disconnect', () => {
      const activeSockets = onlineUsers.get(uid);
      if (!activeSockets) return;
      activeSockets.delete(socket.id);
      if (activeSockets.size === 0) {
        onlineUsers.delete(uid);
        const lastSeenDate = new Date();
        io.emit('onlineUsers', Array.from(onlineUsers.keys()));
        io.emit('userOffline', { userId: uid, lastSeen: lastSeenDate.toISOString() });
        User.findByIdAndUpdate(uid, { lastSeen: lastSeenDate }).exec().catch((err) => {
          console.error('Failed to update user lastSeen on disconnect:', err.message);
        });
      }
    });
  });

  return io;
};

export { io };
