import { useEffect, useState } from 'react';

// Generates consistent, attractive color for user initials
function getInitialsColor(name = '') {
  const colors = [
    'bg-primary/20 text-primary border-primary/30',
    'bg-secondary/20 text-secondary border-secondary/30',
    'bg-accent/20 text-accent border-accent/30',
    'bg-info/20 text-info border-info/30',
    'bg-success/20 text-success border-success/30',
    'bg-warning/20 text-warning border-warning/30',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function InitialsAvatar({ name, size = 'w-10 h-10', textSize = 'text-sm', className = '' }) {
  const initials = name
    ? name
        .trim()
        .split(/\s+/)
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';
  const colorClass = getInitialsColor(name);

  return (
    <div
      className={`${size} ${colorClass} ${textSize} rounded-full font-bold flex items-center justify-center shrink-0 select-none border ${className}`}
    >
      {initials}
    </div>
  );
}

export default function Avatar({
  src,
  name,
  size = 'w-10 h-10',
  textSize = 'text-sm',
  className = '',
  alt = '',
  onClick,
}) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!src || hasError) {
    return (
      <InitialsAvatar
        name={name}
        size={size}
        textSize={textSize}
        className={className}
      />
    );
  }

  return (
    <div
      onClick={onClick}
      className={`${size} rounded-full overflow-hidden shrink-0 inline-flex items-center justify-center ${className}`}
      style={{ aspectRatio: '1 / 1' }}
    >
      <img
        src={src}
        alt={alt || name || 'Avatar'}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className="h-full w-full object-cover block"
      />
    </div>
  );
}
