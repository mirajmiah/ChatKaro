import { useEffect, useRef, useState } from 'react';
import { Check, Copy, MessageSquare, Pin, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useChatStore } from '../store/useChatStore.js';
import { useAuthStore } from '../store/useAuthStore.js';
import ChatHeader from './ChatHeader.jsx';
import ChatInput from './ChatInput.jsx';
import MessageBubble from './MessageBubble.jsx';
import { useTranslation } from '../lib/i18n.js';

function BubbleSkeleton({ align = 'start' }) {
  return (
    <div className={`flex items-end gap-2 ${align === 'end' ? 'flex-row-reverse' : 'flex-row'} px-4`}>
      <div className="w-8 h-8 rounded-full bg-base-300 animate-pulse shrink-0" />
      <div
        className={`h-10 rounded-2xl bg-base-300 animate-pulse ${
          align === 'end' ? 'w-40' : 'w-48'
        }`}
      />
    </div>
  );
}

export default function ChatWindow() {
  const { selectedUser, messages, users, typingUsers, isLoadingMessages, fetchMessages, editMessage, deleteMessage, toggleStarMessage, togglePinMessage, forwardMessage, toggleReaction } = useChatStore();
  const { authUser } = useAuthStore();
  const { t } = useTranslation();
  const bottomRef = useRef(null);
  const [replyTarget, setReplyTarget] = useState(null);
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const [showDeleteOptions, setShowDeleteOptions] = useState(false);
  const [pinClock, setPinClock] = useState(Date.now());
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const previousMessageCount = useRef(0);

  const isOtherUserTyping = Boolean(selectedUser && typingUsers[String(selectedUser._id)]);
  const hasPendingSentRequest = messages.some(
    (m) => String(m.senderId) === String(authUser?._id) && m.messageRequestStatus === 'pending'
  );

  useEffect(() => {
    if (!selectedUser) return;
    fetchMessages(selectedUser._id);
  }, [selectedUser?._id]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > previousMessageCount.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    previousMessageCount.current = messages.length;
  }, [messages]);

  useEffect(() => {
    setReplyTarget(null);
    setSelectedMessageIds([]);
    setShowDeleteOptions(false);
    previousMessageCount.current = 0;
  }, [selectedUser?._id]);

  useEffect(() => {
    const nextExpiry = messages
      .filter((message) => message.pinnedAt && message.pinnedUntil)
      .map((message) => new Date(message.pinnedUntil).getTime())
      .filter((expiresAt) => expiresAt > pinClock)
      .sort((a, b) => a - b)[0];
    if (!nextExpiry) return undefined;

    const timeoutId = window.setTimeout(
      () => setPinClock(Date.now()),
      Math.max(0, nextExpiry - Date.now())
    );
    return () => window.clearTimeout(timeoutId);
  }, [messages, pinClock]);

  const selectedMessages = messages.filter((message) => selectedMessageIds.includes(message._id));
  const canDeleteSelectedForEveryone = selectedMessages.length > 0 && selectedMessages.every((message) =>
    String(message.senderId) === String(authUser?._id) &&
    !message.deletedAt &&
    Date.now() - new Date(message.createdAt).getTime() <= 4 * 60 * 60 * 1000
  );

  const toggleMessageSelection = (messageId) => {
    setSelectedMessageIds((selectedIds) =>
      selectedIds.includes(messageId)
        ? selectedIds.filter((id) => id !== messageId)
        : [...selectedIds, messageId]
    );
  };

  const exitSelectionMode = () => setSelectedMessageIds([]);

  const copySelectedMessages = async () => {
    const selectedText = messages
      .filter((message) => selectedMessageIds.includes(message._id) && message.text && !message.deletedAt)
      .map((message) => message.text)
      .join('\n');
    if (!selectedText) {
      toast.error(t('The selected messages contain no copyable text.'));
      return;
    }
    try {
      await navigator.clipboard.writeText(selectedText);
      toast.success(t('Selected messages copied'));
      exitSelectionMode();
    } catch {
      toast.error(t('Unable to copy selected messages.'));
    }
  };

  const deleteSelectedMessages = async (scope) => {
    if (scope === 'everyone' && !canDeleteSelectedForEveryone) return;
    const scopeLabel = scope === 'everyone' ? t('for everyone') : t('for you');
    if (!window.confirm(t('Delete {count} selected message(s) {scope}?', { count: selectedMessageIds.length, scope: scopeLabel }))) return;

    const results = await Promise.allSettled(
      selectedMessageIds.map((messageId) => deleteMessage(messageId, scope))
    );
    const failedIds = selectedMessageIds.filter((_, index) => results[index].status === 'rejected');
    if (failedIds.length) {
      setSelectedMessageIds(failedIds);
      setShowDeleteOptions(false);
      return;
    }

    exitSelectionMode();
    setShowDeleteOptions(false);
  };

  const jumpToMessage = (messageId) => {
    const id = String(messageId);
    setHighlightedMessageId(id);
    window.requestAnimationFrame(() => {
      const el = document.getElementById(`message-${id}`);
      if (el) {
        el.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    });
    window.setTimeout(() => {
      setHighlightedMessageId((curr) => (curr === id ? null : curr));
    }, 2500);
  };

  if (!selectedUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-base-content/40 p-8 text-center bg-base-100/50">
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-lg shadow-primary/5 transition-transform hover:scale-105 duration-300">
            <MessageSquare size={44} strokeWidth={1.5} />
          </div>
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-primary"></span>
          </span>
        </div>
        <div className="max-w-sm">
          <h2 className="text-xl font-bold text-base-content tracking-tight">{t('Welcome to ChatKaro')}</h2>
          <p className="text-sm mt-1 text-base-content/60 leading-relaxed">{t('Pick a contact from the sidebar or search by email to start chatting.')}</p>
        </div>
      </div>
    );
  }

  const pinnedMessages = messages.filter((message) =>
    message.pinnedAt &&
    !message.deletedAt &&
    (!message.pinnedUntil || new Date(message.pinnedUntil).getTime() > pinClock)
  );
  const selectedCount = selectedMessageIds.length;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <ChatHeader messages={messages} onJumpToMessage={jumpToMessage} />
      {selectedCount > 0 && (
        <div className="flex shrink-0 items-center gap-2 border-b border-base-300 bg-base-200 px-3 py-2">
          <button type="button" onClick={exitSelectionMode} className="btn btn-ghost btn-sm btn-circle" aria-label={t('Exit selection mode')}>
            <X size={18} />
          </button>
          <span className="min-w-0 flex-1 text-sm font-medium">{t('{count} selected', { count: selectedCount })}</span>
          <button type="button" onClick={copySelectedMessages} className="btn btn-ghost btn-sm btn-circle" aria-label={t('Copy selected messages')} title={t('Copy')}>
            <Copy size={17} />
          </button>
          <button type="button" onClick={() => setShowDeleteOptions(true)} className="btn btn-ghost btn-sm btn-circle text-error" aria-label={t('Delete selected messages')} title={t('Delete selected messages')}>
            <Trash2 size={17} />
          </button>
        </div>
      )}
      {showDeleteOptions && (
        <div className="modal modal-open z-[1100]" role="dialog" aria-modal="true" aria-labelledby="delete-selected-title">
          <div className="modal-box max-w-sm">
            <h2 id="delete-selected-title" className="text-lg font-bold">{t('Delete {count} selected message(s)?', { count: selectedCount })}</h2>
            <p className="mt-2 text-sm text-base-content/60">{t('Choose who should no longer see the selected messages.')}</p>
            <div className="mt-5 flex flex-col gap-2">
              <button type="button" onClick={() => deleteSelectedMessages('me')} className="btn btn-outline">
                {t('Delete for me')}
              </button>
              <button
                type="button"
                disabled={!canDeleteSelectedForEveryone}
                onClick={() => deleteSelectedMessages('everyone')}
                className="btn btn-error"
                title={!canDeleteSelectedForEveryone ? t('Only your messages sent within the last 4 hours can be deleted for everyone.') : undefined}
              >
                {t('Delete for everyone')}
              </button>
              {!canDeleteSelectedForEveryone && (
                <p className="text-xs text-base-content/50">{t('Delete for everyone is available only when all selected messages are yours and were sent within the last 4 hours.')}</p>
              )}
              <button type="button" onClick={() => setShowDeleteOptions(false)} className="btn btn-ghost mt-1">
                {t('Cancel')}
              </button>
            </div>
          </div>
          <button type="button" className="modal-backdrop" onClick={() => setShowDeleteOptions(false)} aria-label={t('Close delete options')} />
        </div>
      )}
      {pinnedMessages.length > 0 && (
        <button
          type="button"
          onClick={() => jumpToMessage(pinnedMessages[0]._id)}
          className="flex w-full items-center gap-3 border-b border-base-300 bg-base-200 px-4 py-2 text-left hover:bg-base-300"
        >
          <Pin size={16} className="shrink-0 text-primary" />
          <span className="min-w-0 flex-1 truncate text-sm">{pinnedMessages[0].text || pinnedMessages[0].documentName || (pinnedMessages[0].image ? t('Photo') : pinnedMessages[0].video ? t('Video') : t('Attachment'))}</span>
          {pinnedMessages.length > 1 && <span className="badge badge-sm">{pinnedMessages.length}</span>}
        </button>
      )}

      {hasPendingSentRequest && (
        <div className="flex items-center gap-2 border-b border-warning/30 bg-warning/15 px-4 py-2 text-xs text-warning-content">
          <span className="font-bold">⚠️</span>
          <span>{t('Your message was sent as a request. Once {name} accepts, you can chat normally.', { name: selectedUser.fullName })}</span>
        </div>
      )}

      {/* Message list */}
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin py-4 space-y-1">
        {isLoadingMessages ? (
          <div className="space-y-4 pt-2">
            <BubbleSkeleton align="start" />
            <BubbleSkeleton align="end" />
            <BubbleSkeleton align="start" />
            <BubbleSkeleton align="end" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-base-content/30 text-center p-8">
            <MessageSquare size={32} strokeWidth={1.2} />
            <p className="text-sm">{t('No messages yet. Say hello! 👋')}</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const prevMsg = messages[index - 1];
            const nextMsg = messages[index + 1];
            const isSameSenderAsPrev = Boolean(
              prevMsg &&
              String(prevMsg.senderId) === String(msg.senderId) &&
              new Date(msg.createdAt) - new Date(prevMsg.createdAt) < 2 * 60 * 1000
            );
            const isSameSenderAsNext = Boolean(
              nextMsg &&
              String(nextMsg.senderId) === String(msg.senderId) &&
              new Date(nextMsg.createdAt) - new Date(msg.createdAt) < 2 * 60 * 1000
            );

            return (
              <MessageBubble
                key={msg._id}
                message={msg}
                authUser={authUser}
                users={users}
                editMessage={editMessage}
                deleteMessage={deleteMessage}
                toggleStarMessage={toggleStarMessage}
                togglePinMessage={togglePinMessage}
                forwardMessage={forwardMessage}
                toggleReaction={toggleReaction}
                onReply={(message) => setReplyTarget(message)}
                jumpToMessage={jumpToMessage}
                selectionMode={selectedCount > 0}
                isSelected={selectedMessageIds.includes(msg._id)}
                onToggleSelection={() => toggleMessageSelection(msg._id)}
                onStartSelection={() => setSelectedMessageIds([msg._id])}
                isSameSenderAsPrev={isSameSenderAsPrev}
                isSameSenderAsNext={isSameSenderAsNext}
                isHighlighted={highlightedMessageId === String(msg._id)}
              />
            );
          })
        )}

        {/* Live typing indicator subtle note */}
        {isOtherUserTyping && (
          <div className="px-4 py-1 text-xs text-primary font-medium flex items-center gap-1.5 opacity-90 animate-in fade-in duration-150">
            <span>{selectedUser.fullName} {t('is typing')}</span>
            <span className="inline-flex items-center gap-0.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <ChatInput replyTarget={replyTarget} onCancelReply={() => setReplyTarget(null)} />
    </div>
  );
}
