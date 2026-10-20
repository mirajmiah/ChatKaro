import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatMsgTime } from '../lib/utils.js';
import toast from 'react-hot-toast';
import {
  Check,
  CheckSquare,
  Copy,
  Forward,
  Info,
  Pencil,
  Pin,
  Reply,
  Star,
  Trash2,
  X,
  Circle,
  CheckCircle2,
} from 'lucide-react';
import { useTranslation } from '../lib/i18n.js';
import ImageViewer from './ImageViewer.jsx';
import DocumentLink from './DocumentLink.jsx';
import AudioPlayer from './AudioPlayer.jsx';
import Avatar from './Avatar.jsx';

const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s<]+|(?:[a-z\d](?:[a-z\d-]*[a-z\d])?\.)+[a-z]{2,}(?::\d+)?(?:[/?#][^\s<]*)?/gi;

function renderLinkedText(text) {
  const parts = [];
  let lastIndex = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const rawUrl = match[0];
    const url = rawUrl.replace(/[.,!?;:)}\]]+$/, '');
    if (!url) continue;

    const start = match.index;
    const end = start + url.length;
    if (start > lastIndex) parts.push(text.slice(lastIndex, start));
    parts.push(
      <a
        key={`${start}-${url}`}
        href={/^https?:\/\//i.test(url) ? url : `https://${url}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(event) => event.stopPropagation()}
        className="underline decoration-current underline-offset-2"
      >
        {url}
      </a>
    );
    if (end < start + rawUrl.length) parts.push(rawUrl.slice(url.length));
    lastIndex = start + rawUrl.length;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}



