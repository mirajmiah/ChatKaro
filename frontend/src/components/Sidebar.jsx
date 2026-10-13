import { useEffect, useRef, useState } from 'react';
import { Check, FileText, MoreVertical, Search, Trash2, UserMinus, UserPlus, Users, X } from 'lucide-react';
import { useChatStore } from '../store/useChatStore.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { formatLastSeen } from '../lib/utils.js';

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

function InitialsAvatar({ name, size = 'w-11 h-11' }) {
  const initials = name
    ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';
  return (
    <div
      className={`${size} rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0 text-sm select-none`}
    >
      {initials}
    </div>
  );
}

export default function Sidebar() {
  const {
    users,
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
    deleteChat,
    removeContact,
    isLoadingUsers,
  } = useChatStore();
  const { onlineUsers, socket } = useAuthStore();
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
    return () => socket.off('contactsUpdated', refreshContacts);
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
    if (!contactSearchResult || contactSearchResult.requestStatus) return;
    setIsAddingContact(true);
    try {
      await sendContactRequest(contactSearchResult.email);
      setContactSearchResult((result) => result
        ? { ...result, requestStatus: 'sent' }
        : result);
    } catch {
      // The chat store displays the error toast.
    } finally {
      setIsAddingContact(false);
    }
  };

  const handleClearChat = async (user) => {
    if (!window.confirm(`Clear chat with ${user.fullName}? This clears messages only for you. They will keep their messages.`)) return;
    try {
      await deleteChat(user._id);
      setOpenChatMenu(null);
    } catch {
      // The chat store displays the error toast.
    }
  };

  const handleRemoveContact = async (user) => {
    if (!window.confirm(`Remove ${user.fullName} from your contacts? This clears your chat only; they keep their messages. Their next messages will arrive as a request that you can accept or decline.`)) return;
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

  const filtered = onlineOnly
    ? users.filter((u) => onlineUsers.includes(u._id))
    : users;
  
  const visibleUsers = filtered;

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-base-200">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 border-b border-base-300 space-y-3">
        <div className="flex items-center gap-2">
          <Users size={20} className="text-primary" />
          <h2 className="font-bold text-lg">Contacts</h2>
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
            placeholder="Search by email"
            aria-label="Contact email"
            autoComplete="email"
            required
            className="input input-bordered input-sm min-w-0 flex-1"
          />
          <button
            type="submit"
            disabled={isSearchingContact || !contactEmail.trim()}
            className="btn btn-primary btn-sm btn-square"
            aria-label="Search contact"
            title="Search contact"
          >
            {isSearchingContact ? <span className="loading loading-spinner loading-xs" /> : <Search size={17} />}
          </button>
        </form>
        {contactSearchResult && (
          <div className="flex items-center gap-3 rounded-lg border border-base-300 bg-base-100 p-3">
            {contactSearchResult.profilePic ? (
              <img src={contactSearchResult.profilePic} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
            ) : (
              <InitialsAvatar name={contactSearchResult.fullName} size="h-10 w-10" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{contactSearchResult.fullName}</p>
              <p className="truncate text-xs text-base-content/60">{contactSearchResult.email}</p>
              {contactSearchResult.requestStatus === 'sent' && (
                <p className="mt-1 text-xs text-warning">Request sent · waiting for acceptance</p>
              )}
              {contactSearchResult.requestStatus === 'received' && (
                <p className="mt-1 text-xs text-warning">They sent you a request · respond below</p>
              )}
              {contactSearchResult.requestStatus === 'accepted' && !contactSearchResult.isHidden && (
                <p className="mt-1 text-xs text-success">Connected · chat is available</p>
              )}
              {contactSearchResult.isHidden && (
                <p className="mt-1 text-xs text-warning">Removed · accept their message request to reconnect</p>
              )}
            </div>
            {contactSearchResult.isHidden ? (
              <span className="badge badge-warning badge-outline badge-sm shrink-0">Removed</span>
            ) : (
              <button
                type="button"
                onClick={handleSendContactRequest}
                disabled={isAddingContact || Boolean(contactSearchResult.requestStatus)}
                className="btn btn-primary btn-xs shrink-0"
              >
                {isAddingContact
                  ? <span className="loading loading-spinner loading-xs" />
                  : contactSearchResult.requestStatus === 'sent'
                    ? 'Sent'
                    : contactSearchResult.requestStatus === 'received'
                      ? 'Respond below'
                      : contactSearchResult.requestStatus === 'accepted'
                        ? 'Connected'
                        : <><UserPlus size={14} /> Request</>}
              </button>
            )}
          </div>
        )}
        <p className="text-xs text-base-content/50">Send a request by email. You can chat after they accept.</p>

        {/* Online filter */}
        <label className="flex items-center gap-2 cursor-pointer select-none group">
          <input
            type="checkbox"
            checked={onlineOnly}
            onChange={(e) => setOnlineOnly(e.target.checked)}
            className="toggle toggle-primary toggle-xs"
          />
          <span className="text-sm text-base-content/70 group-hover:text-base-content transition-colors">
            Online only
          </span>
          {onlineOnly && (
            <span className="badge badge-success badge-outline badge-xs">
              {onlineUsers.length} online
            </span>
          )}
        </label>
      </div>

      {/* User list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin py-2">
        {contactRequests.length > 0 && (
          <section className="mb-2">
            <h3 className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-base-content/50">
              Contact requests <span className="badge badge-primary badge-xs">{contactRequests.length}</span>
            </h3>
            {contactRequests.map((request) => (
              request.sender && <div key={request._id} className="flex items-center gap-2 px-3 py-2">
                {request.sender.profilePic ? (
                  <img src={request.sender.profilePic} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                ) : (
                  <InitialsAvatar name={request.sender.fullName} size="h-10 w-10" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{request.sender.fullName}</p>
                  <p className="truncate text-xs text-base-content/50">{request.sender.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRespondToRequest(request, true)}
                  className="btn btn-success btn-xs btn-square"
                  aria-label={`Accept request from ${request.sender.fullName}`}
                  title="Accept"
                >
                  <Check size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => handleRespondToRequest(request, false)}
                  className="btn btn-ghost btn-xs btn-square text-error"
                  aria-label={`Decline request from ${request.sender.fullName}`}
                  title="Decline"
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </section>
        )}

        {messageRequests.length > 0 && (
          <section className="mb-2">
            <h3 className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-base-content/50">
              Message requests <span className="badge badge-warning badge-xs">{messageRequests.length}</span>
            </h3>
            {messageRequests.map((request) => {
              const message = request.latestMessage;
              const preview = message.text
                || message.documentName
                || (message.image ? 'Photo' : message.video ? 'Video' : 'Attachment');
              return (
                <div key={request.sender._id} className="flex items-center gap-2 px-3 py-2">
                  {request.sender.profilePic ? (
                    <img src={request.sender.profilePic} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                  ) : (
                    <InitialsAvatar name={request.sender.fullName} size="h-10 w-10" />
                  )}
                  <button
                    type="button"
                    onClick={() => handleViewMessageRequest(request)}
                    className="min-w-0 flex-1 text-left"
                    aria-label={`View ${request.messageCount} message${request.messageCount === 1 ? '' : 's'} from ${request.sender.fullName}`}
                  >
                    <p className="truncate text-sm font-semibold">{request.sender.fullName}</p>
                    <p className="truncate text-xs text-base-content/60">{preview}</p>
                    <p className="text-xs text-warning">
                      {request.messageCount} message{request.messageCount === 1 ? '' : 's'} · View before accepting
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRespondToMessageRequest(request, true)}
                    className="btn btn-success btn-xs btn-square"
                    aria-label={`Accept message request from ${request.sender.fullName}`}
                    title="Accept"
                  >
                    <Check size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRespondToMessageRequest(request, false)}
                    className="btn btn-ghost btn-xs btn-square text-error"
                    aria-label={`Decline message request from ${request.sender.fullName}`}
                    title="Decline"
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
              {onlineOnly ? 'No users online right now' : 'No contacts found'}
            </p>
          </div>
        ) : (
          visibleUsers.map((user) => {
            const isOnline = onlineUsers.includes(user._id);
            const isSelected = selectedUser?._id === user._id;

            return (
              <div
                key={user._id}
                ref={openChatMenu === user._id ? chatMenuRef : null}
                className={`
                  relative w-full flex items-center gap-2 px-3 py-3
                  hover:bg-base-300 transition-colors duration-100
                  ${isSelected ? 'bg-base-300 border-l-2 border-primary' : 'border-l-2 border-transparent'}
                `}
              >
                <button type="button" onClick={() => handleSelectUser(user)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                {/* Avatar */}
                <div className="relative shrink-0">
                  {user.profilePic ? (
                    <img
                      src={user.profilePic}
                      alt={user.fullName}
                      className="w-11 h-11 rounded-full object-cover"
                    />
                  ) : (
                    <InitialsAvatar name={user.fullName} />
                  )}
                  {/* Online dot */}
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-success border-2 border-base-200" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="font-semibold truncate text-sm">{user.fullName}</p>
                    {!isOnline && user.lastSeen && (
                      <span className="text-xs text-base-content/40 shrink-0">
                        {formatLastSeen(user.lastSeen)}
                      </span>
                    )}
                  </div>
                  <p className={`text-xs mt-0.5 ${isOnline ? 'text-success' : 'text-base-content/40'}`}>
                    {isOnline ? 'Online' : 'Offline'}
                  </p>
                </div>
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpenChatMenu((openId) => openId === user._id ? null : user._id);
                  }}
                  className="btn btn-ghost btn-xs btn-circle text-base-content/50 hover:text-base-content"
                  aria-label={`Open chat options for ${user.fullName}`}
                  title="Chat options"
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
                      Clear chat
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveContact(user)}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-base-200"
                    >
                      <UserMinus size={16} />
                      Remove contact
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
            aria-label={`Message request from ${viewingMessageRequest.sender.fullName}`}
            className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-base-100 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-center gap-3 border-b border-base-300 p-4">
              {viewingMessageRequest.sender.profilePic ? (
                <img src={viewingMessageRequest.sender.profilePic} alt="" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <InitialsAvatar name={viewingMessageRequest.sender.fullName} size="h-10 w-10" />
              )}
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-semibold">{viewingMessageRequest.sender.fullName}</h2>
                <p className="text-xs text-base-content/60">Message request · review before accepting</p>
              </div>
              <button
                type="button"
                onClick={() => setViewingMessageRequest(null)}
                className="btn btn-ghost btn-sm btn-circle"
                aria-label="Close message request"
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
                    <img src={message.image} alt="Image in message request" className="mt-2 max-h-64 rounded-lg object-contain" />
                  )}
                  {message.video && (
                    <video src={message.video} controls className="mt-2 max-h-64 max-w-full rounded-lg" />
                  )}
                  {message.document && (
                    <a href={message.document} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-2 text-sm text-primary underline">
                      <FileText size={18} />
                      {message.documentName || 'Open attachment'}
                    </a>
                  )}
                  <time className="mt-2 block text-right text-[11px] text-base-content/50">
                    {new Date(message.createdAt).toLocaleString()}
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
                Decline
              </button>
              <button
                type="button"
                onClick={() => handleRespondToMessageRequest(viewingMessageRequest, true)}
                className="btn btn-success btn-sm"
              >
                Accept and chat
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
