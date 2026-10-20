import { useEffect, useRef, useState } from 'react';
import { Check, MoreVertical, Search, Trash2, UserMinus, UserPlus, Users, X } from 'lucide-react';
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
    messageRequests,
    selectedUser,
    selectUser,
    fetchUsers,
    fetchContactRequests,
    fetchMessageRequests,
    fetchMessageRequestMessages,
    fetchMessages,
    searchContact,
    sendContactRequest,
    respondToContactRequest,
    respondToMessageRequest,
    withdrawContactRequest,
    deleteChat,
    removeContact,
    isLoadingUsers,
  } = useChatStore();
  const { authUser, onlineUsers, socket } = useAuthStore();
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [contactEmail, setContactEmail] = useState('');
  const [contactSearchResult, setContactSearchResult] = useState(null);
  const [isSearchingContact, setIsSearchingContact] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [openChatMenu, setOpenChatMenu] = useState(null);
  const [viewingMessageRequest, setViewingMessageRequest] = useState(null);
  const [messageRequestMessages, setMessageRequestMessages] = useState([]);
  const [isLoadingRequestMessages, setIsLoadingRequestMessages] = useState(false);
  const chatMenuRef = useRef(null);

  useEffect(() => {
    fetchUsers();
    fetchContactRequests();
    fetchMessageRequests();
  }, []);

  useEffect(() => {
    if (!socket) return undefined;
    const refreshContacts = () => {
      useChatStore.getState().fetchUsers();
      useChatStore.getState().fetchContactRequests();
      useChatStore.getState().fetchMessageRequests();
    };
    socket.on('contactsUpdated', refreshContacts);
    const handleNewMessage = (message) => {
      useChatStore.getState().handleIncomingMessage(message);
    };
    const handleMessagesRead = ({ senderId }) => {
      useChatStore.getState().handleMessagesRead(senderId);
    };
    const handleNotification = ({ type, name }) => {
      const messages = {
        contactRequest: 'New contact request from {name}',
        messageRequest: 'New message request from {name}',
        contactAccepted: '{name} accepted your contact request',
      };
      if (messages[type]) toast(t(messages[type], { name }));
    };
    socket.on('newMessage', handleNewMessage);
    socket.on('messagesRead', handleMessagesRead);
    socket.on('notification', handleNotification);
    return () => {
      socket.off('contactsUpdated', refreshContacts);
      socket.off('newMessage', handleNewMessage);
      socket.off('messagesRead', handleMessagesRead);
      socket.off('notification', handleNotification);
    };
  }, [socket]);

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
    fetchMessages(user._id);
  };

  const handleSearchContact = async (event) => {
    event.preventDefault();
    const email = contactEmail.trim();
    if (!email) return;
    setIsSearchingContact(true);
    setContactSearchResult(null);
    try {
      const result = await searchContact(email);
      setContactSearchResult(result);
    } catch {
      setContactSearchResult(null);
    } finally {
      setIsSearchingContact(false);
    }
  };

  const handleSendContactRequest = async () => {
    // A hidden accepted connection can be requested again after removal.
    if (!contactSearchResult || (contactSearchResult.requestStatus && !contactSearchResult.isHidden)) return;
    setIsAddingContact(true);
    try {
      const response = await sendContactRequest(contactSearchResult.email);
      setContactSearchResult((result) => result
        ? { ...result, requestStatus: 'sent', requestId: response.requestId || null, isHidden: false }
        : result);
    } catch {
      // The chat store displays the error toast.
    } finally {
      setIsAddingContact(false);
    }
  };

  const handleWithdrawContactRequest = async () => {
    if (!contactSearchResult?.requestId) return;
    setIsAddingContact(true);
    try {
      await withdrawContactRequest(contactSearchResult.requestId);
      setContactSearchResult((result) => result
        ? { ...result, requestStatus: null, requestId: null }
        : result);
    } catch {
      // The chat store displays the error toast.
    } finally {
      setIsAddingContact(false);
    }
  };

  const handleClearChat = async (user) => {
    if (!window.confirm(t('Clear chat with {name}? This clears messages only for you. They will keep their messages.', { name: user.fullName }))) return;
    try {
      await deleteChat(user._id);
      setOpenChatMenu(null);
    } catch {
      // The chat store displays the error toast.
    }
  };

  const handleRemoveContact = async (user) => {
    if (!window.confirm(t('Remove {name} from your contacts? This clears your chat only; they keep their messages. Their next messages will arrive as a request that you can accept or decline.', { name: user.fullName }))) return;
    try {
      await removeContact(user._id);
      setOpenChatMenu(null);
    } catch {
      // The chat store displays the error toast.
    }
  };

  const handleRespondToRequest = async (request, accept) => {
    try {
      await respondToContactRequest(request._id, accept);
    } catch {
      // The chat store displays the error toast.
    }
  };

  const handleRespondToMessageRequest = async (request, accept) => {
    try {
      await respondToMessageRequest(request.sender._id, accept);
      setViewingMessageRequest(null);
      setMessageRequestMessages([]);
    } catch {
      // The chat store displays the error toast.
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
  const filtered = onlineOnly
    ? users.filter((user) => onlineUsers.includes(String(user._id)))
    : users;
  
  const visibleUsers = filtered;

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-base-200">
      {/* Header */}
      <div className="px-3 pt-3 pb-3 sm:px-4 sm:pt-5 border-b border-base-300 space-y-3">
        <div className="flex items-center gap-2">
          <Users size={20} className="text-primary" />
          <h2 className="font-bold text-lg">{t('Contacts')}</h2>
          {visibleUsers.length > 0 && (
            <span className="badge badge-primary badge-sm ml-auto">{visibleUsers.length}</span>
          )}
        </div>

        <form onSubmit={handleSearchContact} className="flex gap-2">
          <input
            type="email"
            value={contactEmail}
            onChange={(event) => {
              setContactEmail(event.target.value);
              setContactSearchResult(null);
            }}
            placeholder={t('Search by email')}
            aria-label={t('Contact email')}
            autoComplete="email"
            required
            className="input input-bordered input-sm min-h-11 min-w-0 flex-1"
          />
          <button
            type="submit"
            disabled={isSearchingContact || !contactEmail.trim()}
            className="btn btn-primary btn-sm btn-square min-h-11 min-w-11"
            aria-label={t('Search contact')}
            title={t('Search contact')}
          >
            {isSearchingContact ? <span className="loading loading-spinner loading-xs" /> : <Search size={17} />}
          </button>
        </form>
        <p className="px-1 text-xs leading-relaxed font-semibold text-primary">
          {t('Enter an email, search, and send a request. Start chatting after they accept.')}
        </p>
        {contactSearchResult && (
          <div className="flex items-center gap-3 rounded-lg border border-base-300 bg-base-100 p-3">
            <Avatar src={contactSearchResult.profilePic} name={contactSearchResult.fullName} size="h-10 w-10" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{contactSearchResult.fullName}</p>
              <p className="truncate text-xs text-base-content/60">{contactSearchResult.email}</p>
              {contactSearchResult.requestStatus === 'sent' && (
                <p className="mt-1 text-xs text-warning">{t('Request sent · waiting for acceptance')}</p>
              )}
              {contactSearchResult.requestStatus === 'received' && (
                <p className="mt-1 text-xs text-warning">{t('They sent you a request · respond below')}</p>
              )}
              {contactSearchResult.requestStatus === 'accepted' && !contactSearchResult.isHidden && (
                <p className="mt-1 text-xs text-success">{t('Connected · chat is available')}</p>
              )}
              {contactSearchResult.isHidden && contactSearchResult.requestStatus !== 'sent' && (
                <p className="mt-1 text-xs text-warning">{t('Removed · you can send a new request to reconnect')}</p>
              )}
            </div>
            <button
              type="button"
              onClick={contactSearchResult.requestStatus === 'sent' ? handleWithdrawContactRequest : handleSendContactRequest}
              disabled={isAddingContact || Boolean(contactSearchResult.requestStatus && contactSearchResult.requestStatus !== 'sent' && !contactSearchResult.isHidden)}
              className={`btn btn-xs shrink-0 ${contactSearchResult.requestStatus === 'sent' ? 'btn-outline' : 'btn-primary'}`}
            >
              {isAddingContact
                ? <span className="loading loading-spinner loading-xs" />
                : contactSearchResult.requestStatus === 'sent'
                  ? t('Withdraw request')
                  : contactSearchResult.isHidden
                    ? <><UserPlus size={14} /> {t('Request again')}</>
                    : contactSearchResult.requestStatus === 'received'
                      ? t('Respond below')
                      : contactSearchResult.requestStatus === 'accepted'
                        ? t('Connected')
                        : <><UserPlus size={14} /> {t('Request')}</>}
            </button>
          </div>
        )}
        <p className="hidden text-xs text-base-content/50 sm:block">{t('Send a request by email. You can chat after they accept.')}</p>

        {/* Online filter */}
        <label className="flex items-center gap-2 cursor-pointer select-none group">
          <input
            type="checkbox"
            checked={onlineOnly}
            onChange={(e) => setOnlineOnly(e.target.checked)}
            className="toggle toggle-primary toggle-xs"
          />
          <span className="text-sm text-base-content/70 group-hover:text-base-content transition-colors">
            {t('Online only')}
          </span>
          {onlineOnly && (
            <span className="badge badge-success badge-outline badge-xs">
              {t('{count} online', { count: onlineContactCount })}
            </span>
          )}
        </label>
      </div>

      {/* User list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin py-2">
        {contactRequests.length > 0 && (
          <section className="mb-2">
            <h3 className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-base-content/50">
              {t('Contact requests')} <span className="badge badge-primary badge-xs">{contactRequests.length}</span>
            </h3>
            {contactRequests.map((request) => (
              request.sender ? (
                <div key={request._id} className="flex min-h-16 items-center gap-2 px-3 py-2">
                  <Avatar src={request.sender.profilePic} name={request.sender.fullName} size="h-10 w-10" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{request.sender.fullName}</p>
                    <p className="truncate text-xs text-base-content/50">{request.sender.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRespondToRequest(request, true)}
                    className="btn btn-success btn-sm btn-square min-h-10 min-w-10"
                    aria-label={t('Accept request from {name}', { name: request.sender.fullName })}
                    title={t('Accept')}
                  >
                    <Check size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRespondToRequest(request, false)}
                    className="btn btn-ghost btn-sm btn-square min-h-10 min-w-10 text-error"
                    aria-label={t('Decline request from {name}', { name: request.sender.fullName })}
                    title={t('Decline')}
                  >
                    <X size={15} />
                  </button>
                </div>
              ) : null
            ))}
          </section>
        )}

        {messageRequests.length > 0 && (
          <section className="mb-2">
            <h3 className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-base-content/50">
              {t('Message requests')} <span className="badge badge-warning badge-xs">{messageRequests.length}</span>
            </h3>
            {messageRequests.map((request) => {
              const isTyping = Boolean(typingUsers?.[String(request.sender._id)]);
              const message = request.latestMessage;
              const preview = message.text
                || message.documentName
                || (message.image ? t('Photo') : message.video ? t('Video') : message.audio ? `🎤 ${t('Voice message')}` : t('Attachment'));
              return (
                <div key={request.sender._id} className="flex items-center gap-2 px-3 py-2">
                  <Avatar src={request.sender.profilePic} name={request.sender.fullName} size="h-10 w-10" />
                  <button
                    type="button"
                    onClick={() => handleViewMessageRequest(request)}
                    className="min-w-0 flex-1 text-left"
                    aria-label={t('View {count} message(s) from {name}', { count: request.messageCount, name: request.sender.fullName })}
                  >
                    <p className="truncate text-sm font-semibold">{request.sender.fullName}</p>
                    {isTyping ? (
                      <p className="flex items-center gap-1.5 truncate text-xs font-medium text-primary animate-pulse">
                        <span>{t('typing')}</span>
                        <span className="inline-flex items-center gap-0.5">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                        </span>
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
                    aria-label={t('Accept message request from {name}', { name: request.sender.fullName })}
                    title={t('Accept')}
                  >
                    <Check size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRespondToMessageRequest(request, false)}
                    className="btn btn-ghost btn-xs btn-square text-error"
                    aria-label={t('Decline message request from {name}', { name: request.sender.fullName })}
                    title={t('Decline')}
                  >
                    <X size={15} />
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
            <p className="text-sm">
              {t(onlineOnly ? 'No users online right now' : 'No contacts found')}
            </p>
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
                <button type="button" onClick={() => handleSelectUser(user)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <Avatar
                    src={user.profilePic}
                    name={user.fullName}
                    size="w-11 h-11"
                  />
                  {/* Online dot */}
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-success border-2 border-base-200" />
                  )}
                </div>

                {/* Info */}
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
                      <p className={`truncate text-xs ${latestMessage ? 'text-base-content/60' : isOnline ? 'text-success' : 'text-base-content/40'}`}>
                        {latestMessage ? `${messagePrefix}${messagePreview}` : t(isOnline ? 'Online' : 'Offline')}
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
