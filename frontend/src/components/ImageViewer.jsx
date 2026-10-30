import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, Forward, Reply, X } from 'lucide-react';
import { useTranslation } from '../lib/i18n.js';

export default function ImageViewer({
  src,
  alt,
  closeLabel,
  onClose,
  onReply,
  onForward,
  onDownload,
  title,
  timestamp,
}) {
  const { t } = useTranslation();

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  const hasToolbar = Boolean(title || timestamp || onReply || onForward || onDownload);

  return createPortal(
    <div
      className="fixed inset-0 z-[1200] flex flex-col bg-black/95 backdrop-blur-md animate-in fade-in duration-150 select-none"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={onClose}
    >
      {/* Top Header Toolbar if props provided */}
      {hasToolbar ? (
        <div
          className="flex items-center justify-between px-4 py-3 bg-black/50 text-white border-b border-white/10 shrink-0 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {title && (
              <span className="text-sm font-semibold text-white/90 truncate">
                {title}
              </span>
            )}
            {timestamp && (
              <span className="text-xs text-white/60 shrink-0">
                · {timestamp}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onReply && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onReply();
                  onClose();
                }}
                className="btn btn-sm btn-outline text-white hover:bg-white/20 border-white/30 gap-1.5 h-9 min-h-0 px-2.5 sm:px-3"
                title={t('Reply')}
                aria-label={t('Reply')}
              >
                <Reply size={15} />
                <span className="hidden sm:inline">{t('Reply')}</span>
              </button>
            )}
            {onForward && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onForward();
                }}
                className="btn btn-sm btn-outline text-white hover:bg-white/20 border-white/30 gap-1.5 h-9 min-h-0 px-2.5 sm:px-3"
                title={t('Forward')}
                aria-label={t('Forward')}
              >
                <Forward size={15} />
                <span className="hidden sm:inline">{t('Forward')}</span>
              </button>
            )}
            {onDownload && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload(e);
                }}
                className="btn btn-sm btn-primary gap-1.5 h-9 min-h-0 px-2.5 sm:px-3"
                title={t('Download')}
                aria-label={t('Download')}
              >
                <Download size={15} />
                <span className="hidden sm:inline">{t('Download')}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="btn btn-sm btn-circle btn-ghost text-white hover:bg-white/20 h-9 w-9 min-h-0"
              aria-label={closeLabel || t('Close')}
            >
              <X size={19} />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onClose}
          className="btn btn-circle btn-ghost absolute right-3 top-3 text-white z-10 hover:bg-white/20"
          aria-label={closeLabel || t('Close')}
        >
          <X size={22} />
        </button>
      )}

      {/* Main Image Viewport */}
      <div
        className="flex-1 min-h-0 p-4 flex items-center justify-center overflow-auto"
        onClick={onClose}
      >
        <img
          src={src}
          alt={alt}
          onClick={(event) => event.stopPropagation()}
          className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
        />
      </div>
    </div>,
    document.body
  );
}
