import { useEffect, useState, useRef, useCallback } from 'react';
import { FileText, Paperclip, Send, Smile, X, Mic, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useChatStore } from '../store/useChatStore.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { useTranslation } from '../lib/i18n.js';
import EmojiPicker from './EmojiPicker.jsx';

const MAX_IMAGE_VIDEO_SIZE = 10 * 1024 * 1024;
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;

export default function ChatInput({ replyTarget, onCancelReply }) {
  const { selectedUser, sendMessage, sendTypingStart, sendTypingStop } = useChatStore();
  const { authUser } = useAuthStore();
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState(null); // { data, type }
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const shouldRefocusAfterSend = useRef(false);
  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (selectedUser?._id) sendTypingStop(selectedUser._id);
    };
  }, [selectedUser?._id, sendTypingStop]);

  useEffect(() => {
    if (replyTarget) textareaRef.current?.focus();
  }, [replyTarget]);

  useEffect(() => {
    if (!isSending && shouldRefocusAfterSend.current) {
      shouldRefocusAfterSend.current = false;
      textareaRef.current?.focus();
    }
  }, [isSending]);

  const processFile = (file) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const supportedDocuments = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'zip'];
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isDocument = supportedDocuments.includes(extension);
    if (!isImage && !isVideo && !isDocument) {
      toast.error(t('Choose an image, video, or supported document'));
      return;
    }
    const maxFileSize = isDocument ? MAX_DOCUMENT_SIZE : MAX_IMAGE_VIDEO_SIZE;
    if (file.size > maxFileSize) {
      toast.error(t(isDocument
        ? 'Documents must be 10 MB or smaller.'
        : 'Images and videos must be 10 MB or smaller.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        toast.error(t('Unable to read this file.'));
        return;
      }
      const data = extension === 'pdf'
        ? reader.result.replace(/^data:[^;]+;/, 'data:application/pdf;')
        : reader.result;
      setAttachment({ data, type: file.type || (extension === 'pdf' ? 'application/pdf' : 'application/octet-stream'), name: file.name });
    };
    reader.onerror = () => toast.error(t('Unable to read this file.'));
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) processFile(file);
        e.preventDefault();
        break;
      }
    }
  }, []);

  const handleTextareaChange = (e) => {
    const val = e.target.value;
    setText(val);
    // Auto-resize
    const el = e.target;
    el.style.height = 'auto';
    const newHeight = Math.min(el.scrollHeight, 120);
    el.style.height = `${newHeight}px`;
    el.style.overflowY = el.scrollHeight > 120 ? 'auto' : 'hidden';

    if (selectedUser?._id) {
      if (!val.trim()) {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        sendTypingStop(selectedUser._id);
      } else {
        sendTypingStart(selectedUser._id);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          sendTypingStop(selectedUser._id);
        }, 1500);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleEmojiSelect = (emoji) => {
    const el = textareaRef.current;
    if (!el) {
      setText((prev) => prev + emoji);
      return;
    }
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const newText = text.slice(0, start) + emoji + text.slice(end);
    setText(newText);
    setTimeout(() => {
      el.focus();
      const newCursorPos = start + emoji.length;
      el.setSelectionRange(newCursorPos, newCursorPos);
      el.style.height = 'auto';
      const newHeight = Math.min(el.scrollHeight, 120);
      el.style.height = `${newHeight}px`;
      el.style.overflowY = el.scrollHeight > 120 ? 'auto' : 'hidden';
    }, 0);
  };

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed && !attachment) return;
    if (!selectedUser) return;

    setShowEmojiPicker(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    sendTypingStop(selectedUser._id);

    setIsSending(true);
    try {
      await sendMessage(selectedUser._id, {
        text: trimmed || undefined,
        image: attachment?.type.startsWith('image/') ? attachment.data : undefined,
        video: attachment?.type.startsWith('video/') ? attachment.data : undefined,
        document: attachment && !attachment.type.startsWith('image/') && !attachment.type.startsWith('video/')
          ? attachment.data
          : undefined,
        documentName: attachment && !attachment.type.startsWith('image/') && !attachment.type.startsWith('video/')
          ? attachment.name
          : undefined,
        replyTo: replyTarget?._id,
      });
      setText('');
      setAttachment(null);
      onCancelReply();
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.overflowY = 'hidden';
      }
    } catch {
      // Error toast handled by store
    } finally {
      shouldRefocusAfterSend.current = true;
      setIsSending(false);
    }
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error(t('Voice recording is not supported in this browser.'));
      return;
    }
    setShowEmojiPicker(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ].find((type) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) || '';

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.start(200);
      setIsRecording(true);
      setRecordingDuration(0);

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      if (selectedUser?._id) {
        sendTypingStart(selectedUser._id);
      }
    } catch (err) {
      console.error('Microphone error:', err);
      if (typeof window !== 'undefined' && window.isSecureContext === false) {
        toast.error(t('Voice recording requires a secure connection (HTTPS or localhost).'), { duration: 6000 });
      } else if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        toast.error(t('Microphone permission blocked. Click the lock/site icon in your browser address bar to allow microphone.'), { duration: 6000 });
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        toast.error(t('No microphone found on your device.'), { duration: 5000 });
      } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
        toast.error(t('Microphone is in use by another application.'), { duration: 5000 });
      } else {
        toast.error(t('Microphone access was denied or is unavailable. Please check your browser permissions.'), { duration: 5000 });
      }
    }
  };

  const cancelRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingDuration(0);
    if (selectedUser?._id) {
      sendTypingStop(selectedUser._id);
    }
  };

  const stopAndSendRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    const durationToSend = recordingDuration;

    recorder.onstop = () => {
      const mimeType = recorder.mimeType || 'audio/webm';
      const cleanMime = mimeType.split(';')[0] || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: cleanMime });

      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
      }
      audioChunksRef.current = [];
      setIsRecording(false);
      setRecordingDuration(0);

      if (selectedUser?._id) {
        sendTypingStop(selectedUser._id);
      }

      if (durationToSend < 1) {
        toast.error(t('Voice note is too short.'));
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        let base64Data = reader.result;
        if (!base64Data || typeof base64Data !== 'string') {
          toast.error(t('Failed to process recorded audio.'));
          return;
        }

        // Clean any codec parameters in data URI for Cloudinary compatibility
        if (base64Data.startsWith('data:audio/')) {
          base64Data = base64Data.replace(/^data:audio\/[^;]+(;[^;]+)*;base64,/, (header) => {
            const match = header.match(/^data:(audio\/[^;]+)/);
            return match ? `data:${match[1]};base64,` : header;
          });
        }

        setIsSending(true);
        try {
          await sendMessage(selectedUser._id, {
            audio: base64Data,
            audioDuration: durationToSend,
            replyTo: replyTarget?._id,
          });
          onCancelReply();
        } catch {
          // Toast handled by store
        } finally {
          setIsSending(false);
        }
      };
      reader.readAsDataURL(audioBlob);
    };

    recorder.stop();
  };

  const canSend = (text.trim().length > 0 || attachment !== null) && !isSending;

  return (
    <div className="chat-composer relative shrink-0 border-t border-base-300 bg-base-200/85 backdrop-blur-md px-3 py-3 sm:px-4">
      {/* Emoji picker popup */}
      {showEmojiPicker && (
        <div className="absolute bottom-full mb-2 left-3 sm:left-4 z-50">
          <EmojiPicker
            onSelect={handleEmojiSelect}
            onClose={() => setShowEmojiPicker(false)}
          />
        </div>
      )}

      {/* Attachment preview */}
      {attachment && (
        <div className="relative inline-block mb-3">
          {attachment.type.startsWith('video/') ? (
            <video src={attachment.data} controls className="max-h-32 rounded-lg border border-base-300" />
          ) : attachment.type.startsWith('image/') ? (
            <img
              src={attachment.data}
              alt={t('Preview')}
              className="max-h-32 rounded-lg border border-base-300 shadow-md object-contain"
            />
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-base-300 bg-base-100 p-3 pr-9">
              <FileText size={20} className="text-primary" />
              <span className="max-w-xs truncate text-sm">{attachment.name}</span>
            </div>
          )}
          <button
            onClick={() => setAttachment(null)}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-error text-error-content flex items-center justify-center shadow hover:scale-110 transition-transform"
            aria-label={t('Remove attachment')}
          >
            <X size={12} />
          </button>
        </div>
      )}

      {replyTarget && (
        <div className="mb-3 flex items-center gap-3 rounded-lg border-l-4 border-primary bg-base-100 px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-primary">
              {t('Replying to {name}', { name: String(replyTarget.senderId) === String(authUser?._id) ? t('yourself') : selectedUser.fullName })}
            </p>
            <p className="truncate text-sm text-base-content/70">
              {replyTarget.deletedAt ? t('Message deleted') : replyTarget.text || replyTarget.documentName || (replyTarget.image ? t('Photo') : replyTarget.video ? t('Video') : t('Attachment'))}
            </p>
          </div>
          <button type="button" onClick={onCancelReply} className="btn btn-ghost btn-xs btn-circle" aria-label={t('Cancel reply')}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Voice recording active bar */}
      {isRecording ? (
        <div className="flex items-center justify-between gap-3 bg-base-100 rounded-2xl px-4 py-2 border border-error/40 shadow-inner animate-in fade-in duration-150">
          <div className="flex items-center gap-3">
            {/* Pulsing red record indicator */}
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-error"></span>
            </span>

            {/* Recording timer */}
            <span className="font-mono text-sm font-semibold tracking-wider text-error">
              {Math.floor(recordingDuration / 60)}:{recordingDuration % 60 < 10 ? '0' : ''}{recordingDuration % 60}
            </span>

            {/* Animated sound wave bars */}
            <div className="hidden sm:flex items-center gap-1 h-5">
              {[10, 18, 8, 22, 14, 26, 12, 18, 20, 14, 18, 8].map((h, i) => (
                <span
                  key={i}
                  style={{ height: `${h}px` }}
                  className="w-1 bg-error/70 rounded-full animate-pulse"
                />
              ))}
            </div>

            <span className="text-xs text-base-content/60 hidden md:inline italic">
              {t('Recording voice note…')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Cancel/Discard button */}
            <button
              type="button"
              onClick={cancelRecording}
              className="btn btn-ghost btn-circle btn-sm text-error hover:bg-error/15"
              aria-label={t('Cancel recording')}
              title={t('Cancel recording')}
            >
              <Trash2 size={18} />
            </button>

            {/* Send voice note button */}
            <button
              type="button"
              onClick={stopAndSendRecording}
              disabled={isSending}
              className="btn btn-primary btn-circle btn-sm shadow-md"
              aria-label={t('Send voice message')}
              title={t('Send voice message')}
            >
              {isSending ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <Send size={15} />
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Regular input row */
        <div className="flex items-end gap-2">
          {/* File attach */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`btn btn-ghost btn-sm btn-circle min-h-11 min-w-11 shrink-0 mb-0.5 ${
              attachment ? 'text-primary' : 'text-base-content/50'
            } hover:text-base-content`}
            aria-label={t('Attach file')}
          >
            <Paperclip size={20} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Emoji picker button */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            className={`btn btn-ghost btn-sm btn-circle min-h-11 min-w-11 shrink-0 mb-0.5 ${
              showEmojiPicker ? 'text-primary bg-primary/10' : 'text-base-content/50'
            } hover:text-base-content`}
            aria-label={t('Insert emoji')}
          >
            <Smile size={20} />
          </button>

          {/* Textarea */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={t('Type a message…')}
              rows={1}
              className="chat-input-textarea textarea textarea-bordered w-full resize-none overflow-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden bg-base-100 focus:outline-none focus:border-primary transition-colors leading-relaxed pr-3"
              style={{ minHeight: '2.5rem', maxHeight: '7.5rem' }}
              disabled={isSending}
            />
          </div>

          {/* Action button: Send if text/attachment, or Mic if empty */}
          {canSend ? (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={handleSubmit}
              className="btn btn-primary btn-sm btn-circle min-h-11 min-w-11 shrink-0 mb-0.5 transition-all shadow-sm"
              aria-label={t('Send message')}
            >
              {isSending ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <Send size={16} />
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              disabled={isSending}
              className="btn btn-primary btn-sm btn-circle min-h-11 min-w-11 shrink-0 mb-0.5 transition-all shadow-sm hover:scale-105 active:scale-95"
              aria-label={t('Record voice note')}
              title={t('Record voice note')}
            >
              <Mic size={18} />
            </button>
          )}
        </div>
      )}

      <p className="mt-1.5 ml-10 hidden text-xs text-base-content/30 sm:block">
        {t('Shift + Enter for new line · Paste images from clipboard')}
      </p>
    </div>
  );
}
