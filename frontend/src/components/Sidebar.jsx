import { useEffect, useRef, useState } from 'react';
import {
  Check,
  Clock,
  Compass,
  MessageSquare,
  MoreVertical,
  Search,
  Trash2,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
  AtSign,
  Send,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useChatStore } from '../store/useChatStore.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { formatLastSeen } from '../lib/utils.js';
import { useTranslation } from '../lib/i18n.js';
import DocumentLink from './DocumentLink.jsx';
import Avatar from './Avatar.jsx';

function UserSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-3 animate-pulse">
      <div className="w-11 h-11 rounded-full bg-base-300 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-base-300 rounded w-3/4" />
        <div className="h-2 bg-base-300 rounded w-1/2" />
      </div>
    </div>
  );
}

export default function Sidebar() {
  const { language, t } = useTranslation();
  const {
    users,
    typingUsers,
    contactRequests,
    sentRequests,
    connections,
    userSearchResults,
    isSearchingUsers,
    isLoadingRequests,
    isLoadingConnections,
    messageRequests,
    selectedUser,
    selectUser,
    fetchUsers,
    fetchContactRequests,
    fetchSentContactRequests,
    fetchConnections,
    fetchMessageRequests,
    fetchMessageRequestMessages,
    searchUsers,
    clearUserSearch,
    sendConnectionRequest,
    cancelConnectionRequest,
    respondToContactRequest,
    respondToMessageRequest,
    deleteChat,
    removeContact,
    restoreContact,
    isLoadingUsers,
  } = useChatStore();
  const { authUser, onlineUsers } = useAuthStore();

  const [activeTab, setActiveTab] = useState('chats'); // 'chats' | 'discover' | 'requests'
  const [requestsSubTab, setRequestsSubTab] = useState('received'); // 'received' | 'sent' | 'connections'
  const [searchQuery, setSearchQuery] = useState('');
  const searchTimeoutRef = useRef(null);

  const [onlineOnly, setOnlineOnly] = useState(false);
  const [openChatMenu, setOpenChatMenu] = useState(null);
  const [viewingMessageRequest, setViewingMessageRequest] = useState(null);
  const [messageRequestMessages, setMessageRequestMessages] = useState([]);
  const [isLoadingRequestMessages, setIsLoadingRequestMessages] = useState(false);
  const chatMenuRef = useRef(null);

  useEffect(() => {
    fetchUsers();
    fetchContactRequests();
    fetchSentContactRequests();
    fetchConnections();
    fetchMessageRequests();
  }, [fetchUsers, fetchContactRequests, fetchSentContactRequests, fetchConnections, fetchMessageRequests]);

  useEffect(() => {
    if (!openChatMenu) return undefined;
    const closeMenu = (event) => {
      if (!chatMenuRef.current?.contains(event.target)) setOpenChatMenu(null);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpenChatMenu(null);
    };
    document.addEventListener('pointerdown', closeMenu);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeMenu);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [openChatMenu]);

  const handleSelectUser = (user) => {
    setOpenChatMenu(null);
    selectUser(user);
    setActiveTab('chats');
  };

  const handleSearchChange = (event) => {
    const query = event.target.value;
    setSearchQuery(query);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query.trim()) {
      clearUserSearch();
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchUsers(query.trim());
    }, 300);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    clearUserSearch();
  };

  const handleConnect = async (targetUser) => {
    try {
      await sendConnectionRequest({ targetUserId: targetUser._id });
    } catch {
      // Store handles toast
    }
  };

  const handleCancelRequest = async (requestId, targetUserId) => {
    try {
      await cancelConnectionRequest(requestId, targetUserId);
    } catch {
      // Store handles toast
    }
  };

  const handleRespondToContact = async (requestOrId, accept, senderId) => {
    try {
      const id = typeof requestOrId === 'object' ? requestOrId._id : requestOrId;
      const sId = senderId || (typeof requestOrId === 'object' ? requestOrId.sender?._id : null);
      await respondToContactRequest(id, accept, sId);
    } catch {
      // Store handles toast
    }
  };

  const handleClearChat = async (user) => {
    if (!window.confirm(t('Clear chat with {name}? This clears messages only for you. They will keep their messages.', { name: user.fullName }))) return;
    try {
      await deleteChat(user._id);
      setOpenChatMenu(null);
    } catch {
      // Store handles toast
    }
  };

  const handleRemoveContact = async (user) => {
    if (!window.confirm(t('Remove {name} from your contacts? This clears your chat only; they keep their messages. Their next messages will arrive as a request that you can accept or decline.', { name: user.fullName }))) return;
    try {
      await removeContact(user._id);
      setOpenChatMenu(null);
    } catch {
      // Store handles toast
    }
  };

  const handleRespondToMessageRequest = async (request, accept) => {
    try {
      await respondToMessageRequest(request.sender._id, accept);
      setViewingMessageRequest(null);
      setMessageRequestMessages([]);
    } catch {
      // Store handles toast
    }
  };

  const handleViewMessageRequest = async (request) => {
    setViewingMessageRequest(request);
    setMessageRequestMessages([]);
    setIsLoadingRequestMessages(true);
    try {
      const messages = await fetchMessageRequestMessages(request.sender._id);
      setMessageRequestMessages(messages);
    } catch {
      setViewingMessageRequest(null);
    } finally {
      setIsLoadingRequestMessages(false);
    }
  };

  const onlineContactCount = users.filter((user) => (
    String(user._id) !== String(authUser?._id)
    && onlineUsers.includes(String(user._id))
  )).length;

  const visibleUsers = onlineOnly
    ? users.filter((user) => onlineUsers.includes(String(user._id)))
    : users;

  const totalUnreadChats = users.reduce((sum, u) => sum + (u.unreadCount || 0), 0);
  const totalPendingReceived = contactRequests.length;

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-base-200">
      {/* Top Header & Tab Navigation */}
      <div className="px-3 pt-3 pb-2.5 sm:px-4 sm:pt-4 border-b border-base-300 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={19} className="text-primary" />
            <h2 className="font-bold text-base sm:text-lg">
              {activeTab === 'chats' ? t('Chats') : activeTab === 'discover' ? t('Discover') : t('Requests')}
            </h2>
          </div>
          {activeTab === 'chats' && visibleUsers.length > 0 && (
            <span className="badge badge-primary badge-sm">{visibleUsers.length}</span>
          )}
        </div>

        {/* 3 Navigation Tabs */}
        <div className="grid grid-cols-3 p-1 bg-base-300/60 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('chats')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'chats'
                ? 'bg-base-100 text-primary shadow-sm'
                : 'text-base-content/70 hover:text-base-content hover:bg-base-100/40'
            }`}
          >
            <MessageSquare size={14} />
            <span>{t('Chats')}</span>
            {totalUnreadChats > 0 && (
              <span className="badge badge-primary badge-xs font-bold">{totalUnreadChats}</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('discover')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'discover'
                ? 'bg-base-100 text-primary shadow-sm'
                : 'text-base-content/70 hover:text-base-content hover:bg-base-100/40'
            }`}
          >
            <Compass size={14} />
            <span>{t('Discover')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('requests');
              fetchContactRequests();
              fetchSentContactRequests();
              fetchConnections();
            }}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'requests'
                ? 'bg-base-100 text-primary shadow-sm'
                : 'text-base-content/70 hover:text-base-content hover:bg-base-100/40'
            }`}
          >
            <UserPlus size={14} />
            <span>{t('Requests')}</span>
            {totalPendingReceived > 0 && (
              <span className="badge badge-error badge-xs font-bold text-white">
                {totalPendingReceived}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: CHATS */}
      {activeTab === 'chats' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Online filter */}
          <div className="px-3 py-2 border-b border-base-300 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={onlineOnly}
                onChange={(e) => setOnlineOnly(e.target.checked)}
                className="toggle toggle-primary toggle-xs"
              />
              <span className="text-xs text-base-content/70 group-hover:text-base-content transition-colors">
                {t('Online only')}
              </span>
            </label>
            {onlineOnly && (
              <span className="badge badge-success badge-outline badge-xs">
                {t('{count} online', { count: onlineContactCount })}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin py-1">
            {/* Message requests section */}
            {messageRequests.length > 0 && (
              <section className="mb-2">
                <h3 className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-base-content/50">
                  {t('Message requests')} <span className="badge badge-warning badge-xs">{messageRequests.length}</span>
                </h3>
                {messageRequests.map((request) => {
                  const isTyping = Boolean(typingUsers?.[String(request.sender._id)]);
                  const message = request.latestMessage;
                  const preview = message.text
                    || message.documentName
                    || (message.image ? t('Photo') : message.video ? t('Video') : message.audio ? `🎤 ${t('Voice message')}` : t('Attachment'));
                  return (
                    <div key={request.sender._id} className="flex items-center gap-2 px-3 py-2 hover:bg-base-300 transition-colors">
                      <Avatar src={request.sender.profilePic} name={request.sender.fullName} size="h-10 w-10" />
                      <button
                        type="button"
                        onClick={() => handleViewMessageRequest(request)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-sm font-semibold">{request.sender.fullName}</p>
                        {isTyping ? (
                          <p className="flex items-center gap-1.5 truncate text-xs font-medium text-primary animate-pulse">
                            <span>{t('typing')}</span>
                          </p>
                        ) : (
                          <p className="truncate text-xs text-base-content/60">{preview}</p>
                        )}
                        <p className="text-xs text-warning">
                          {t('{count} message(s) · View before accepting', { count: request.messageCount })}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRespondToMessageRequest(request, true)}
                        className="btn btn-success btn-xs btn-square"
                        title={t('Accept')}
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRespondToMessageRequest(request, false)}
                        className="btn btn-ghost btn-xs btn-square text-error"
                        title={t('Decline')}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </section>
            )}

            {isLoadingUsers ? (
              <>
                <UserSkeleton />
                <UserSkeleton />
                <UserSkeleton />
              </>
            ) : visibleUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-base-content/40 p-6 text-center">
                <Users size={36} strokeWidth={1.2} />
                <p className="text-sm font-medium">
                  {t(onlineOnly ? 'No users online right now' : 'No contacts found')}
                </p>
                <p className="text-xs max-w-xs text-base-content/50">
                  {t('Switch to the Discover tab to search for people by @username and connect with them.')}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('discover')}
                  className="btn btn-primary btn-sm mt-1 gap-1.5"
                >
                  <Compass size={15} />
                  {t('Discover People')}
                </button>
              </div>
            ) : (
              visibleUsers.map((user) => {
                const isOnline = onlineUsers.includes(user._id);
                const isSelected = selectedUser?._id === user._id;
                const isUserTyping = Boolean(typingUsers?.[String(user._id)]);
                const latestMessage = user.latestMessage;
                const messagePreview = latestMessage && (
                  latestMessage.text
                  || latestMessage.documentName
                  || (latestMessage.image ? t('Photo') : latestMessage.video ? t('Video') : latestMessage.audio ? `🎤 ${t('Voice message')}` : t('Attachment'))
                );
                const messageTime = latestMessage?.createdAt
                  ? new Date(latestMessage.createdAt).toLocaleTimeString(
                      language === 'bn' ? 'bn-BD' : language === 'hi' ? 'hi-IN' : 'en-US',
                      { hour: 'numeric', minute: '2-digit' }
                    )
                  : null;
                const messagePrefix = latestMessage
                  && String(latestMessage.senderId) === String(authUser?._id)
                  ? `${t('You')}: `
                  : '';

                return (
                  <div
                    key={user._id}
                    ref={openChatMenu === user._id ? chatMenuRef : null}
                    className={`
                      relative min-h-16 w-full flex items-center gap-2 px-3 py-2.5 sm:py-3
                      hover:bg-base-300 transition-colors duration-100
                      ${isSelected ? 'bg-base-300 border-l-2 border-primary' : 'border-l-2 border-transparent'}
                    `}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectUser(user)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <div className="relative shrink-0">
                        <Avatar
                          src={user.profilePic}
                          name={user.fullName}
                          size="w-11 h-11"
                        />
                        {isOnline && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-success border-2 border-base-200" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="font-semibold truncate text-sm">{user.fullName}</p>
                          {messageTime ? (
                            <span className="text-xs text-base-content/50 shrink-0">{messageTime}</span>
                          ) : !isOnline && !user.unreadCount && user.lastSeen ? (
                            <span className="text-xs text-base-content/40 shrink-0">
                              {formatLastSeen(user.lastSeen, language)}
                            </span>
                          ) : null}
                        </div>
                        {user.username && (
                          <p className="text-[11px] text-primary/80 font-medium truncate -mt-0.5">
                            @{user.username}
                          </p>
                        )}
                        <div className="mt-0.5 flex min-w-0 items-center justify-between gap-2">
                          {isUserTyping ? (
                            <p className="flex items-center gap-1.5 truncate text-xs font-medium text-primary animate-pulse">
                              <span>{t('typing')}</span>
                              <span className="inline-flex items-center gap-0.5">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                              </span>
                            </p>
                          ) : (
                            <p className={`truncate text-xs flex items-center gap-1 ${latestMessage ? 'text-base-content/60' : isOnline ? 'text-success' : 'text-base-content/40'}`}>
                              {latestMessage?.isPending && <Clock size={11} className="opacity-70 shrink-0" />}
                              <span className="truncate">{latestMessage ? `${messagePrefix}${messagePreview}` : t(isOnline ? 'Online' : 'Offline')}</span>
                            </p>
                          )}
                          {user.unreadCount > 0 && (
                            <span className="badge badge-primary badge-sm min-w-5 shrink-0">
                              {user.unreadCount > 99 ? '99+' : user.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpenChatMenu((openId) => openId === user._id ? null : user._id);
                      }}
                      className="btn btn-ghost btn-xs btn-circle text-base-content/50 hover:text-base-content"
                      aria-label={t('Open chat options for {name}', { name: user.fullName })}
                      title={t('Chat options')}
                    >
                      <MoreVertical size={17} />
                    </button>
                    {openChatMenu === user._id && (
                      <div className="absolute right-3 top-12 z-30 w-44 rounded-lg border border-base-300 bg-base-100 p-1 shadow-xl">
                        <button
                          type="button"
                          onClick={() => handleClearChat(user)}
                          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-error hover:bg-error/10"
                        >
                          <Trash2 size={16} />
                          {t('Clear chat')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveContact(user)}
                          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-base-200"
                        >
                          <UserMinus size={16} />
                          {t('Remove contact')}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DISCOVER (INSTAGRAM-STYLE USERNAME SEARCH & DISCOVERY) */}
      {activeTab === 'discover' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Search bar */}
          <div className="p-3 border-b border-base-300 bg-base-100/50">
            <div className="relative flex items-center">
              <span className="absolute left-3 text-base-content/40 select-none">
                <Search size={16} />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder={t('Search by @username or name...')}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck="false"
                className="input input-bordered input-sm w-full pl-9 pr-8 text-sm focus:border-primary"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2 text-base-content/40 hover:text-base-content p-1"
                >
                  <X size={15} />
                </button>
              )}
            </div>
            <p className="mt-1.5 px-0.5 text-[11px] text-base-content/50">
              {t('Search people by unique @username, full name, or email')}
            </p>
          </div>

          {/* Results list */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1.5">
            {isSearchingUsers ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-base-content/50">
                <span className="loading loading-spinner loading-md text-primary" />
                <p className="text-xs">{t('Searching users…')}</p>
              </div>
            ) : !searchQuery.trim() ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-base-content/50">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
                  <Compass size={24} />
                </div>
                <h3 className="font-semibold text-sm text-base-content">{t('Discover People')}</h3>
                <p className="text-xs mt-1 max-w-xs text-base-content/60">
                  {t('Type an Instagram-style username (e.g. miraj, @miraj123) to discover friends and connect.')}
                </p>
              </div>
            ) : userSearchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-base-content/50">
                <Users size={32} className="opacity-40 mb-2" />
                <p className="text-sm font-medium text-base-content">{t('No users found')}</p>
                <p className="text-xs mt-1 text-base-content/60">
                  {t('No registered users matching “{query}”', { query: searchQuery })}
                </p>
              </div>
            ) : (
              userSearchResults.map((user) => {
                const isOnline = onlineUsers.includes(user._id);
                return (
                  <div
                    key={user._id}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-base-100 border border-base-300 hover:border-primary/40 transition-all shadow-sm"
                  >
                    <div className="relative shrink-0">
                      <Avatar src={user.profilePic} name={user.fullName} size="w-11 h-11" />
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-success border-2 border-base-100" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">{user.fullName}</p>
                      <p className="text-xs text-primary font-medium truncate">
                        {user.username ? `@${user.username}` : ''}
                      </p>
                      {user.bio && (
                        <p className="text-[11px] text-base-content/60 truncate mt-0.5">{user.bio}</p>
                      )}
                    </div>

                    {/* Relationship Action Button */}
                    <div className="shrink-0 flex items-center gap-1">
                      {user.relationship === 'connected' ? (
                        <div className="flex items-center gap-1.5">
                          <span className="badge badge-success badge-sm gap-1 hidden sm:inline-flex">
                            <Check size={11} /> {t('Connected')}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSelectUser(user)}
                            className="btn btn-primary btn-xs gap-1"
                          >
                            <MessageSquare size={13} />
                            {t('Message')}
                          </button>
                        </div>
                      ) : user.relationship === 'request_sent' ? (
                        <button
                          type="button"
                          onClick={() => handleCancelRequest(user.requestId, user._id)}
                          className="btn btn-outline btn-warning btn-xs gap-1"
                          title={t('Cancel request')}
                        >
                          <Clock size={12} />
                          {t('Request Sent')}
                        </button>
                      ) : user.relationship === 'request_received' ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleRespondToContact(user.requestId, true, user._id)}
                            className="btn btn-success btn-xs btn-square"
                            title={t('Accept')}
                          >
                            <Check size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRespondToContact(user.requestId, false, user._id)}
                            className="btn btn-ghost btn-xs btn-square text-error"
                            title={t('Decline')}
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleConnect(user)}
                          className="btn btn-primary btn-xs gap-1"
                        >
                          <UserPlus size={13} />
                          {t('Connect')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: REQUESTS (RECEIVED, SENT, CONNECTIONS) */}
      {activeTab === 'requests' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Sub-tabs */}
          <div className="grid grid-cols-3 p-1.5 border-b border-base-300 bg-base-100 gap-1 text-center">
            <button
              type="button"
              onClick={() => setRequestsSubTab('received')}
              className={`py-1.5 px-1 rounded-lg text-xs font-semibold transition ${
                requestsSubTab === 'received'
                  ? 'bg-primary text-primary-content shadow-sm'
                  : 'text-base-content/70 hover:bg-base-200'
              }`}
            >
              {t('Received')} ({contactRequests.length})
            </button>
            <button
              type="button"
              onClick={() => setRequestsSubTab('sent')}
              className={`py-1.5 px-1 rounded-lg text-xs font-semibold transition ${
                requestsSubTab === 'sent'
                  ? 'bg-primary text-primary-content shadow-sm'
                  : 'text-base-content/70 hover:bg-base-200'
              }`}
            >
              {t('Sent')} ({sentRequests.length})
            </button>
            <button
              type="button"
              onClick={() => setRequestsSubTab('connections')}
              className={`py-1.5 px-1 rounded-lg text-xs font-semibold transition ${
                requestsSubTab === 'connections'
                  ? 'bg-primary text-primary-content shadow-sm'
                  : 'text-base-content/70 hover:bg-base-200'
              }`}
            >
              {t('Connections')} ({connections.length})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-2">
            {/* SUBTAB 1: RECEIVED REQUESTS */}
            {requestsSubTab === 'received' && (
              contactRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-base-content/50">
                  <UserPlus size={32} className="opacity-40 mb-2" />
                  <p className="text-sm font-medium text-base-content">{t('No received requests')}</p>
                  <p className="text-xs mt-1 text-base-content/60">
                    {t('When people send you a connection request, they will appear here.')}
                  </p>
                </div>
              ) : (
                contactRequests.map((request) => (
                  request.sender ? (
                    <div
                      key={request._id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-base-100 border border-base-300 shadow-sm"
                    >
                      <Avatar src={request.sender.profilePic} name={request.sender.fullName} size="w-11 h-11" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate">{request.sender.fullName}</p>
                        <p className="text-xs text-primary font-medium truncate">
                          {request.sender.username ? `@${request.sender.username}` : ''}
                        </p>
                        {request.sender.bio && (
                          <p className="text-[11px] text-base-content/60 truncate mt-0.5">{request.sender.bio}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRespondToContact(request._id, true, request.sender._id)}
                          className="btn btn-success btn-sm btn-square"
                          title={t('Accept')}
                        >
                          <Check size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRespondToContact(request._id, false, request.sender._id)}
                          className="btn btn-ghost btn-sm btn-square text-error"
                          title={t('Decline')}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ) : null
                ))
              )
            )}

            {/* SUBTAB 2: SENT REQUESTS */}
            {requestsSubTab === 'sent' && (
              sentRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-base-content/50">
                  <Send size={32} className="opacity-40 mb-2" />
                  <p className="text-sm font-medium text-base-content">{t('No pending sent requests')}</p>
                  <p className="text-xs mt-1 text-base-content/60">
                    {t('Connection requests you send will appear here until accepted or declined.')}
                  </p>
                </div>
              ) : (
                sentRequests.map((request) => (
                  request.recipient ? (
                    <div
                      key={request._id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-base-100 border border-base-300 shadow-sm"
                    >
                      <Avatar src={request.recipient.profilePic} name={request.recipient.fullName} size="w-11 h-11" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate">{request.recipient.fullName}</p>
                        <p className="text-xs text-primary font-medium truncate">
                          {request.recipient.username ? `@${request.recipient.username}` : ''}
                        </p>
                        <span className="badge badge-warning badge-xs gap-1 mt-1">
                          <Clock size={10} /> {t('Pending')}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCancelRequest(request._id, request.recipient._id)}
                        className="btn btn-outline btn-error btn-xs"
                      >
                        {t('Cancel')}
                      </button>
                    </div>
                  ) : null
                ))
              )
            )}

            {/* SUBTAB 3: MY CONNECTIONS */}
            {requestsSubTab === 'connections' && (
              connections.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-base-content/50">
                  <UserCheck size={32} className="opacity-40 mb-2" />
                  <p className="text-sm font-medium text-base-content">{t('No connections yet')}</p>
                  <p className="text-xs mt-1 text-base-content/60">
                    {t('Search for users in Discover to connect and start chatting!')}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('discover')}
                    className="btn btn-primary btn-sm mt-2 gap-1.5"
                  >
                    <Compass size={15} />
                    {t('Discover People')}
                  </button>
                </div>
              ) : (
                connections.map((conn) => {
                  const isOnline = onlineUsers.includes(conn._id);
                  return (
                    <div
                      key={conn._id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-base-100 border border-base-300 shadow-sm"
                    >
                      <div className="relative shrink-0">
                        <Avatar src={conn.profilePic} name={conn.fullName} size="w-11 h-11" />
                        {isOnline && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-success border-2 border-base-100" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate">{conn.fullName}</p>
                        <p className="text-xs text-primary font-medium truncate">
                          {conn.username ? `@${conn.username}` : ''}
                        </p>
                        {conn.bio && (
                          <p className="text-[11px] text-base-content/60 truncate mt-0.5">{conn.bio}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSelectUser(conn)}
                        className="btn btn-primary btn-xs gap-1"
                      >
                        <MessageSquare size={13} />
                        {t('Message')}
                      </button>
                    </div>
                  );
                })
              )
            )}
          </div>
        </div>
      )}

      {/* Message request inspection modal */}
      {viewingMessageRequest && (
        <div
          className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/50 p-3"
          role="presentation"
          onClick={() => setViewingMessageRequest(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={t('Message request from {name}', { name: viewingMessageRequest.sender.fullName })}
            className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-base-100 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-center gap-3 border-b border-base-300 p-4">
              <Avatar src={viewingMessageRequest.sender.profilePic} name={viewingMessageRequest.sender.fullName} size="h-10 w-10" />
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-semibold">{viewingMessageRequest.sender.fullName}</h2>
                <p className="text-xs text-base-content/60">{t('Message request · review before accepting')}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewingMessageRequest(null)}
                className="btn btn-ghost btn-sm btn-circle"
                aria-label={t('Close message request')}
              >
                <X size={18} />
              </button>
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {isLoadingRequestMessages ? (
                <div className="flex justify-center py-8">
                  <span className="loading loading-spinner loading-md" />
                </div>
              ) : messageRequestMessages.map((message) => (
                <article key={message._id} className="max-w-[90%] rounded-xl bg-base-200 p-3">
                  {message.text && <p className="whitespace-pre-wrap break-words text-sm">{message.text}</p>}
                  {message.image && (
                    <img src={message.image} alt={t('Image in message request')} className="mt-2 max-h-64 rounded-lg object-contain" />
                  )}
                  {message.video && (
                    <video src={message.video} controls className="mt-2 max-h-64 max-w-full rounded-lg" />
                  )}
                  {message.document && (
                    <DocumentLink
                      messageId={message._id}
                      documentName={message.documentName || t('Open attachment')}
                      className="mt-2 text-primary"
                    />
                  )}
                  <time className="mt-2 block text-right text-[11px] text-base-content/50">
                    {new Date(message.createdAt).toLocaleString(language === 'bn' ? 'bn-BD' : language === 'hi' ? 'hi-IN' : 'en-US')}
                  </time>
                </article>
              ))}
            </div>
            <footer className="flex justify-end gap-2 border-t border-base-300 p-4">
              <button
                type="button"
                onClick={() => handleRespondToMessageRequest(viewingMessageRequest, false)}
                className="btn btn-ghost btn-sm text-error"
              >
                {t('Decline')}
              </button>
              <button
                type="button"
                onClick={() => handleRespondToMessageRequest(viewingMessageRequest, true)}
                className="btn btn-success btn-sm"
              >
                {t('Accept and chat')}
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
