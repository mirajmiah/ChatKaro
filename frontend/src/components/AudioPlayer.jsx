import { useState, useRef, useEffect, useMemo } from 'react';
import { Play, Pause, AlertCircle } from 'lucide-react';
import { useTranslation } from '../lib/i18n.js';

// Pre-generated seed heights for consistent, natural-looking audio waveform
const WAVEFORM_BARS = [
  8, 14, 20, 12, 18, 24, 16, 28, 22, 14, 18, 26, 30, 20, 16, 22,
  28, 18, 12, 24, 20, 16, 12, 18, 24, 16, 20, 14, 10, 16, 12, 8,
];

function formatTime(seconds) {
  if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function AudioPlayer({ src, duration: propDuration, isMine = false }) {
  const { t } = useTranslation();
  const audioRef = useRef(null);
  const waveformRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(propDuration || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setHasError(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (propDuration) {
      setDuration(propDuration);
    }
  }, [src, propDuration]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(Math.round(audio.duration));
      }
    };
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const handleError = () => {
      setHasError(true);
      setIsPlaying(false);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  const togglePlay = (e) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      // Pause any other playing audios on the page
      document.querySelectorAll('audio').forEach((el) => {
        if (el !== audio) el.pause();
      });
      audio.play().catch(() => setHasError(true));
    }
  };

  const cyclePlaybackRate = (e) => {
    e.stopPropagation();
    const rates = [1, 1.5, 2];
    const nextIndex = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIndex];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const handleWaveformClick = (e) => {
    e.stopPropagation();
    const audio = audioRef.current;
    const waveform = waveformRef.current;
    if (!audio || !waveform || !duration) return;

    const rect = waveform.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const newTime = (clickX / rect.width) * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (hasError) {
    return (
      <div className="flex items-center gap-2 py-2 px-1 text-xs opacity-75">
        <AlertCircle size={16} />
        <span>{t('Unable to play audio note')}</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2.5 py-1 px-0.5 select-none min-w-[210px] sm:min-w-[240px] max-w-full"
      onClick={(e) => e.stopPropagation()}
    >
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className={`btn btn-circle btn-sm shrink-0 shadow-sm transition-transform active:scale-95 ${
          isMine
            ? 'bg-primary-content text-primary hover:bg-primary-content/90 border-transparent'
            : 'btn-primary text-primary-content'
        }`}
        aria-label={t(isPlaying ? 'Pause' : 'Play')}
      >
        {isPlaying ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
      </button>

      {/* Waveform & Scrubber */}
      <div className="flex-1 flex flex-col justify-center min-w-0">
        <div
          ref={waveformRef}
          onClick={handleWaveformClick}
          className="h-8 flex items-center gap-[2.5px] cursor-pointer group py-1"
          title={t('Seek')}
        >
          {WAVEFORM_BARS.map((height, index) => {
            const barProgress = (index / (WAVEFORM_BARS.length - 1)) * 100;
            const isFilled = barProgress <= progressPercent;

            return (
              <span
                key={index}
                style={{ height: `${height}px` }}
                className={`w-[3px] rounded-full transition-colors duration-100 ${
                  isFilled
                    ? isMine
                      ? 'bg-primary-content'
                      : 'bg-primary'
                    : isMine
                      ? 'bg-primary-content/30 group-hover:bg-primary-content/40'
                      : 'bg-base-content/25 group-hover:bg-base-content/40'
                }`}
              />
            );
          })}
        </div>

        {/* Time display & Speed button */}
        <div
          className={`flex items-center justify-between text-[11px] leading-tight font-mono tracking-tight ${
            isMine ? 'text-primary-content/85' : 'text-base-content/70'
          }`}
        >
          <span>{isPlaying ? formatTime(currentTime) : formatTime(duration || propDuration)}</span>
          <button
            type="button"
            onClick={cyclePlaybackRate}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
              isMine
                ? 'bg-primary-content/20 hover:bg-primary-content/30 text-primary-content'
                : 'bg-base-100/70 hover:bg-base-100 text-base-content border border-base-300'
            }`}
            title={t('Change playback speed')}
          >
            {playbackRate}x
          </button>
        </div>
      </div>
    </div>
  );
}