const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export default function MessageBubble({
  message,
  authUser,
  users = [],
  editMessage,
  deleteMessage,
  toggleStarMessage,
  togglePinMessage,
  forwardMessage,
  toggleReaction,
  onReply,
  jumpToMessage,
  selectionMode = false,
  isSelected = false,
  onToggleSelection,
  onStartSelection,
  isSameSenderAsPrev = false,
  isSameSenderAsNext = false,
}) {
  const { language, t } = useTranslation();
  const isMine = String(message.senderId) === String(authUser?._id);
  const [imgExpanded, setImgExpanded] = useState(false);
  const [showAvatarImage, setShowAvatarImage] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(message.text || '');
  const [isBusy, setIsBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showForwardPicker, setShowForwardPicker] = useState(false);
  const [showPinDurationPicker, setShowPinDurationPicker] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);
  const bubbleRef = useRef(null);
  const menuRef = useRef(null);
  const canEdit = isMine && !message.deletedAt && Boolean(message.text) &&
    Date.now() - new Date(message.createdAt).getTime() <= 15 * 60 * 1000;
  const canDelete = isMine && !message.deletedAt &&
    Date.now() - new Date(message.createdAt).getTime() <= 4 * 60 * 60 * 1000;

  const reactionGroups = (message.reactions || []).reduce((acc, curr) => {
    if (!curr.emoji) return acc;
    if (!acc[curr.emoji]) {
      acc[curr.emoji] = {
        emoji: curr.emoji,
        count: 0,
        hasMine: false,
      };
    }
    acc[curr.emoji].count += 1;
    if (String(curr.userId) === String(authUser?._id)) {
      acc[curr.emoji].hasMine = true;
    }
    return acc;
  }, {});
  const reactionList = Object.values(reactionGroups);

  const handleToggleReaction = async (emoji) => {
    if (isBusy || !toggleReaction) return;
    setIsBusy(true);
    try {
      await toggleReaction(message._id, emoji);
    } catch {
      // toast handled in store
    } finally {
      setIsBusy(false);
    }
  };

  const otherUser = users.find((user) => String(user._id) === String(isMine ? message.receiverId : message.senderId));
  const avatar = isMine ? authUser?.profilePic : otherUser?.profilePic;
  const name = isMine ? authUser?.fullName : otherUser?.fullName;
  const replySender = message.replyTo?.senderId
    ? (String(message.replyTo.senderId) === String(authUser?._id) ? t('You') : t('Contact'))
    : t('Message');
  const isPinned = Boolean(
    message.pinnedAt &&
    (!message.pinnedUntil || new Date(message.pinnedUntil).getTime() > Date.now())
  );
  const closeMenu = () => setMenuOpen(false);

  const setPinDuration = async (durationDays) => {
    setIsBusy(true);
    try {
      await togglePinMessage(message._id, true, durationDays);
      setShowPinDurationPicker(false);
    } finally {
      setIsBusy(false);
    }
  };

  const forwardTo = async (receiverId) => {
    setIsBusy(true);
    try {
      await forwardMessage(message._id, receiverId);
      setShowForwardPicker(false);
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    if (!menuOpen) return undefined;

    const dismissMenu = (event) => {
      if (
        bubbleRef.current?.contains(event.target) ||
        menuRef.current?.contains(event.target)
      ) {
        return;
      }
      setMenuOpen(false);
    };
    const dismissOnEscape = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('pointerdown', dismissMenu);
    document.addEventListener('keydown', dismissOnEscape);
    return () => {
      document.removeEventListener('pointerdown', dismissMenu);
      document.removeEventListener('keydown', dismissOnEscape);
    };
  }, [menuOpen]);

  useLayoutEffect(() => {
    if (!menuOpen) return undefined;

    const updateMenuPosition = () => {
      const bubble = bubbleRef.current?.getBoundingClientRect();
      const menu = menuRef.current?.getBoundingClientRect();
      if (!bubble || !menu) return;

      const margin = 8;
      const placeAbove = bubble.top >= menu.height + margin * 2;
      const top = placeAbove
        ? bubble.top - menu.height - margin
        : Math.min(bubble.bottom + margin, window.innerHeight - menu.height - margin);
      const left = Math.max(
        margin,
        Math.min(bubble.right - menu.width, window.innerWidth - menu.width - margin)
      );

      setMenuPosition({ top: Math.max(margin, top), left });
    };

    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [menuOpen]);

  const toggleMenu = (event) => {
    if (selectionMode) {
      onToggleSelection();
      return;
    }
    if (isEditing) return;
    if (menuOpen) {
      setMenuOpen(false);
      return;
    }

    const bubble = event.currentTarget.getBoundingClientRect();
    setMenuPosition({ top: bubble.bottom + 8, left: bubble.right - 224 });
    setMenuOpen(true);
  };

  return (
    <div
      id={`message-${message._id}`}
      onClick={selectionMode ? onToggleSelection : undefined}
      className={`chat ${isMine ? 'chat-end' : 'chat-start'} px-4 relative transition-all duration-150 ${
        isSameSenderAsPrev ? 'mt-0.5' : 'mt-2.5'
      } ${selectionMode ? 'cursor-pointer' : ''} ${isSelected ? 'rounded-lg bg-primary/10' : ''}`}
    >
      {selectionMode && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleSelection();
          }}
          className="self-center text-primary"
          aria-label={t(isSelected ? 'Deselect message' : 'Select message')}
        >
          {isSelected ? <CheckCircle2 size={21} /> : <Circle size={21} />}
        </button>
      )}
      {/* Avatar — only render on the last message of consecutive group */}
      <div className="chat-image h-8 w-8 shrink-0 overflow-hidden rounded-full self-end flex items-center justify-center">
        {isSameSenderAsNext ? (
          <div className="h-8 w-8 shrink-0" />
        ) : (
          <Avatar
            src={avatar}
            name={name}
            size="w-8 h-8"
            textSize="text-xs"
            onClick={(event) => {
              if (avatar) {
                event.stopPropagation();
                setShowAvatarImage(true);
              }
            }}
            className={avatar ? 'cursor-zoom-in' : ''}
          />
        )}
      </div>
      {showAvatarImage && avatar && (
        <ImageViewer
          src={avatar}
          alt={t('Profile picture of {name}', { name: name || t('Profile') })}
          closeLabel={t('Close image')}
          onClose={() => setShowAvatarImage(false)}
        />
      )}

      {/* Bubble */}
      <div
        ref={bubbleRef}
        onClick={(event) => {
          if (selectionMode) {
            event.stopPropagation();
            onToggleSelection();
            return;
          }
          toggleMenu(event);
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          if (selectionMode) {
            onToggleSelection();
            return;
          }
          toggleMenu(event);
        }}
        className={`chat-bubble relative max-w-xs sm:max-w-sm md:max-w-md break-words shadow-sm ${
          isMine
            ? `chat-bubble-primary text-primary-content ${isSameSenderAsPrev ? 'rounded-tr-md' : ''} ${isSameSenderAsNext ? 'rounded-br-md' : ''}`
            : `bg-base-300 text-base-content ${isSameSenderAsPrev ? 'rounded-tl-md' : ''} ${isSameSenderAsNext ? 'rounded-bl-md' : ''}`
        }`}
      >
        {menuOpen && createPortal(
          <ul
            ref={menuRef}
            onClick={(event) => event.stopPropagation()}
            style={{
              position: 'fixed',
              top: menuPosition?.top ?? 8,
              left: menuPosition?.left ?? 8,
              maxHeight: 'calc(100vh - 16px)',
              overflowY: 'auto',
              zIndex: 1000,
            }}
            className="menu menu-sm w-56 max-w-[calc(100vw-1rem)] rounded-2xl border border-base-300 bg-base-100 p-2 text-base-content shadow-2xl backdrop-blur-md"
          >
              {!message.deletedAt && <>
                <li className="p-1 mb-1.5 border-b border-base-300/80">
                  <div className="flex items-center justify-between gap-1 w-full p-0.5 hover:bg-transparent">
                    {QUICK_REACTIONS.map((emoji) => {
                      const hasReacted = Boolean(reactionGroups[emoji]?.hasMine);
                      return (
                        <button
                          key={emoji}
                          type="button"
                          disabled={isBusy}
                          onClick={() => {
                            handleToggleReaction(emoji);
                            closeMenu();
                          }}
                          className={`h-8 w-8 flex items-center justify-center text-lg rounded-full transition-transform hover:scale-130 active:scale-90 ${
                            hasReacted ? 'bg-primary/20 scale-110 ring-2 ring-primary/40' : 'hover:bg-base-200'
                          }`}
                          title={hasReacted ? t('Remove {emoji}', { emoji }) : emoji}
                        >
                          {emoji}
                        </button>
                      );
                    })}
                  </div>
                </li>
                <li><button onClick={() => window.alert(t('Message sent {time}{edited}.', { time: formatMsgTime(message.createdAt, language), edited: message.editedAt ? t(' and edited') : '' }))}><Info size={17} /> {t('Message info')}</button></li>
                <li><button onClick={() => { onReply(message); closeMenu(); }}><Reply size={17} /> {t('Reply')}</button></li>
                <li><button onClick={async () => { if (!message.text) return; await navigator.clipboard.writeText(message.text); toast.success(t('Message copied')); }}><Copy size={17} /> {t('Copy')}</button></li>
                <li><button onClick={() => { setShowForwardPicker(true); closeMenu(); }}><Forward size={17} /> {t('Forward')}</button></li>
                <li>
                  <button
                    disabled={isBusy}
                    onClick={async () => {
                      if (isPinned) {
                        setIsBusy(true);
                        try {
                          await togglePinMessage(message._id, false);
                          closeMenu();
                        } finally {
                          setIsBusy(false);
                        }
                      } else {
                        setShowPinDurationPicker(true);
                        closeMenu();
                      }
                    }}
                  >
                    <Pin size={17} /> {t(isPinned ? 'Unpin' : 'Pin')}
                  </button>
                </li>
                <li><button disabled={isBusy} onClick={async () => { setIsBusy(true); try { await toggleStarMessage(message._id, !message.isStarred); closeMenu(); } finally { setIsBusy(false); } }}><Star size={17} className={message.isStarred ? 'fill-warning text-warning' : ''} /> {t(message.isStarred ? 'Unstar' : 'Star')}</button></li>
                <li className="my-1 border-t border-base-300" />
                <li>
                  <button
                    disabled={!canEdit || isBusy}
                    title={t(canEdit ? 'Edit message' : 'Only text messages can be edited within 15 minutes')}
                    className={canEdit ? 'text-base-content hover:bg-base-300' : 'cursor-not-allowed text-base-content/50'}
                    onClick={() => {
                      setEditedText(message.text);
                      setIsEditing(true);
                      setMenuOpen(false);
                    }}
                  >
                    <Pencil size={14} /> {t(canEdit ? 'Edit' : 'Edit unavailable')}
                  </button>
                </li>
                <li><button onClick={() => { onStartSelection(); closeMenu(); }}><CheckSquare size={17} /> {t('Select')}</button></li>
                <li className="my-1 border-t border-base-300" />
              </>}
              <li><button onClick={async () => { if (!window.confirm(t('Delete this message for you?'))) return; setIsBusy(true); try { await deleteMessage(message._id, 'me'); setMenuOpen(false); } finally { setIsBusy(false); } }}><Trash2 size={17} /> {t('Delete for me')}</button></li>
              {!message.deletedAt && canDelete && <li><button className="text-error hover:bg-error/10" onClick={async () => { if (!window.confirm(t('Delete this message for everyone?'))) return; setIsBusy(true); try { await deleteMessage(message._id, 'everyone'); setMenuOpen(false); } finally { setIsBusy(false); } }}><Trash2 size={17} /> {t('Delete for everyone')}</button></li>}
          </ul>,
          document.body
        )}

        {!message.deletedAt && message.replyTo && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (message.replyTo._id) jumpToMessage(message.replyTo._id);
            }}
            className="mb-2 block w-full rounded border-l-2 border-primary bg-base-100/20 px-2 py-1 text-left text-xs"
          >
            <span className="block font-semibold opacity-80">{replySender}</span>
            <span className="block truncate opacity-70">
              {message.replyTo.deletedAt ? t('Message deleted') : message.replyTo.text || message.replyTo.documentName || (message.replyTo.image ? t('Photo') : message.replyTo.video ? t('Video') : message.replyTo.audio ? `🎤 ${t('Voice message')}` : t('Attachment'))}
            </span>
          </button>
        )}

        {!message.deletedAt && message.isForwarded && (
          <p className="mb-1 flex items-center gap-1 text-xs italic opacity-60"><Forward size={12} /> {t('Forwarded')}</p>
        )}
        {!message.deletedAt && isPinned && (
          <p className="mb-1 flex items-center gap-1 text-xs opacity-60"><Pin size={12} /> {t('Pinned')}</p>
        )}

        {message.deletedAt ? (
          <p className="italic opacity-70">{t('Message deleted')}</p>
        ) : isEditing ? (
          <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
            <input value={editedText} onChange={(event) => setEditedText(event.target.value)} className="input input-sm input-bordered w-full text-base-content" autoFocus />
            <button disabled={isBusy || !editedText.trim()} onClick={async () => { setIsBusy(true); try { await editMessage(message._id, editedText); setIsEditing(false); } finally { setIsBusy(false); } }} className="btn btn-success btn-xs btn-square" aria-label={t('Save edit')}><Check size={14} /></button>
            <button disabled={isBusy} onClick={() => setIsEditing(false)} className="btn btn-ghost btn-xs btn-square" aria-label={t('Cancel edit')}><X size={14} /></button>
          </div>
        ) : (
          message.text && <p className="leading-relaxed whitespace-pre-wrap">{renderLinkedText(message.text)}{message.editedAt && <span className="ml-1 text-xs opacity-60">{t('(edited)')}</span>}</p>
        )}

        {/* Image */}
        {!message.deletedAt && message.image && (
          <>
            <img
              src={message.image}
              alt={t('Sent image')}
              onClick={(event) => {
                event.stopPropagation();
                setImgExpanded(true);
              }}
              className={`rounded-lg cursor-pointer object-cover mt-1 ${
                message.text ? 'mt-2' : ''
              } max-w-[240px] max-h-[240px] hover:opacity-90 transition-opacity`}
            />
            {/* Lightbox */}
            {imgExpanded && (
              <dialog
                className="modal modal-open"
                onClick={() => setImgExpanded(false)}
              >
                <div className="modal-box max-w-3xl bg-transparent shadow-none p-0" onClick={(e) => e.stopPropagation()}>
                  <img
                    src={message.image}
                    alt={t('Full size')}
                    className="w-full rounded-xl object-contain max-h-[80vh]"
                  />
                  <button
                    className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 bg-base-200"
                    onClick={() => setImgExpanded(false)}
                    aria-label={t('Close')}
                  >
                    ✕
                  </button>
                </div>
                <form method="dialog" className="modal-backdrop" onClick={() => setImgExpanded(false)}>
                  <button>{t('Close')}</button>
                </form>
              </dialog>
            )}
          </>
        )}

        {!message.deletedAt && message.video && (
          <video
            src={message.video}
            controls
            onClick={(event) => event.stopPropagation()}
            className="mt-2 max-w-[280px] rounded-lg"
          />
        )}
        {!message.deletedAt && message.audio && (
          <div className="mt-2">
            <AudioPlayer
              src={message.audio}
              duration={message.audioDuration}
              isMine={isMine}
            />
          </div>
        )}
        {!message.deletedAt && message.document && (
          <DocumentLink
            messageId={message._id}
            documentName={message.documentName}
            className="mt-2 max-w-[280px] rounded-lg border border-base-content/20 bg-base-100/20 p-2"
          />
        )}

        {/* Reaction badges */}
        {reactionList.length > 0 && !message.deletedAt && (
          <div
            className={`flex flex-wrap gap-1 mt-1.5 pt-1 ${
              isMine ? 'justify-end' : 'justify-start'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {reactionList.map(({ emoji, count, hasMine }) => (
              <button
                key={emoji}
                type="button"
                disabled={isBusy}
                onClick={() => handleToggleReaction(emoji)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border shadow-xs transition-all duration-150 hover:scale-105 active:scale-95 ${
                  hasMine
                    ? isMine
                      ? 'bg-primary-focus/40 text-primary-content border-primary-content/50 font-bold'
                      : 'bg-primary/20 text-primary border-primary/40 font-bold'
                    : isMine
                      ? 'bg-black/20 text-primary-content/90 border-primary-content/20'
                      : 'bg-base-100 text-base-content/80 border-base-300'
                }`}
                title={hasMine ? t('Click to remove reaction') : t('Click to react')}
              >
                <span className="text-sm leading-none">{emoji}</span>
                {count > 1 && <span className="text-[11px] leading-none opacity-90">{count}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {showForwardPicker && createPortal(
        <div className="modal modal-open z-[1100]" role="dialog" aria-modal="true" onClick={() => setShowForwardPicker(false)}>
          <div className="modal-box max-h-[80vh] max-w-sm" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold">{t('Forward message')}</h3>
              <button type="button" onClick={() => setShowForwardPicker(false)} className="btn btn-ghost btn-sm btn-circle" aria-label={t('Close')}>
                <X size={18} />
              </button>
            </div>
            <p className="mb-3 truncate text-sm text-base-content/60">{message.text || message.documentName || (message.image ? t('Photo') : message.video ? t('Video') : message.audio ? `🎤 ${t('Voice message')}` : t('Attachment'))}</p>
            <div className="max-h-[50vh] overflow-y-auto">
              {users.length ? users.map((user) => (
                <button
                  key={user._id}
                  type="button"
                  disabled={isBusy}
                  onClick={() => forwardTo(user._id)}
                  className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-base-300 disabled:opacity-50"
                >
                  <Avatar src={user.profilePic} name={user.fullName} size="h-9 w-9" />
                  <span className="truncate">{user.fullName}</span>
                </button>
              )) : <p className="py-6 text-center text-sm text-base-content/50">{t('No contacts available')}</p>}
            </div>
          </div>
          <button type="button" className="modal-backdrop" onClick={() => setShowForwardPicker(false)} aria-label={t('Close forward dialog')} />
        </div>,
        document.body
      )}

      {showPinDurationPicker && createPortal(
        <div className="modal modal-open z-[1100]" role="dialog" aria-modal="true" aria-labelledby={`pin-duration-title-${message._id}`} onClick={() => setShowPinDurationPicker(false)}>
          <div className="modal-box max-w-sm" onClick={(event) => event.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between">
              <h3 id={`pin-duration-title-${message._id}`} className="text-lg font-bold">{t('Pin message for')}</h3>
              <button type="button" onClick={() => setShowPinDurationPicker(false)} className="btn btn-ghost btn-sm btn-circle" aria-label={t('Close')}>
                <X size={18} />
              </button>
            </div>
            <p className="mb-4 truncate text-sm text-base-content/60">{message.text || message.documentName || (message.image ? t('Photo') : message.video ? t('Video') : message.audio ? `🎤 ${t('Voice message')}` : t('Attachment'))}</p>
            <div className="flex flex-col gap-2">
              {[{ days: 1, label: '24 hours' }, { days: 7, label: '7 days' }, { days: 30, label: '30 days' }].map(({ days, label }) => (
                <button key={days} type="button" disabled={isBusy} onClick={() => setPinDuration(days)} className="btn btn-outline">
                  {t(label)}
                </button>
              ))}
              <button type="button" onClick={() => setShowPinDurationPicker(false)} className="btn btn-ghost">
                {t('Cancel')}
              </button>
            </div>
          </div>
          <button type="button" className="modal-backdrop" onClick={() => setShowPinDurationPicker(false)} aria-label={t('Close pin duration choices')} />
        </div>,
        document.body
      )}

      {/* Timestamp & Status ticks */}
      <div className="chat-footer flex items-center gap-1 opacity-70 text-[11px] mt-0.5">
        <span>{formatMsgTime(message.createdAt, language)}</span>
        {isMine && !message.deletedAt && (
          <span
            className="inline-flex items-center ml-0.5 select-none"
            title={message.read ? t('Read') : message.delivered ? t('Delivered') : t('Sent')}
          >
            {message.read ? (
              <span className="flex items-center text-primary font-bold">
                <Check size={13} className="-mr-1.5" strokeWidth={2.5} />
                <Check size={13} strokeWidth={2.5} />
              </span>
            ) : message.delivered ? (
              <span className="flex items-center text-base-content/60">
                <Check size={13} className="-mr-1.5" strokeWidth={2} />
                <Check size={13} strokeWidth={2} />
              </span>
            ) : (
              <span className="text-base-content/60">
                <Check size={13} strokeWidth={2} />
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
