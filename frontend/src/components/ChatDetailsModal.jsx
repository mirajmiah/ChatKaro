import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Image, Link2, Star, Video, X } from 'lucide-react';
import { useTranslation } from '../lib/i18n.js';
import ImageViewer from './ImageViewer.jsx';
import DocumentLink from './DocumentLink.jsx';

const TABS = [
  { id: 'media', label: 'Media' },
  { id: 'links', label: 'Links' },
  { id: 'documents', label: 'Docs' },
  { id: 'starred', label: 'Starred' },
];

function messagePreview(message, t) {
  if (message.deletedAt) return t('Message deleted');
  return message.text || message.documentName || (message.image ? t('Photo') : message.video ? t('Video') : t('Attachment'));
}

function MessageList({ messages, onJumpToMessage, emptyText, t, language }) {
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
          <span className="min-w-0 flex-1 truncate text-sm">{messagePreview(message, t)}</span>
          <span className="shrink-0 text-xs text-base-content/50">
            {new Date(message.createdAt).toLocaleDateString(language === 'bn' ? 'bn-BD' : language === 'hi' ? 'hi-IN' : 'en-US')}
          </span>
        </button>
      ))}
    </div>
  );
}

export default function ChatDetailsModal({ user, messages, isOnline, onClose, onJumpToMessage }) {
  const { language, t } = useTranslation();
  const [activeTab, setActiveTab] = useState('media');
  const [showProfileImage, setShowProfileImage] = useState(false);
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
    <div className="modal modal-open z-[1100]" role="dialog" aria-modal="true" aria-label={t('{name} chat details', { name: user.fullName })} onClick={onClose}>
      <div className="modal-box max-h-[90vh] w-11/12 max-w-2xl p-0" onClick={(event) => event.stopPropagation()}>
        <div className="relative flex flex-col items-center border-b border-base-300 px-6 pb-5 pt-8">
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm btn-circle absolute right-3 top-3" aria-label={t('Close details')}>
            <X size={18} />
          </button>
          {user.profilePic ? (
            <button
              type="button"
              onClick={() => setShowProfileImage(true)}
              className="h-24 w-24 cursor-zoom-in overflow-hidden rounded-full"
              aria-label={t('View profile picture')}
            >
              <img src={user.profilePic} alt={user.fullName} className="h-full w-full object-cover" />
            </button>
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/20 text-2xl font-bold text-primary">{initials}</div>
          )}
          <h2 className="mt-3 text-xl font-bold">{user.fullName}</h2>
          <p className={`text-sm ${isOnline ? 'text-success' : 'text-base-content/50'}`}>{t(isOnline ? 'Online' : 'Offline')}</p>
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
                {t(tab.label)}
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
                      <span className="text-xs">{t('Video')}</span>
                    </div>
                  )}
                  <Image size={14} className="absolute bottom-2 right-2 rounded bg-base-100/80 p-0.5 text-base-content" />
                </button>
              ))}
            </div>
          ) : <p className="py-12 text-center text-sm text-base-content/50">{t('No shared media yet.')}</p>)}

          {activeTab === 'links' && (links.length ? (
            <div className="space-y-2">
              {links.map(({ message, url, key }) => (
                <div key={key} className="flex items-center gap-3 rounded-xl bg-base-200 p-3">
                  <Link2 size={18} className="shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">
                    <a href={url} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="block truncate text-sm text-primary underline">{url}</a>
                    <span className="block truncate text-xs text-base-content/50">{message.text}</span>
                  </span>
                  <button type="button" onClick={() => jump(message._id)} className="btn btn-ghost btn-xs shrink-0">{t('View')}</button>
                </div>
              ))}
            </div>
          ) : <p className="py-12 text-center text-sm text-base-content/50">{t('No links shared yet.')}</p>)}

          {activeTab === 'documents' && (documents.length ? (
            <div className="space-y-2">
              {documents.map((message) => (
                <div key={message._id} className="flex items-center gap-3 rounded-xl bg-base-200 p-3 hover:bg-base-300">
                  <DocumentLink messageId={message._id} documentName={message.documentName} className="min-w-0 flex-1" />
                  <span className="text-xs text-base-content/50">{new Date(message.createdAt).toLocaleDateString(language === 'bn' ? 'bn-BD' : language === 'hi' ? 'hi-IN' : 'en-US')}</span>
                </div>
              ))}
            </div>
          ) : <p className="py-12 text-center text-sm text-base-content/50">{t('No documents shared yet.')}</p>)}

          {activeTab === 'starred' && <MessageList messages={starred} onJumpToMessage={jump} emptyText={t('No starred messages.')} t={t} language={language} />}
        </div>
      </div>
      <button type="button" className="modal-backdrop" onClick={onClose} aria-label={t('Close chat details')} />
      {showProfileImage && user.profilePic && (
        <ImageViewer
          src={user.profilePic}
          alt={t('Profile picture of {name}', { name: user.fullName })}
          closeLabel={t('Close image')}
          onClose={() => setShowProfileImage(false)}
        />
      )}
    </div>
  );

  return createPortal(content, document.body);
}
