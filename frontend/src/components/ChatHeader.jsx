import { useState } from 'react';
import { ArrowLeft, Info, Phone, Video } from 'lucide-react';
import { useChatStore } from '../store/useChatStore.js';
import { useAuthStore } from '../store/useAuthStore.js';
import ChatDetailsModal from './ChatDetailsModal.jsx';
import { useTranslation } from '../lib/i18n.js';

function InitialsAvatar({ name }) {
  const initials = name
    ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';
  return (
    <div className="w-10 h-10 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-sm select-none shrink-0">
      {initials}
    </div>
  );
}

export default function ChatHeader({ messages, onJumpToMessage }) {
  const { selectedUser, selectUser } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const { t } = useTranslation();
  const [showDetails, setShowDetails] = useState(false);

  if (!selectedUser) return null;

  const isOnline = onlineUsers.includes(selectedUser._id);

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-base-300 bg-base-200 shrink-0">
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
          {selectedUser.profilePic ? (
            <img src={selectedUser.profilePic} alt={selectedUser.fullName} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <InitialsAvatar name={selectedUser.fullName} />
          )}
          {isOnline && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-success border-2 border-base-200" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold truncate leading-tight">{selectedUser.fullName}</p>
          <p className={`text-xs ${isOnline ? 'text-success' : 'text-base-content/50'}`}>
            {t(isOnline ? 'Online' : 'Offline')}
          </p>
        </div>
        <Info size={17} className="mr-1 shrink-0 text-base-content/50" />
      </button>

      {/* Actions (decorative for now) */}
      <div className="flex items-center gap-1 ml-auto">
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
