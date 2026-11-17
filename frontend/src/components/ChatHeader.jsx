import { useState, useEffect } from 'react';
import { ArrowLeft, Info, Phone, Video, X } from 'lucide-react';
import { useChatStore } from '../store/useChatStore.js';
import { useAuthStore } from '../store/useAuthStore.js';
import ChatDetailsModal from './ChatDetailsModal.jsx';
import Avatar from './Avatar.jsx';
import { useTranslation } from '../lib/i18n.js';
import { formatLastSeenDetailed } from '../lib/utils.js';

export default function ChatHeader({ messages, onJumpToMessage }) {
  const { selectedUser, selectUser, typingUsers } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const { language, t } = useTranslation();
  const [showDetails, setShowDetails] = useState(false);

  // Allow pressing Escape key to exit the current chat
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !showDetails) {
        selectUser(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDetails, selectUser]);

  if (!selectedUser) return null;

  const isOnline = onlineUsers.includes(String(selectedUser._id));
  const isTyping = Boolean(typingUsers[String(selectedUser._id)]);

  return (
    <div className="sticky top-0 z-20 flex shrink-0 items-center gap-3 border-b border-base-300 bg-base-200/85 backdrop-blur-md px-4 py-3">
      {/* Back button — visible on mobile and desktop */}
      <button
        type="button"
        onClick={() => selectUser(null)}
        className="btn btn-ghost btn-sm btn-circle text-base-content/70 hover:text-base-content hover:bg-base-300"
        aria-label={t('Back to contacts')}
        title={t('Back to contacts')}
      >
        <ArrowLeft size={20} />
      </button>

      <button type="button" onClick={() => setShowDetails(true)} className="flex flex-1 min-w-0 items-center gap-3 text-left hover:opacity-80">
        <div className="relative shrink-0">
          <Avatar
            src={selectedUser.profilePic}
            name={selectedUser.fullName}
            size="w-10 h-10"
          />
          {isOnline && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-success border-2 border-base-200" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold truncate leading-tight">{selectedUser.fullName}</p>
          {isTyping ? (
            <p className="text-xs text-primary font-medium flex items-center gap-1.5 animate-pulse">
              <span>{t('typing')}</span>
              <span className="inline-flex items-center gap-0.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
              </span>
            </p>
          ) : (
            <p className={`text-xs truncate ${isOnline ? 'text-success font-medium' : 'text-base-content/60'}`}>
              {isOnline ? t('Online') : formatLastSeenDetailed(selectedUser.lastSeen, language, t)}
            </p>
          )}
        </div>
        <Info size={17} className="mr-1 shrink-0 text-base-content/50" />
      </button>

      {/* Actions */}
      <div className="flex items-center gap-1 ml-auto">
        <button
          className="hidden sm:inline-flex btn btn-ghost btn-sm btn-circle text-base-content/50 hover:text-base-content"
          aria-label={t('Voice call (coming soon)')}
          disabled
        >
          <Phone size={18} />
        </button>
        <button
          className="hidden sm:inline-flex btn btn-ghost btn-sm btn-circle text-base-content/50 hover:text-base-content"
          aria-label={t('Video call (coming soon)')}
          disabled
        >
          <Video size={18} />
        </button>

        {/* Close chat button */}
        <button
          type="button"
          onClick={() => selectUser(null)}
          className="btn btn-ghost btn-sm btn-circle text-base-content/60 hover:text-error hover:bg-error/10 transition-colors"
          aria-label={t('Close chat')}
          title={t('Close chat')}
        >
          <X size={20} />
        </button>
      </div>
      {showDetails && (
        <ChatDetailsModal
          user={selectedUser}
          messages={messages}
          isOnline={isOnline}
          onClose={() => setShowDetails(false)}
          onJumpToMessage={onJumpToMessage}
        />
      )}
    </div>
  );
}
