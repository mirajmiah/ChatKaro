import { create } from 'zustand';
import api from '../lib/axios.js';
import toast from 'react-hot-toast';
import { useAuthStore } from './useAuthStore.js';
import { translateCurrent } from '../lib/i18n.js';

const sortByLatestMessage = (users) => users.sort((first, second) => (
  new Date(second.latestMessage?.createdAt || 0).getTime()
  - new Date(first.latestMessage?.createdAt || 0).getTime()
));

export const useChatStore = create((set, get) => ({
  users: [],
  contactRequests: [],
  messageRequests: [],
  selectedUser: null,
  messages: [],
  isLoadingUsers: false,
  isLoadingMessages: false,

fetchUsers: async () => {
  set({ isLoadingUsers: true });
  try {
    const res = await api.get('/messages/users');

    const authUser = useAuthStore.getState().authUser;
    const currentUserId = String(authUser?._id || '');

      const users = Array.isArray(res.data)
      ? res.data.filter((user) => String(user._id) !== currentUserId)
      : [];
      sortByLatestMessage(users);

    set((state) => {
      const selectedStillMutual = users.some((user) => user._id === state.selectedUser?._id);
      return {
        users,
        selectedUser: selectedStillMutual ? state.selectedUser : null,
        messages: selectedStillMutual ? state.messages : [],
      };
    });
  } catch (err) {
    toast.error(translateCurrent(err.response?.data?.message || 'Failed to load users'));
  } finally {
    set({ isLoadingUsers: false });
  }
},

  searchContact: async (email) => {
    try {
      const res = await api.get('/messages/contacts/search', { params: { email } });
      return res.data.contact;
    } catch (err) {
      toast.error(translateCurrent(err.response?.data?.message || 'Failed to search for contact'));
      throw err;
    }
  },

  fetchContactRequests: async () => {
    try {
      const res = await api.get('/messages/contacts/requests');
      set({ contactRequests: Array.isArray(res.data) ? res.data : [] });
      return res.data;
    } catch (err) {
      toast.error(translateCurrent(err.response?.data?.message || 'Failed to load contact requests'));
    }
  },

  fetchMessageRequests: async () => {
    try {
      const res = await api.get('/messages/contacts/message-requests');
      set({ messageRequests: Array.isArray(res.data) ? res.data : [] });
      return res.data;
    } catch (err) {
      toast.error(translateCurrent(err.response?.data?.message || 'Failed to load message requests'));
    }
  },

  fetchMessageRequestMessages: async (senderId) => {
    try {
      const res = await api.get(`/messages/contacts/message-requests/${senderId}/messages`);
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      toast.error(translateCurrent(err.response?.data?.message || 'Failed to load requested messages'));
      throw err;
    }
  },

  sendContactRequest: async (email) => {
    try {
      const res = await api.post('/messages/contacts', { email });
      toast.success(translateCurrent(res.data.message));
      return res.data;
    } catch (err) {
      toast.error(translateCurrent(err.response?.data?.message || 'Failed to send contact request'));
      throw err;
    }
  },

  respondToContactRequest: async (requestId, accept) => {
    try {
      const response = accept
        ? await api.patch(`/messages/contacts/requests/${requestId}/accept`)
        : await api.delete(`/messages/contacts/requests/${requestId}`);
      set((state) => ({
        contactRequests: state.contactRequests.filter((request) => request._id !== requestId),
      }));
      if (accept) await get().fetchUsers();
      toast.success(translateCurrent(response.data.message));
      return response.data;
    } catch (err) {
      toast.error(translateCurrent(err.response?.data?.message || 'Failed to respond to contact request'));
      throw err;
    }
  },

  respondToMessageRequest: async (senderId, accept) => {
    try {
      const response = accept
        ? await api.patch(`/messages/contacts/message-requests/${senderId}`)
        : await api.delete(`/messages/contacts/message-requests/${senderId}`);
      set((state) => ({
        messageRequests: state.messageRequests.filter(
          (request) => String(request.sender._id) !== String(senderId)
        ),
      }));
      if (accept) await get().fetchUsers();
      toast.success(translateCurrent(response.data.message));
      return response.data;
    } catch (err) {
      toast.error(translateCurrent(err.response?.data?.message || 'Failed to respond to message request'));
      throw err;
    }
  },

  removeContact: async (userId) => {
    try {
      const res = await api.delete(`/messages/contacts/${userId}`);
      set((state) => ({
        users: state.users.filter((user) => user._id !== userId),
        selectedUser: state.selectedUser?._id === userId ? null : state.selectedUser,
        messages: state.selectedUser?._id === userId ? [] : state.messages,
      }));
      toast.success(translateCurrent(res.data.message));
    } catch (err) {
      toast.error(translateCurrent(err.response?.data?.message || 'Failed to remove contact'));
      throw err;
    }
  },

  selectUser: (user) => {
    set({ selectedUser: user, messages: [] });
  },

  fetchMessages: async (userId) => {
    set({ isLoadingMessages: true });
    try {
      const res = await api.get(`/messages/${userId}`);
      set({ messages: Array.isArray(res.data) ? res.data : [] });
    } catch (err) {
      toast.error(translateCurrent(err.response?.data?.message || 'Failed to load messages'));
    } finally {
      set({ isLoadingMessages: false });
    }
  },

  markMessagesRead: async (userId) => {
    try {
      await api.patch(`/messages/${userId}/read`);
      get().clearUnreadCount(userId);
    } catch (err) {
      toast.error(translateCurrent(err.response?.data?.message || 'Failed to mark messages as read'));
    }
  },

  handleIncomingMessage: (message) => {
    const authUser = useAuthStore.getState().authUser;
    if (!authUser) return;

    const currentUserId = String(authUser._id);
    const senderId = String(message.senderId);
    const receiverId = String(message.receiverId);
    const isIncoming = receiverId === currentUserId;
    const contactId = isIncoming ? senderId : receiverId;
    const { selectedUser, users } = get();
    const isConversationOpen = String(selectedUser?._id) === contactId;

    set((state) => {
      const exists = state.messages.some((item) => item._id === message._id);
      return {
        messages: isConversationOpen && !exists
          ? [...state.messages, message]
          : state.messages,
        users: sortByLatestMessage(state.users.map((user) => String(user._id) === contactId
          ? {
              ...user,
              latestMessage: message,
              unreadCount: Math.max(0, (user.unreadCount || 0) + (isIncoming && !isConversationOpen ? 1 : 0)),
            }
          : user)),
      };
    });

    if (isIncoming && isConversationOpen) {
      get().markMessagesRead(contactId);
    } else if (isIncoming) {
      const contact = users.find((user) => String(user._id) === contactId);
      toast(translateCurrent('New message from {name}', { name: contact?.fullName || translateCurrent('someone') }));
    }
  },

  clearUnreadCount: (userId) => {
    set((state) => ({
      users: state.users.map((user) => String(user._id) === String(userId)
        ? { ...user, unreadCount: 0 }
        : user),
    }));
  },

  handleMessagesRead: (senderId) => get().clearUnreadCount(senderId),

  deleteChat: async (userId) => {
    try {
      const res = await api.delete(`/messages/clear-chat/${userId}`);
      if (String(get().selectedUser?._id) === String(userId)) {
        set({ messages: [] });
      }
      toast.success(translateCurrent(res.data.message));
      return res.data;
    } catch (err) {
      toast.error(translateCurrent(err.response?.data?.message || 'Failed to delete chat history'));
      throw err;
    }
  },

  sendMessage: async (receiverId, data) => {
    try {
      const res = await api.post(`/messages/send/${receiverId}`, data, { timeout: 120000 });
      get().addMessage(res.data);
    } catch (err) {
      toast.error(translateCurrent(err.response?.data?.message || 'Failed to send message'));
      throw err;
    }
  },

  editMessage: async (messageId, text) => {
    try {
      const res = await api.put(`/messages/${messageId}`, { text });
      set((state) => ({
        messages: state.messages.map((message) =>
          message._id === messageId ? res.data : message
        ),
      }));
      return res.data;
    } catch (err) {
      toast.error(translateCurrent(err.response?.data?.message || 'Failed to edit message'));
      throw err;
    }
  },

  deleteMessage: async (messageId, scope = 'everyone') => {
    try {
      const res = await api.delete(`/messages/${messageId}?scope=${scope}`);
      set((state) => ({
        messages: scope === 'me'
          ? state.messages.filter((message) => message._id !== messageId)
          : state.messages.map((message) => message._id === messageId ? res.data : message),
      }));
      return res.data;
    } catch (err) {
      toast.error(translateCurrent(err.response?.data?.message || 'Failed to delete message'));
      throw err;
    }
  },

  toggleStarMessage: async (messageId, starred) => {
    try {
      const res = await api.patch(`/messages/${messageId}/star`, { starred });
      set((state) => ({
        messages: state.messages.map((message) =>
          message._id === messageId ? res.data : message
        ),
      }));
      return res.data;
    } catch (err) {
      toast.error(translateCurrent(err.response?.data?.message || 'Failed to update starred message'));
      throw err;
    }
  },

  togglePinMessage: async (messageId, pinned, durationDays) => {
    try {
      const res = await api.patch(`/messages/${messageId}/pin`, { pinned, durationDays });
      set((state) => ({
        messages: state.messages.map((message) =>
          message._id === messageId ? res.data : message
        ),
      }));
      return res.data;
    } catch (err) {
      toast.error(translateCurrent(err.response?.data?.message || 'Failed to update pinned message'));
      throw err;
    }
  },

  forwardMessage: async (messageId, receiverId) => {
    try {
      const res = await api.post(`/messages/${messageId}/forward`, { receiverId });
      if (String(get().selectedUser?._id) === String(receiverId)) {
        get().addMessage(res.data);
      }
      toast.success(translateCurrent('Message forwarded'));
      return res.data;
    } catch (err) {
      toast.error(translateCurrent(err.response?.data?.message || 'Failed to forward message'));
      throw err;
    }
  },

  addMessage: (message) => {
    set((state) => {
      const exists = state.messages.some((m) => m._id === message._id);
      if (exists) return {};
      return { messages: [...state.messages, message] };
    });
  },

  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    // Stable handlers let us remove only this store's listeners during cleanup.
    const onNewMessage = (message) => get().handleIncomingMessage(message);
    const onMessageEdited = (message) => {
      set((state) => ({
        messages: state.messages.map((item) => item._id === message._id ? message : item),
        users: state.users.map((user) => String(user._id) === String(message.senderId) || String(user._id) === String(message.receiverId)
          ? { ...user, latestMessage: user.latestMessage?._id === message._id ? message : user.latestMessage }
          : user),
      }));
    };
    const onMessageDeleted = (message) => {
      set((state) => ({
        messages: state.messages.map((item) => item._id === message._id ? message : item),
        users: state.users.map((user) => String(user._id) === String(message.senderId) || String(user._id) === String(message.receiverId)
          ? { ...user, latestMessage: user.latestMessage?._id === message._id ? message : user.latestMessage }
          : user),
      }));
    };
    const onMessagePinned = (message) => {
      set((state) => ({
        messages: state.messages.map((item) => item._id === message._id ? message : item),
      }));
    };
    const onProfileUpdated = (profile) => {
      set((state) => ({
        users: state.users.map((user) => String(user._id) === String(profile._id)
          ? { ...user, profilePic: profile.profilePic }
          : user),
        selectedUser: String(state.selectedUser?._id) === String(profile._id)
          ? { ...state.selectedUser, profilePic: profile.profilePic }
          : state.selectedUser,
        messages: state.messages.map((message) => ({
          ...message,
          sender: message.sender && String(message.sender._id || message.sender) === String(profile._id)
            ? { ...message.sender, profilePic: profile.profilePic }
            : message.sender,
        })),
      }));
    };

    socket.on('newMessage', onNewMessage);
    socket.on('messageEdited', onMessageEdited);
    socket.on('messageDeleted', onMessageDeleted);
    socket.on('messagePinned', onMessagePinned);
    socket.on('profileUpdated', onProfileUpdated);
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    socket.off('newMessage');
    socket.off('messageEdited');
    socket.off('messageDeleted');
    socket.off('messagePinned');
    socket.off('profileUpdated');
  },
}));
