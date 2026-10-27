import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatMsgTime } from '../lib/utils.js';
import toast from 'react-hot-toast';
import api from '../lib/axios.js';
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
  Download,
  Play,
  FileText,
  Mic,
  Camera,
  Video,
} from 'lucide-react';
import ImageViewer from './ImageViewer.jsx';
import DocumentLink from './DocumentLink.jsx';
import AudioPlayer from './AudioPlayer.jsx';
import Avatar from './Avatar.jsx';
import { useTranslation } from '../lib/i18n.js';

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
  isHighlighted = false,
}) {
  const { language, t } = useTranslation();
  const isMine = String(message.senderId) === String(authUser?._id);
  const [imgExpanded, setImgExpanded] = useState(false);
  const [showAvatarImage, setShowAvatarImage] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(message.text || '');
  const [isBusy, setIsBusy] = useState(false);
  const [downloadingType, setDownloadingType] = useState(null);
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

  const replySenderUser = users.find((u) => String(u._id) === String(message.replyTo?.senderId));
  const replySender = message.replyTo?.senderId
    ? (String(message.replyTo.senderId) === String(authUser?._id)
        ? t('You')
        : (replySenderUser?.fullName || otherUser?.fullName || t('Contact')))
    : t('Message');

  const isPinned = Boolean(
    message.pinnedAt &&
    (!message.pinnedUntil || new Date(message.pinnedUntil).getTime() > Date.now())
  );
  const closeMenu = () => setMenuOpen(false);

  const handleDownloadMedia = async (type = 'image', event) => {
    if (event) event.stopPropagation();
    const mediaUrl = type === 'image' ? message.image : message.video;
    if (!mediaUrl || downloadingType) return;

    setDownloadingType(type);
    const toastId = toast.loading(t(`Downloading ${type}...`));

    try {
      // 1. Client-side blob fetch
      const res = await fetch(mediaUrl, { mode: 'cors' });
      if (!res.ok) throw new Error('CORS or network error');
      const blob = await res.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      const ext = type === 'image' ? (mediaUrl.split('.').pop()?.split(/[?#]/)[0] || 'jpg') : 'mp4';
      link.download = `talksy_${type}_${message._id}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
      toast.success(t(`${type === 'image' ? 'Image' : 'Video'} downloaded`), { id: toastId });
    } catch {
      // 2. Fallback to authenticated backend proxy endpoint
      try {
        const proxyRes = await api.get(`/messages/${message._id}/download?type=${type}`, {
          responseType: 'blob',
        });
        const blob = new Blob([proxyRes.data]);
        const objectUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        const ext = type === 'image' ? 'jpg' : 'mp4';
        link.download = `talksy_${type}_${message._id}.${ext}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(objectUrl);
        toast.success(t(`${type === 'image' ? 'Image' : 'Video'} downloaded`), { id: toastId });
      } catch (proxyErr) {
        console.error('Download error:', proxyErr);
        // Fallback: open rawUrl in new tab
        window.open(mediaUrl, '_blank');
        toast.error(t('Unable to download automatically. Opened media in new tab.'), { id: toastId });
      }
    } finally {
      setDownloadingType(null);
    }
  };

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
      className={`group chat ${isMine ? 'chat-end' : 'chat-start'} px-4 relative transition-all duration-200 ${
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

      {/* Quick reply hover button for desktop */}
      {!selectionMode && !message.deletedAt && onReply && (
        <div
          className={`absolute top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10 ${
            isMine ? 'left-2 -translate-x-full' : 'right-2 translate-x-full'
          }`}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReply(message);
            }}
            className="btn btn-circle btn-xs bg-base-100 hover:bg-base-200 text-base-content border border-base-300 shadow-md transition-transform hover:scale-110 active:scale-95"
            title={t('Reply')}
            aria-label={t('Reply')}
          >
            <Reply size={13} />
          </button>
        </div>
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
        className={`chat-bubble relative max-w-xs sm:max-w-sm md:max-w-md break-words shadow-sm transition-all duration-300 ${
          isMine
            ? `chat-bubble-primary text-primary-content ${isSameSenderAsPrev ? 'rounded-tr-md' : ''} ${isSameSenderAsNext ? 'rounded-br-md' : ''}`
            : `bg-base-300 text-base-content ${isSameSenderAsPrev ? 'rounded-tl-md' : ''} ${isSameSenderAsNext ? 'rounded-bl-md' : ''}`
        } ${
          isHighlighted ? 'ring-4 ring-primary ring-offset-2 ring-offset-base-100 shadow-xl scale-[1.02]' : ''
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
                {message.image && (
                  <li>
                    <button onClick={(e) => { handleDownloadMedia('image', e); closeMenu(); }}>
                      <Download size={17} /> {t('Download image')}
                    </button>
                  </li>
                )}
                {message.video && (
                  <li>
                    <button onClick={(e) => { handleDownloadMedia('video', e); closeMenu(); }}>
                      <Download size={17} /> {t('Download video')}
                    </button>
                  </li>
                )}
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

        {/* Quoted Reply Banner */}
        {!message.deletedAt && message.replyTo && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (message.replyTo._id) jumpToMessage(message.replyTo._id);
            }}
            className="mb-2.5 flex items-center justify-between gap-2.5 w-full rounded-lg border-l-4 border-primary bg-black/10 dark:bg-white/10 p-2 text-left text-xs transition-colors hover:bg-black/15 dark:hover:bg-white/15 cursor-pointer"
          >
            <div className="min-w-0 flex-1">
              <span className="block font-semibold opacity-90 text-[11px] text-primary">{replySender}</span>
              <span className="block truncate opacity-75 text-[11px]">
                {message.replyTo.deletedAt
                  ? t('Message deleted')
                  : message.replyTo.text ||
                    message.replyTo.documentName ||
                    (message.replyTo.image
                      ? `📷 ${t('Photo')}`
                      : message.replyTo.video
                      ? `🎥 ${t('Video')}`
                      : message.replyTo.audio
                      ? `🎤 ${t('Voice message')}`
                      : t('Attachment'))}
              </span>
            </div>
            {message.replyTo.image && (
              <img
                src={message.replyTo.image}
                alt={t('Quoted photo')}
                className="w-10 h-10 rounded-md object-cover shrink-0 border border-base-content/10 shadow-xs"
              />
            )}
            {message.replyTo.video && (
              <div className="w-10 h-10 rounded-md bg-black/40 flex items-center justify-center shrink-0 border border-base-content/10 shadow-xs">
                <Play size={14} className="text-white fill-white" />
              </div>
            )}
            {message.replyTo.audio && (
              <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center shrink-0 text-primary">
                <Mic size={15} />
              </div>
            )}
            {message.replyTo.document && (
              <div className="w-10 h-10 rounded-md bg-base-100/50 flex items-center justify-center shrink-0 text-base-content/70">
                <FileText size={15} />
              </div>
            )}
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
          <div className="relative group/media mt-1.5 rounded-xl overflow-hidden border border-black/10 dark:border-white/10 shadow-sm max-w-[260px] sm:max-w-[300px]">
            <img
              src={message.image}
              alt={t('Sent image')}
              onClick={(event) => {
                event.stopPropagation();
                setImgExpanded(true);
              }}
              className="w-full max-h-[280px] object-cover cursor-pointer transition-transform duration-200 group-hover/media:scale-[1.02]"
              loading="lazy"
            />
            {/* Quick Action Overlay on Image */}
            <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/75 via-black/35 to-transparent flex items-center justify-between opacity-95 transition-opacity duration-150">
              <span className="text-[11px] text-white/90 font-medium px-1 flex items-center gap-1">
                <Camera size={12} /> {t('Photo')}
              </span>
              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => onReply(message)}
                  className="btn btn-circle btn-xs bg-black/60 hover:bg-black/90 text-white border-none shadow transition-transform hover:scale-110 active:scale-95"
                  title={t('Reply to this image')}
                  aria-label={t('Reply to this image')}
                >
                  <Reply size={13} />
                </button>
                <button
                  type="button"
                  disabled={downloadingType === 'image'}
                  onClick={(e) => handleDownloadMedia('image', e)}
                  className="btn btn-circle btn-xs bg-black/60 hover:bg-black/90 text-white border-none shadow transition-transform hover:scale-110 active:scale-95"
                  title={t('Download image')}
                  aria-label={t('Download image')}
                >
                  <Download size={13} />
                </button>
              </div>
            </div>

            {/* Full size Lightbox Modal with Reply & Download */}
            {imgExpanded && (
              <dialog
                className="modal modal-open z-[1200]"
                onClick={() => setImgExpanded(false)}
              >
                <div
                  className="modal-box max-w-4xl bg-neutral text-neutral-content p-4 rounded-2xl flex flex-col items-center gap-3 shadow-2xl border border-white/10"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Lightbox Toolbar */}
                  <div className="w-full flex items-center justify-between pb-2 border-b border-white/10">
                    <span className="text-sm font-medium text-white/80">
                      {t('Photo')} · {formatMsgTime(message.createdAt, language)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onReply(message);
                          setImgExpanded(false);
                        }}
                        className="btn btn-sm btn-outline text-white hover:bg-white/20 border-white/30 gap-1.5"
                      >
                        <Reply size={15} />
                        <span>{t('Reply')}</span>
                      </button>
                      <button
                        type="button"
                        disabled={downloadingType === 'image'}
                        onClick={(e) => handleDownloadMedia('image', e)}
                        className="btn btn-sm btn-primary gap-1.5"
                      >
                        <Download size={15} />
                        <span>{t('Download')}</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-circle btn-ghost text-white hover:bg-white/20"
                        onClick={() => setImgExpanded(false)}
                        aria-label={t('Close')}
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>

                  <img
                    src={message.image}
                    alt={t('Full size')}
                    className="max-h-[75vh] w-auto max-w-full rounded-lg object-contain shadow-md"
                  />
                </div>
                <form method="dialog" className="modal-backdrop bg-black/75" onClick={() => setImgExpanded(false)}>
                  <button>{t('Close')}</button>
                </form>
              </dialog>
            )}
          </div>
        )}

        {/* Video */}
        {!message.deletedAt && message.video && (
          <div className="mt-2 max-w-[280px] sm:max-w-[320px] rounded-xl overflow-hidden border border-black/10 dark:border-white/10 bg-black/30 shadow-sm">
            <video
              src={message.video}
              controls
              preload="metadata"
              onClick={(event) => event.stopPropagation()}
              className="w-full max-h-[300px] rounded-t-xl bg-black"
            />
            {/* Video toolbar with Reply & Download */}
            <div
              className="flex items-center justify-between px-2.5 py-1.5 bg-black/50 text-white backdrop-blur-xs text-xs"
              onClick={(event) => event.stopPropagation()}
            >
              <span className="flex items-center gap-1.5 opacity-85 text-[11px] font-medium">
                <Video size={13} /> {t('Video')}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onReply(message)}
                  className="btn btn-ghost btn-xs text-white hover:bg-white/20 gap-1 px-2 h-7 min-h-0"
                  title={t('Reply to this video')}
                >
                  <Reply size={13} />
                  <span>{t('Reply')}</span>
                </button>
                <button
                  type="button"
                  disabled={downloadingType === 'video'}
                  onClick={(e) => handleDownloadMedia('video', e)}
                  className="btn btn-ghost btn-xs text-white hover:bg-white/20 gap-1 px-2 h-7 min-h-0"
                  title={t('Download video')}
                >
                  <Download size={13} />
                  <span>{t('Download')}</span>
                </button>
              </div>
            </div>
          </div>
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
          message.messageRequestStatus === 'pending' ? (
            <span className="text-warning text-[10px] font-medium ml-1">
              · {t('Request pending')}
            </span>
          ) : (
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
          )
        )}
      </div>
    </div>
  );
}
