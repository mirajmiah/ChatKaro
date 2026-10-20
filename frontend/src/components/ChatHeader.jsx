import { useState } from 'react';
import { ArrowLeft, Info, Phone, Video } from 'lucide-react';
import { useChatStore } from '../store/useChatStore.js';
import { useAuthStore } from '../store/useAuthStore.js';
import ChatDetailsModal from './ChatDetailsModal.jsx';
import Avatar from './Avatar.jsx';
import { useTranslation } from '../lib/i18n.js';

export default function ChatHeader({ messages, onJumpToMessage }) {
  const { selectedUser, selectUser, typingUsers } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const { t } = useTranslation();
  const [showDetails, setShowDetails] = useState(false);

  if (!selectedUser) return null;

  const isOnline = onlineUsers.includes(selectedUser._id);
  const isTyping = Boolean(typingUsers[String(selectedUser._id)]);

  return (
    <div className="sticky top-0 z-20 flex shrink-0 items-center gap-3 border-b border-base-300 bg-base-200/85 backdrop-blur-md px-4 py-3">
      {/* Back button — mobile only */}
      <button
        onClick={() => selectUser(null)}
        className="md:hidden btn btn-ghost btn-sm btn-circle"
        aria-label={t('Back to contacts')}
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
            <p className={`text-xs ${isOnline ? 'text-success' : 'text-base-content/50'}`}>
              {t(isOnline ? 'Online' : 'Offline')}
            </p>
          )}
        </div>
        <Info size={17} className="mr-1 shrink-0 text-base-content/50" />
      </button>

      {/* Actions (decorative for now) */}
      <div className="hidden items-center gap-1 ml-auto sm:flex">
        <button
          className="btn btn-ghost btn-sm btn-circle text-base-content/50 hover:text-base-content"
          aria-label={t('Voice call (coming soon)')}
          disabled
        >
          <Phone size={18} />
        </button>
        <button
          className="btn btn-ghost btn-sm btn-circle text-base-content/50 hover:text-base-content"
          aria-label={t('Video call (coming soon)')}
          disabled
        >
          <Video size={18} />
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
