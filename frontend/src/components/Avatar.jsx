import { useEffect, useState } from 'react';

// Generates consistent, attractive, vibrant color for user initials
function getInitialsColor(name = '') {
  const colors = [
    'bg-indigo-600 text-white',
    'bg-emerald-600 text-white',
    'bg-blue-600 text-white',
    'bg-amber-600 text-white',
    'bg-rose-600 text-white',
    'bg-teal-600 text-white',
    'bg-violet-600 text-white',
    'bg-cyan-600 text-white',
    'bg-fuchsia-600 text-white',
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
      className={`${size} ${colorClass} ${textSize} rounded-full font-bold inline-flex items-center justify-center shrink-0 select-none shadow-sm ${className}`}
      style={{ aspectRatio: '1 / 1' }}
    >
      <span className="leading-none">{initials}</span>
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
