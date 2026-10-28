import { create } from 'zustand';
import api from '../lib/axios.js';
import toast from 'react-hot-toast';
import { useAuthStore } from './useAuthStore.js';
import { translateCurrent } from '../lib/i18n.js';
import {
  saveOfflineMessage,
  getOfflineMessages,
  removeOfflineMessage,
} from '../lib/offlineQueue.js';

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

const dedupeMessages = (list) => {
  if (!Array.isArray(list)) return [];
  const seenIds = new Set();
  const result = [];
  for (const msg of list) {
    if (!msg) continue;
    const id = toIdString(msg._id);
    if (!id) {
      result.push(msg);
      continue;
    }
    if (!seenIds.has(id)) {
      seenIds.add(id);
      result.push(msg);
    }
  }
  return result;
};

export const useChatStore = create((set, get) => ({
  users: [],
  contactRequests: [],
  messageRequests: [],
  selectedUser: null,
  messages: [],
  typingUsers: {},
  isLoadingUsers: false,
  isLoadingMessages: false,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSyncingQueue: false,
  pendingQueue: [],
  _offlineQueueInitialized: false,

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

  initOfflineQueue: async () => {
    if (get()._offlineQueueInitialized) return;
    set({ _offlineQueueInitialized: true });

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        set({ isOnline: true });
        get().processOfflineQueue();
      });
      window.addEventListener('offline', () => {
        set({ isOnline: false });
      });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && navigator.onLine) {
          get().processOfflineQueue();
        }
      });
      setInterval(() => {
        if (navigator.onLine && (get().pendingQueue?.length > 0 || !get().isOnline)) {
          if (!get().isOnline) set({ isOnline: true });
          get().processOfflineQueue();
        }
      }, 12000);
    }

    try {
      const storedQueue = await getOfflineMessages();
      if (Array.isArray(storedQueue) && storedQueue.length > 0) {
        set({ pendingQueue: storedQueue });
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          get().processOfflineQueue();
        }
      }
    } catch (err) {
      console.warn('initOfflineQueue error:', err?.message);
    }
  },

  processOfflineQueue: async () => {
    if (get().isSyncingQueue) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    set({ isSyncingQueue: true });
    try {
      const queue = await getOfflineMessages();
      if (!queue || queue.length === 0) {
        set({ isSyncingQueue: false, pendingQueue: [] });
        return;
      }

      set({ pendingQueue: queue });

      for (const item of queue) {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          break;
        }

        try {
          const res = await api.post(`/messages/send/${item.receiverId}`, item.data, { timeout: 120000 });
          const confirmed = res.data;
          const confirmedId = toIdString(confirmed._id);

          await removeOfflineMessage(item.tempId);

          set((state) => {
            const alreadyExists = state.messages.some(
              (m) => toIdString(m._id) === confirmedId
            );

            let messages;
            if (alreadyExists) {
              messages = state.messages.filter((m) => m._id !== item.tempId && m.tempId !== item.tempId);
            } else {
              messages = state.messages.map((m) =>
                (m._id === item.tempId || m.tempId === item.tempId) ? confirmed : m
              );
            }

            messages = dedupeMessages(messages);

            const users = sortByLatestMessage(
              state.users.map((user) =>
                toIdString(user._id) === toIdString(item.receiverId)
                  ? { ...user, latestMessage: confirmed }
                  : user
              )
            );

            return {
              messages,
              users,
              pendingQueue: state.pendingQueue.filter((p) => p.tempId !== item.tempId),
            };
          });
        } catch (err) {
          const isNetworkError =
            !err.response ||
            err.code === 'ERR_NETWORK' ||
            err.code === 'ECONNABORTED' ||
            (typeof navigator !== 'undefined' && !navigator.onLine);

          if (isNetworkError) {
            // Pause sync until network returns
            break;
          } else {
            console.error('Offline message rejected by server:', err.response?.data?.message || err.message);
            await removeOfflineMessage(item.tempId);
            set((state) => ({
              messages: state.messages.filter((m) => m._id !== item.tempId && m.tempId !== item.tempId),
              pendingQueue: state.pendingQueue.filter((p) => p.tempId !== item.tempId),
            }));
            toast.error(translateCurrent(err.response?.data?.message || 'Failed to send message'));
          }
        }
      }
    } finally {
      set({ isSyncingQueue: false });
    }
  },

  selectUser: (user) => {
    const targetId = toIdString(user?._id);
    const authUser = useAuthStore.getState().authUser;
    const currentUserId = toIdString(authUser?._id);
    const pendingForUser = (get().pendingQueue || [])
      .filter((p) => toIdString(p.receiverId) === targetId)
      .map((p) => ({
        _id: p.tempId,
        tempId: p.tempId,
        senderId: currentUserId,
        receiverId: targetId,
        text: p.data?.text,
        image: p.data?.image,
        video: p.data?.video,
        audio: p.data?.audio,
        audioDuration: p.data?.audioDuration,
        document: p.data?.document,
        documentName: p.data?.documentName,
        createdAt: p.createdAt || new Date().toISOString(),
        delivered: false,
        read: false,
        isPending: true,
        status: 'pending',
      }));

    set({ selectedUser: user, messages: pendingForUser });
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
        const serverIds = new Set(serverMessages.map((m) => toIdString(m._id)));
        // Preserve any pending messages (offline queue) waiting to be sent
        const pendingMessages = state.messages.filter(
          (m) => m._id && !serverIds.has(toIdString(m._id)) && (m.isPending || m.status === 'pending' || String(m._id).startsWith('pending-') || String(m._id).startsWith('temp-'))
        );
        // Preserve any incoming socket messages not yet in server snapshot
        const pendingSocketMessages = state.messages.filter(
          (m) => m._id && !serverIds.has(toIdString(m._id)) && !m.isPending && !String(m._id).startsWith('pending-') && !String(m._id).startsWith('temp-')
        );
        return {
          messages: dedupeMessages([...serverMessages, ...pendingSocketMessages, ...pendingMessages]),
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
      const msgId = toIdString(message._id);
      const exists = state.messages.some((item) => toIdString(item._id) === msgId);

      // Instantly append to open conversation
      let updatedMessages = state.messages;
      if (isConversationOpen) {
        // If message is from current user, check if we have a matching optimistic message to replace
        const tempIndex = !exists && !isIncoming
          ? state.messages.findIndex(
              (m) =>
                (m.isOptimistic || m.isPending || String(m._id).startsWith('pending-') || String(m._id).startsWith('temp-')) &&
                toIdString(m.senderId) === currentUserId &&
                toIdString(m.receiverId) === receiverId &&
                ((message.text && m.text === message.text) ||
                 (message.image && m.image) ||
                 (message.video && m.video) ||
                 (message.audio && m.audio) ||
                 (message.document && m.document))
            )
          : -1;

        if (tempIndex !== -1) {
          const matchedTempId = state.messages[tempIndex]?.tempId || state.messages[tempIndex]?._id;
          if (matchedTempId) removeOfflineMessage(matchedTempId);
          // Replace optimistic message in place with server confirmed socket message
          updatedMessages = state.messages.map((m, idx) => (idx === tempIndex ? message : m));
        } else if (!exists) {
          updatedMessages = [...state.messages, message];
        } else {
          updatedMessages = state.messages.map((item) =>
            toIdString(item._id) === msgId ? message : item
          );
        }

        updatedMessages = dedupeMessages(updatedMessages);
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

    const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const tempMessage = {
      _id: tempId,
      tempId,
      senderId: currentUserId,
      receiverId: targetId,
      text: data.text,
      image: data.image,
      video: data.video,
      audio: data.audio,
      audioDuration: data.audioDuration,
      document: data.document,
      documentName: data.documentName,
      replyTo: data.replyTo ? get().messages.find((m) => m._id === data.replyTo) : undefined,
      createdAt: new Date().toISOString(),
      delivered: false,
      read: false,
      isPending: true,
      isOptimistic: true,
      status: 'pending',
    };

    // 1. Instantly display in chat and update sidebar latest message
    set((state) => ({
      messages: [...state.messages, tempMessage],
      users: sortByLatestMessage(
        state.users.map((user) =>
          toIdString(user._id) === targetId
            ? { ...user, latestMessage: tempMessage }
            : user
        )
      ),
      pendingQueue: [...state.pendingQueue, { tempId, receiverId: targetId, data, createdAt: tempMessage.createdAt }],
    }));

    // 2. Persist to offline IndexedDB queue
    await saveOfflineMessage({
      tempId,
      receiverId: targetId,
      data,
      createdAt: tempMessage.createdAt,
    });

    // 3. If offline, leave message in chat with clock icon 🕒 - will auto-send when back online!
    const isCurrentlyOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (!isCurrentlyOnline) {
      return tempMessage;
    }

    // 4. If online, attempt to deliver immediately
    try {
      const res = await api.post(`/messages/send/${targetId}`, data, { timeout: 120000 });
      const confirmed = res.data;
      const confirmedId = toIdString(confirmed._id);

      await removeOfflineMessage(tempId);

      set((state) => {
        const alreadyExists = state.messages.some(
          (m) => toIdString(m._id) === confirmedId
        );

        let messages;
        if (alreadyExists) {
          messages = state.messages.filter((m) => m._id !== tempId && m.tempId !== tempId);
        } else {
          messages = state.messages.map((m) =>
            (m._id === tempId || m.tempId === tempId) ? confirmed : m
          );
        }

        messages = dedupeMessages(messages);

        const users = sortByLatestMessage(
          state.users.map((user) =>
            toIdString(user._id) === targetId
              ? { ...user, latestMessage: confirmed }
              : user
          )
        );

        return {
          messages,
          users,
          pendingQueue: state.pendingQueue.filter((p) => p.tempId !== tempId),
        };
      });
      return confirmed;
    } catch (err) {
      const isNetworkError =
        !err.response ||
        err.code === 'ERR_NETWORK' ||
        err.code === 'ECONNABORTED' ||
        (typeof navigator !== 'undefined' && !navigator.onLine);

      if (isNetworkError) {
        // Keep message in chat with clock icon 🕒! Preserved in offline queue for auto-sync.
        console.warn('Network issue during send. Message preserved in offline queue.');
        return tempMessage;
      }

      // Permanent validation or authorization error
      await removeOfflineMessage(tempId);
      set((state) => ({
        messages: state.messages.filter((m) => m._id !== tempId && m.tempId !== tempId),
        pendingQueue: state.pendingQueue.filter((p) => p.tempId !== tempId),
      }));
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
    if (String(messageId).startsWith('pending-') || String(messageId).startsWith('temp-')) {
      await removeOfflineMessage(messageId);
      set((state) => ({
        messages: state.messages.filter((message) => message._id !== messageId && message.tempId !== messageId),
        pendingQueue: state.pendingQueue.filter((p) => p.tempId !== messageId),
      }));
      toast.success(translateCurrent('Message deleted'));
      return { success: true };
    }
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
    if (!message || !message._id) return;
    set((state) => {
      const msgId = toIdString(message._id);
      const exists = state.messages.some((m) => toIdString(m._id) === msgId);
      if (exists) return {};
      return { messages: dedupeMessages([...state.messages, message]) };
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
      get().processOfflineQueue();
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

    const onUserOffline = ({ userId, lastSeen }) => {
      const uId = toIdString(userId);
      set((state) => ({
        users: state.users.map((user) =>
          toIdString(user._id) === uId ? { ...user, lastSeen } : user
        ),
        selectedUser:
          toIdString(state.selectedUser?._id) === uId
            ? { ...state.selectedUser, lastSeen }
            : state.selectedUser,
      }));
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
      userOffline: onUserOffline,
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
