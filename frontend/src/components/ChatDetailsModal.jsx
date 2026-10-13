import { useState } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Image, Link2, Star, Video, X } from 'lucide-react';

const TABS = [
  { id: 'media', label: 'Media' },
  { id: 'links', label: 'Links' },
  { id: 'documents', label: 'Docs' },
  { id: 'starred', label: 'Starred' },
];

function messagePreview(message) {
  if (message.deletedAt) return 'Message deleted';
  return message.text || message.documentName || (message.image ? 'Photo' : message.video ? 'Video' : 'Attachment');
}

function MessageList({ messages, onJumpToMessage, emptyText }) {
  if (!messages.length) {
    return <p className="py-12 text-center text-sm text-base-content/50">{emptyText}</p>;
  }

  return (
    <div className="space-y-2">
      {messages.map((message) => (
        <button
          key={message._id}
          type="button"
          onClick={() => onJumpToMessage(message._id)}
          className="flex w-full items-center gap-3 rounded-xl bg-base-200 p-3 text-left hover:bg-base-300"
        >
          <Star size={17} className="shrink-0 text-warning" />
          <span className="min-w-0 flex-1 truncate text-sm">{messagePreview(message)}</span>
          <span className="shrink-0 text-xs text-base-content/50">
            {new Date(message.createdAt).toLocaleDateString()}
          </span>
        </button>
      ))}
    </div>
  );
}

export default function ChatDetailsModal({ user, messages, isOnline, onClose, onJumpToMessage }) {
  const [activeTab, setActiveTab] = useState('media');
  const activeMessages = messages.filter((message) => !message.deletedAt);
  const media = activeMessages.filter((message) => message.image || message.video);
  const documents = activeMessages.filter((message) => message.document);
  const starred = activeMessages.filter((message) => message.isStarred);
  const links = activeMessages.flatMap((message) => {
    const urls = message.text?.match(/https?:\/\/[^\s<>()]+/gi) || [];
    return urls.map((url, index) => ({ message, url: url.replace(/[.,!?;:]+$/, ''), key: `${message._id}-${index}` }));
  });
  const initials = user.fullName.split(' ').map((part) => part[0]).join('').toUpperCase().slice(0, 2);

  const jump = (messageId) => {
    onClose();
    onJumpToMessage(messageId);
  };

  const content = (
    <div className="modal modal-open z-[1100]" role="dialog" aria-modal="true" aria-label={`${user.fullName} chat details`} onClick={onClose}>
      <div className="modal-box max-h-[90vh] w-11/12 max-w-2xl p-0" onClick={(event) => event.stopPropagation()}>
        <div className="relative flex flex-col items-center border-b border-base-300 px-6 pb-5 pt-8">
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm btn-circle absolute right-3 top-3" aria-label="Close details">
            <X size={18} />
          </button>
          {user.profilePic ? (
            <img src={user.profilePic} alt={user.fullName} className="h-24 w-24 rounded-full object-cover" />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/20 text-2xl font-bold text-primary">{initials}</div>
          )}
          <h2 className="mt-3 text-xl font-bold">{user.fullName}</h2>
          <p className={`text-sm ${isOnline ? 'text-success' : 'text-base-content/50'}`}>{isOnline ? 'Online' : 'Offline'}</p>
          {user.email && <p className="mt-1 text-sm text-base-content/60">{user.email}</p>}
          {user.bio && (
            <p className="mt-3 max-w-lg whitespace-pre-wrap text-center text-sm leading-relaxed text-base-content/70">
              {user.bio}
            </p>
          )}
        </div>

        <div className="border-b border-base-300 px-3 pt-2">
          <div role="tablist" className="tabs tabs-bordered tabs-sm flex-nowrap overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab whitespace-nowrap ${activeTab === tab.id ? 'tab-active' : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[42vh] min-h-40 overflow-y-auto p-4">
          {activeTab === 'media' && (media.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {media.map((message) => (
                <button key={message._id} type="button" onClick={() => jump(message._id)} className="group relative aspect-square overflow-hidden rounded-xl bg-base-200">
                  {message.image ? (
                    <img src={message.image} alt="Shared media" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-base-content/70">
                      <Video size={28} />
                      <span className="text-xs">Video</span>
                    </div>
                  )}
                  <Image size={14} className="absolute bottom-2 right-2 rounded bg-base-100/80 p-0.5 text-base-content" />
                </button>
              ))}
            </div>
          ) : <p className="py-12 text-center text-sm text-base-content/50">No shared media yet.</p>)}

          {activeTab === 'links' && (links.length ? (
            <div className="space-y-2">
              {links.map(({ message, url, key }) => (
                <div key={key} className="flex items-center gap-3 rounded-xl bg-base-200 p-3">
                  <Link2 size={18} className="shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">
                    <a href={url} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="block truncate text-sm text-primary underline">{url}</a>
                    <span className="block truncate text-xs text-base-content/50">{message.text}</span>
                  </span>
                  <button type="button" onClick={() => jump(message._id)} className="btn btn-ghost btn-xs shrink-0">View</button>
                </div>
              ))}
            </div>
          ) : <p className="py-12 text-center text-sm text-base-content/50">No links shared yet.</p>)}

          {activeTab === 'documents' && (documents.length ? (
            <div className="space-y-2">
              {documents.map((message) => (
                <a key={message._id} href={message.document} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl bg-base-200 p-3 hover:bg-base-300">
                  <FileText size={20} className="shrink-0 text-primary" />
                  <span className="min-w-0 flex-1 truncate text-sm">{message.documentName}</span>
                  <span className="text-xs text-base-content/50">{new Date(message.createdAt).toLocaleDateString()}</span>
                </a>
              ))}
            </div>
          ) : <p className="py-12 text-center text-sm text-base-content/50">No documents shared yet.</p>)}

          {activeTab === 'starred' && <MessageList messages={starred} onJumpToMessage={jump} emptyText="No starred messages." />}
        </div>
      </div>
      <button type="button" className="modal-backdrop" onClick={onClose} aria-label="Close chat details" />
    </div>
  );

  return createPortal(content, document.body);
}
