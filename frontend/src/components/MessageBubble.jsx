import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatMsgTime } from '../lib/utils.js';
import toast from 'react-hot-toast';
import {
  Check,
  CheckSquare,
  Copy,
  FileText,
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

function InitialsAvatar({ name, size = 'w-8 h-8' }) {
  const initials = name
    ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';
  return (
    <div
      className={`${size} rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-xs select-none shrink-0`}
    >
      {initials}
    </div>
  );
}

export default function MessageBubble({
  message,
  authUser,
  users = [],
  editMessage,
  deleteMessage,
  toggleStarMessage,
  togglePinMessage,
  forwardMessage,
  onReply,
  jumpToMessage,
  selectionMode = false,
  isSelected = false,
  onToggleSelection,
  onStartSelection,
}) {
  const { language, t } = useTranslation();
  const isMine = String(message.senderId) === String(authUser?._id);
  const [imgExpanded, setImgExpanded] = useState(false);
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

  const avatar = isMine ? authUser?.profilePic : null; // Receiver avatar not passed here — shown in sidebar
  const name = isMine ? authUser?.fullName : undefined;
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
    setMenuPosition({ top: bubble.bottom + 8, left: bubble.right - 208 });
    setMenuOpen(true);
  };

  return (
    <div
      id={`message-${message._id}`}
      onClick={selectionMode ? onToggleSelection : undefined}
      className={`chat ${isMine ? 'chat-end' : 'chat-start'} px-4 ${selectionMode ? 'cursor-pointer' : ''} ${isSelected ? 'rounded-lg bg-primary/10' : ''}`}
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
      {/* Avatar */}
      <div className="chat-image avatar">
        {avatar ? (
          <div className="w-8 h-8 rounded-full overflow-hidden">
            <img src={avatar} alt={name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <InitialsAvatar name={name} />
        )}
      </div>

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
        className={`chat-bubble relative max-w-xs sm:max-w-sm md:max-w-md break-words ${
          isMine
            ? 'chat-bubble-primary text-primary-content'
            : 'bg-base-300 text-base-content'
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
            className="menu menu-sm w-52 max-w-[calc(100vw-1rem)] rounded-box border border-base-300 bg-base-100 p-2 text-base-content shadow-xl"
          >
              {!message.deletedAt && <>
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
              {message.replyTo.deletedAt ? t('Message deleted') : message.replyTo.text || message.replyTo.documentName || (message.replyTo.image ? t('Photo') : message.replyTo.video ? t('Video') : t('Attachment'))}
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
          message.text && <p className="leading-relaxed whitespace-pre-wrap">{message.text}{message.editedAt && <span className="ml-1 text-xs opacity-60">{t('(edited)')}</span>}</p>
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
        {!message.deletedAt && message.document && (
          <a
            href={message.document}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="mt-2 flex max-w-[280px] items-center gap-2 rounded-lg border border-base-content/20 bg-base-100/20 p-3"
          >
            <FileText size={20} className="shrink-0" />
            <span className="truncate text-sm">{message.documentName}</span>
          </a>
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
            <p className="mb-3 truncate text-sm text-base-content/60">{message.text || message.documentName || (message.image ? t('Photo') : message.video ? t('Video') : t('Attachment'))}</p>
            <div className="max-h-[50vh] overflow-y-auto">
              {users.length ? users.map((user) => (
                <button
                  key={user._id}
                  type="button"
                  disabled={isBusy}
                  onClick={() => forwardTo(user._id)}
                  className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-base-300 disabled:opacity-50"
                >
                  {user.profilePic ? (
                    <img src={user.profilePic} alt="" className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <InitialsAvatar name={user.fullName} />
                  )}
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
            <p className="mb-4 truncate text-sm text-base-content/60">{message.text || message.documentName || (message.image ? t('Photo') : message.video ? t('Video') : t('Attachment'))}</p>
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

      {/* Timestamp */}
      <div className="chat-footer opacity-50 text-xs mt-0.5">
        {formatMsgTime(message.createdAt, language)}
      </div>
    </div>
  );
}
