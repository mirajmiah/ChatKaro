import { create } from 'zustand';
import api from '../lib/axios.js';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { translateCurrent } from '../lib/i18n.js';
import { firebaseAuth } from '../lib/firebase.js';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification, signInWithEmailAndPassword, signOut, reload } from 'firebase/auth';

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
      const credential = await createUserWithEmailAndPassword(firebaseAuth, data.email.trim(), data.password);
      await updateProfile(credential.user, { displayName: data.fullName.trim() });
      await sendEmailVerification(credential.user, {
        url: 'https://chatkaro-7cv0.onrender.com/login',
        handleCodeInApp: false,
      });
      toast.success(translateCurrent('Verification link sent. Check your inbox and spam folder.'));
      return { email: credential.user.email, verificationRequired: true };
    } catch (err) {
      const message = err.code === 'auth/email-already-in-use'
        ? 'This email already has an account. Try signing in or resending verification.'
        : err.code === 'auth/invalid-email'
          ? 'Enter a valid email address.'
          : err.code === 'auth/weak-password'
            ? 'Password must be at least 6 characters.'
            : err.message || 'Unable to create account';
      toast.error(translateCurrent(message));
      throw err;
    }
  },

  verifySignupOtp: async () => {
    throw new Error('Email verification now uses the link sent by Firebase. Please sign in after verifying.');
  },

  resendSignupOtp: async ({ email, password } = {}) => {
    try {
      let user = firebaseAuth.currentUser;
      if (!user && email && password) {
        const credential = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
        user = credential.user;
      }
      if (!user) throw new Error('Enter your email and password above, then try resending the verification email.');
      await reload(user);
      if (user.emailVerified) throw new Error('Your email is already verified. Please sign in.');
      await sendEmailVerification(user, {
        url: 'https://chatkaro-7cv0.onrender.com/login',
        handleCodeInApp: false,
      });
      toast.success(translateCurrent('A new verification link was sent.'));
      return { message: 'A new verification link was sent.' };
    } catch (err) {
      toast.error(translateCurrent(err.message || 'Unable to resend verification email'));
      throw err;
    }
  },

  login: async (data) => {
    try {
      // Do not fall back to the legacy password endpoint when Firebase rejects
      // credentials: that could bypass Firebase email-verification enforcement.
      const credential = await signInWithEmailAndPassword(
        firebaseAuth,
        data.email.trim(),
        data.password
      );
      await reload(credential.user);
      if (!credential.user.emailVerified) {
        await signOut(firebaseAuth);
        throw new Error('Please verify your email using the link we sent before signing in.');
      }
      const idToken = await credential.user.getIdToken(true);
      const res = await api.post('/auth/firebase-login', { idToken });
      set({ authUser: res.data });
      get().connectSocket(res.data);
      toast.success(translateCurrent('Welcome back, {name}!', { name: res.data.fullName }));
      return res.data;
    } catch (err) {
      toast.error(translateCurrent(err.response?.data?.message || err.message || 'Login failed'));
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
