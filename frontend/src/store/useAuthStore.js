import { create } from 'zustand';
import api from '../lib/axios.js';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { translateCurrent } from '../lib/i18n.js';

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
      toast.success(translateCurrent('Verification code sent to your email.'));
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.detail
        ? `${err.response.data.message} (${err.response.data.detail})`
        : err.response?.data?.message || 'Signup failed';
      toast.error(translateCurrent(msg));
      throw err;
    }
  },

  verifySignupOtp: async (email, otp, fullName, password) => {
    try {
      const res = await api.post('/auth/signup/verify-otp', { email, otp, fullName, password });
      set({ authUser: res.data });
      get().connectSocket(res.data);
      toast.success(translateCurrent('Email verified. Your account is ready.'));
      return res.data;
    } catch (err) {
      toast.error(translateCurrent(err.response?.data?.message || 'Unable to verify email'));
      throw err;
    }
  },

  resendSignupOtp: async (email) => {
    try {
      const res = await api.post('/auth/signup/resend-otp', { email });
      toast.success(translateCurrent(res.data.message));
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.detail
        ? `${err.response.data.message} (${err.response.data.detail})`
        : err.response?.data?.message || 'Unable to resend verification code';
      toast.error(translateCurrent(msg));
      throw err;
    }
  },

  login: async (data) => {
    try {
      const res = await api.post('/auth/login', data);
      if (res.data.otpRequired) {
        toast.success(translateCurrent('Verification code sent to your email.'));
        return res.data;
      }
      set({ authUser: res.data });
      get().connectSocket(res.data);
      toast.success(translateCurrent('Welcome back, {name}!', { name: res.data.fullName }));
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.detail
        ? `${err.response.data.message} (${err.response.data.detail})`
        : err.response?.data?.message || 'Login failed';
      toast.error(translateCurrent(msg));
      throw err;
    }
  },

  verifyLoginOtp: async (email, otp) => {
    try {
      const res = await api.post('/auth/login/verify-otp', { email, otp });
      set({ authUser: res.data });
      get().connectSocket(res.data);
      toast.success(translateCurrent('Welcome back, {name}!', { name: res.data.fullName }));
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.detail
        ? `${err.response.data.message} (${err.response.data.detail})`
        : err.response?.data?.message || 'Invalid or expired verification code';
      toast.error(translateCurrent(msg));
      throw err;
    }
  },

  resendLoginOtp: async (email) => {
    try {
      const res = await api.post('/auth/login/resend-otp', { email });
      toast.success(translateCurrent(res.data.message));
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.detail
        ? `${err.response.data.message} (${err.response.data.detail})`
        : err.response?.data?.message || 'Unable to resend verification code';
      toast.error(translateCurrent(msg));
      throw err;
    }
  },

  googleLogin: async (credential) => {
    try {
      const res = await api.post('/auth/google', { credential });
      set({ authUser: res.data });
      get().connectSocket(res.data);
      toast.success(translateCurrent('Welcome, {name}!', { name: res.data.fullName }));
    } catch (err) {
      toast.error(translateCurrent(err.response?.data?.message || 'Google login failed'));
      throw err;
    }
  },

  logout: async () => {
  try {
    await api.post('/auth/logout');
    toast.success(translateCurrent('Logged out'));
  } catch (err) {
    toast.error(translateCurrent(err.response?.data?.message || 'Logout failed'));
  } finally {
    get().disconnectSocket();
    set({ authUser: null });
  }
},

  updateProfile: async (data) => {
    try {
      const res = await api.put('/auth/update-profile', data);
      set((state) => ({ authUser: { ...state.authUser, profilePic: res.data.profilePic } }));
      toast.success(translateCurrent('Profile updated'));
    } catch (err) {
      toast.error(translateCurrent(err.response?.data?.message || 'Update failed'));
      throw err;
    }
  },

  updateBio: async (bio) => {
    try {
      const res = await api.put('/auth/update-bio', { bio });
      set((state) => ({ authUser: { ...state.authUser, bio: res.data.bio } }));
      toast.success(translateCurrent('About me updated'));
    } catch (err) {
      toast.error(translateCurrent(err.response?.data?.message || 'Unable to update About me'));
      throw err;
    }
  },

  updateName: async (fullName) => {
    try {
      const res = await api.put('/auth/update-name', { fullName });
      set((state) => ({ authUser: { ...state.authUser, fullName: res.data.fullName } }));
      toast.success(translateCurrent('Name updated'));
    } catch (err) {
      toast.error(translateCurrent(err.response?.data?.message || 'Name update failed'));
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
