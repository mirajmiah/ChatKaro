import { create } from 'zustand';
import api from '../lib/axios.js';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';

export const useAuthStore = create((set, get) => ({
  authUser: null,
  onlineUsers: [],
  socket: null,
  isCheckingAuth: true,

  checkAuth: async () => {
    try {
      const res = await api.get('/auth/check');
      set({ authUser: res.data });
      get().connectSocket(res.data);
    } catch {
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    try {
      const res = await api.post('/auth/signup', data);
      set({ authUser: res.data });
      get().connectSocket(res.data);
      toast.success('Account created!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Signup failed');
      throw err;
    }
  },

  login: async (data) => {
    try {
      const res = await api.post('/auth/login', data);
      set({ authUser: res.data });
      get().connectSocket(res.data);
      toast.success(`Welcome back, ${res.data.fullName}!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
      throw err;
    }
  },

  googleLogin: async (credential) => {
    try {
      const res = await api.post('/auth/google', { credential });
      set({ authUser: res.data });
      get().connectSocket(res.data);
      toast.success(`Welcome, ${res.data.fullName}!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Google login failed');
      throw err;
    }
  },

  logout: async () => {
  try {
    await api.post('/auth/logout');
    toast.success('Logged out');
  } catch (err) {
    toast.error(err.response?.data?.message || 'Logout failed');
  } finally {
    get().disconnectSocket();
    set({ authUser: null });
  }
},

  updateProfile: async (data) => {
    try {
      const res = await api.put('/auth/update-profile', data);
      set((state) => ({ authUser: { ...state.authUser, profilePic: res.data.profilePic } }));
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
      throw err;
    }
  },

  updateName: async (fullName) => {
    try {
      const res = await api.put('/auth/update-name', { fullName });
      set((state) => ({ authUser: { ...state.authUser, fullName: res.data.fullName } }));
      toast.success('Name updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Name update failed');
      throw err;
    }
  },

  connectSocket: (user) => {
    const { socket } = get();
    if (socket?.connected) return;
    const newSocket = io(import.meta.env.DEV ? undefined : import.meta.env.VITE_SOCKET_URL, {
      withCredentials: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    newSocket.on('onlineUsers', (users) => set({ onlineUsers: users }));
    set({ socket: newSocket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket?.connected) socket.disconnect();
    set({ socket: null, onlineUsers: [] });
  },
}));
