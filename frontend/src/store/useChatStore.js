import { create } from 'zustand';
import api from '../lib/axios.js';
import toast from 'react-hot-toast';
import { useAuthStore } from './useAuthStore.js';
import { translateCurrent } from '../lib/i18n.js';

const toIdString = (val) => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (val._id) return String(val._id);
  if (typeof val.toString === 'function') return val.toString();
  return String(val);
};

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
  typingUsers: {},
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

  withdrawContactRequest: async (requestId) => {
    try {
      const response = await api.delete(`/messages/contacts/requests/${requestId}`);
      toast.success(translateCurrent(response.data.message));
      return response.data;
    } catch (err) {
      toast.error(translateCurrent(err.response?.data?.message || 'Failed to withdraw contact request'));
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

  restoreContact: async (userId) => {
    try {
      await api.post(`/messages/contacts/restore/${userId}`);
      await get().fetchUsers();
    } catch (err) {
      console.error('restoreContact error:', err);
    }
  },

  selectUser: (user) => {
    set({ selectedUser: user, messages: [] });
  },

  fetchMessages: async (userId) => {
    const targetId = toIdString(userId);
    set({ isLoadingMessages: true });
    try {
      const res = await api.get(`/messages/${targetId}`);
      const serverMessages = Array.isArray(res.data) ? res.data : [];
      set((state) => {
        // If selectedUser changed while request was in-flight, don't overwrite
        if (toIdString(state.selectedUser?._id) !== targetId) {
          return {};
        }
        // Preserve any messages already received via socket that are not yet in server response
        const serverIds = new Set(serverMessages.map((m) => m._id));
        const pendingSocketMessages = state.messages.filter(
          (m) => m._id && !serverIds.has(m._id) && !String(m._id).startsWith('temp-')
        );
        return {
          messages: [...serverMessages, ...pendingSocketMessages],
        };
      });
    } catch (err) {
      toast.error(translateCurrent(err.response?.data?.message || 'Failed to load messages'));
    } finally {
      set({ isLoadingMessages: false });
    }
  },

  markMessagesRead: async (userId) => {
    const targetId = toIdString(userId);
    try {
      await api.patch(`/messages/${targetId}/read`);
      get().clearUnreadCount(targetId);
    } catch (err) {
      // Background operation; avoid alarming user if already read
      console.warn('markMessagesRead error:', err.message);
    }
  },

  handleIncomingMessage: (message) => {
    if (!message || !message._id) return;
    const authUser = useAuthStore.getState().authUser;
    if (!authUser) return;

    const currentUserId = toIdString(authUser._id);
    const senderId = toIdString(message.senderId);
    const receiverId = toIdString(message.receiverId);
    const isIncoming = receiverId === currentUserId;
    const contactId = isIncoming ? senderId : receiverId;

    const { selectedUser, users } = get();
    const selectedUserId = toIdString(selectedUser?._id);

    // Conversation is open if the selected user is either party to the message
    const isConversationOpen = Boolean(
      selectedUserId && (
        selectedUserId === contactId ||
        selectedUserId === senderId ||
        selectedUserId === receiverId
      )
    );

    if (get()._typingTimeouts?.[contactId]) {
      clearTimeout(get()._typingTimeouts[contactId]);
    }

    set((state) => {
      const exists = state.messages.some((item) => item._id === message._id);

      // Instantly append to open conversation
      let updatedMessages = state.messages;
      if (isConversationOpen) {
        if (!exists) {
          updatedMessages = [...state.messages, message];
        } else {
          updatedMessages = state.messages.map((item) => item._id === message._id ? message : item);
        }
      }

      // Check if contact already exists in sidebar
      const userInList = state.users.some((user) => toIdString(user._id) === contactId);
      const updatedUsers = userInList
        ? sortByLatestMessage(state.users.map((user) => toIdString(user._id) === contactId
          ? {
              ...user,
              latestMessage: message,
              unreadCount: Math.max(0, (user.unreadCount || 0) + (isIncoming && !isConversationOpen ? 1 : 0)),
            }
          : user))
        : state.users;

      return {
        typingUsers: { ...state.typingUsers, [contactId]: false },
        messages: updatedMessages,
        users: updatedUsers,
      };
    });

    // If contact is not yet in sidebar, refresh user list immediately
    if (!users.some((u) => toIdString(u._id) === contactId)) {
      get().fetchUsers();
    }

    if (isIncoming && isConversationOpen) {
      get().markMessagesRead(contactId);
    } else if (isIncoming) {
      const contact = users.find((user) => toIdString(user._id) === contactId);
      toast(translateCurrent('New message from {name}', { name: contact?.fullName || translateCurrent('someone') }));
    }
  },

  clearUnreadCount: (userId) => {
    const id = toIdString(userId);
    set((state) => ({
      users: state.users.map((user) => toIdString(user._id) === id
        ? { ...user, unreadCount: 0 }
        : user),
    }));
  },

  handleMessagesRead: (senderId) => get().clearUnreadCount(senderId),

  deleteChat: async (userId) => {
    const targetId = toIdString(userId);
    try {
      const res = await api.delete(`/messages/clear-chat/${targetId}`);
      // Clear the open conversation and its sidebar preview immediately.
      set((state) => ({
        messages: toIdString(state.selectedUser?._id) === targetId ? [] : state.messages,
        users: state.users.map((user) => toIdString(user._id) === targetId
          ? { ...user, latestMessage: null, unreadCount: 0 }
          : user),
      }));
      // Re-fetch server truth so the preview cannot reappear from stale state.
      await get().fetchUsers();
      toast.success(translateCurrent(res.data.message));
      return res.data;
    } catch (err) {
      toast.error(translateCurrent(err.response?.data?.message || 'Failed to delete chat history'));
      throw err;
    }
  },

  sendMessage: async (receiverId, data) => {
    const authUser = useAuthStore.getState().authUser;
    const currentUserId = toIdString(authUser?._id);
    const targetId = toIdString(receiverId);

    // Optimistically render simple text messages with 0ms delay
    let tempId = null;
    const isSimpleText = Boolean(data.text && !data.image && !data.video && !data.audio && !data.document);
    if (isSimpleText && currentUserId) {
      tempId = `temp-${Date.now()}`;
      const tempMessage = {
        _id: tempId,
        senderId: currentUserId,
        receiverId: targetId,
        text: data.text,
        replyTo: data.replyTo ? get().messages.find((m) => m._id === data.replyTo) : undefined,
        createdAt: new Date().toISOString(),
        delivered: false,
        read: false,
        isOptimistic: true,
      };
      set((state) => ({
        messages: [...state.messages, tempMessage],
      }));
    }

    try {
      const res = await api.post(`/messages/send/${targetId}`, data, { timeout: 120000 });
      set((state) => {
        const confirmed = res.data;
        const messages = tempId
          ? state.messages.map((m) => (m._id === tempId ? confirmed : m))
          : state.messages.some((m) => m._id === confirmed._id)
          ? state.messages
          : [...state.messages, confirmed];

        const users = sortByLatestMessage(
          state.users.map((user) =>
            toIdString(user._id) === targetId
              ? { ...user, latestMessage: confirmed }
              : user
          )
        );

        return { messages, users };
      });
      return res.data;
    } catch (err) {
      if (tempId) {
        set((state) => ({
          messages: state.messages.filter((m) => m._id !== tempId),
        }));
      }
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

  toggleReaction: async (messageId, emoji) => {
    try {
      const res = await api.patch(`/messages/${messageId}/react`, { emoji });
      set((state) => ({
        messages: state.messages.map((message) =>
          message._id === messageId ? res.data : message
        ),
      }));
      return res.data;
    } catch (err) {
      toast.error(translateCurrent(err.response?.data?.message || 'Failed to update reaction'));
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
    if (get()._isSocketSubscribed && get()._subscribedSocketId === socket.id) {
      return;
    }

    // Unsubscribe cleanly from any previous socket instance
    get().unsubscribeFromMessages();

    const onNewMessage = (message) => get().handleIncomingMessage(message);

    const onMessageEdited = (message) => {
      const msgId = toIdString(message._id);
      const sId = toIdString(message.senderId);
      const rId = toIdString(message.receiverId);
      set((state) => ({
        messages: state.messages.map((item) => toIdString(item._id) === msgId ? message : item),
        users: state.users.map((user) => (toIdString(user._id) === sId || toIdString(user._id) === rId)
          ? { ...user, latestMessage: toIdString(user.latestMessage?._id) === msgId ? message : user.latestMessage }
          : user),
      }));
    };

    const onMessageDeleted = (message) => {
      const msgId = toIdString(message._id);
      const sId = toIdString(message.senderId);
      const rId = toIdString(message.receiverId);
      set((state) => ({
        messages: state.messages.map((item) => toIdString(item._id) === msgId ? message : item),
        users: state.users.map((user) => (toIdString(user._id) === sId || toIdString(user._id) === rId)
          ? { ...user, latestMessage: toIdString(user.latestMessage?._id) === msgId ? message : user.latestMessage }
          : user),
      }));
    };

    const onMessagePinned = (message) => {
      const msgId = toIdString(message._id);
      set((state) => ({
        messages: state.messages.map((item) => toIdString(item._id) === msgId ? message : item),
      }));
    };

    const onMessageReaction = (message) => {
      const msgId = toIdString(message._id);
      set((state) => ({
        messages: state.messages.map((item) => toIdString(item._id) === msgId ? message : item),
      }));
    };

    const onProfileUpdated = (profile) => {
      const pId = toIdString(profile._id);
      set((state) => ({
        users: state.users.map((user) => toIdString(user._id) === pId
          ? { ...user, profilePic: profile.profilePic }
          : user),
        selectedUser: toIdString(state.selectedUser?._id) === pId
          ? { ...state.selectedUser, profilePic: profile.profilePic }
          : state.selectedUser,
        messages: state.messages.map((message) => ({
          ...message,
          sender: message.sender && toIdString(message.sender._id || message.sender) === pId
            ? { ...message.sender, profilePic: profile.profilePic }
            : message.sender,
        })),
      }));
    };

    const onTypingStart = ({ senderId }) => {
      if (!senderId) return;
      const id = toIdString(senderId);
      if (get()._typingTimeouts?.[id]) {
        clearTimeout(get()._typingTimeouts[id]);
      }
      const timeout = setTimeout(() => {
        set((state) => ({
          typingUsers: { ...state.typingUsers, [id]: false },
        }));
      }, 3500);

      set((state) => ({
        typingUsers: { ...state.typingUsers, [id]: true },
        _typingTimeouts: { ...(state._typingTimeouts || {}), [id]: timeout },
      }));
    };

    const onTypingStop = ({ senderId }) => {
      if (!senderId) return;
      const id = toIdString(senderId);
      if (get()._typingTimeouts?.[id]) {
        clearTimeout(get()._typingTimeouts[id]);
      }
      set((state) => ({
        typingUsers: { ...state.typingUsers, [id]: false },
      }));
    };

    const onMessagesRead = ({ readerId, senderId }) => {
      const readerStr = toIdString(readerId);
      const senderStr = toIdString(senderId);
      set((state) => ({
        messages: state.messages.map((item) =>
          (toIdString(item.senderId) === senderStr && toIdString(item.receiverId) === readerStr)
            ? { ...item, read: true, delivered: true }
            : item
        ),
      }));
    };

    const onContactsUpdated = () => {
      get().fetchUsers();
      get().fetchContactRequests();
      get().fetchMessageRequests();
    };

    // Auto-resync when connection recovers from brief disconnect
    const onConnect = () => {
      const selected = get().selectedUser;
      if (selected?._id) {
        get().fetchMessages(selected._id);
      }
      get().fetchUsers();
      get().fetchContactRequests();
      get().fetchMessageRequests();
    };

    const onNotification = ({ type, name }) => {
      const messages = {
        contactRequest: 'New contact request from {name}',
        messageRequest: 'New message request from {name}',
        contactAccepted: '{name} accepted your contact request',
      };
      if (messages[type]) toast(translateCurrent(messages[type], { name }));
    };

    const listeners = {
      newMessage: onNewMessage,
      messageEdited: onMessageEdited,
      messageDeleted: onMessageDeleted,
      messagePinned: onMessagePinned,
      messageReaction: onMessageReaction,
      profileUpdated: onProfileUpdated,
      'typing:start': onTypingStart,
      'typing:stop': onTypingStop,
      messagesRead: onMessagesRead,
      contactsUpdated: onContactsUpdated,
      connect: onConnect,
      notification: onNotification,
    };

    for (const [event, fn] of Object.entries(listeners)) {
      socket.on(event, fn);
    }

    set({
      _isSocketSubscribed: true,
      _subscribedSocketId: socket.id,
      _socketListeners: listeners,
      _boundSocket: socket,
    });
  },

  sendTypingStart: (receiverId) => {
    const socket = useAuthStore.getState().socket;
    if (socket && receiverId) socket.emit('typing:start', { receiverId: toIdString(receiverId) });
  },

  sendTypingStop: (receiverId) => {
    const socket = useAuthStore.getState().socket;
    if (socket && receiverId) socket.emit('typing:stop', { receiverId: toIdString(receiverId) });
  },

  unsubscribeFromMessages: () => {
    const { _boundSocket, _socketListeners } = get();
    if (_boundSocket && _socketListeners) {
      for (const [event, fn] of Object.entries(_socketListeners)) {
        _boundSocket.off(event, fn);
      }
    }
    set({
      _isSocketSubscribed: false,
      _subscribedSocketId: null,
      _socketListeners: null,
      _boundSocket: null,
    });
  },
}));
