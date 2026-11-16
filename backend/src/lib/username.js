export const USERNAME_REGEX = /^(?!.*\.\.)(?!^\.)[a-zA-Z0-9._]{1,30}(?<!\.)$/;

/**
 * Validates a username according to rules:
 * - 1 to 30 characters
 * - Only A-Z, a-z, 0-9, underscore (_), and period (.)
 * - No spaces, emojis, or special characters
 * - Cannot start or end with a period
 * - No consecutive periods (..)
 */
export function validateUsername(username) {
  if (typeof username !== 'string') {
    return { isValid: false, error: 'Username is required.' };
  }

  const trimmed = username.trim();

  if (trimmed.length < 1) {
    return { isValid: false, error: 'Username must be at least 1 character long.' };
  }

  if (trimmed.length > 30) {
    return { isValid: false, error: 'Username cannot exceed 30 characters.' };
  }

  if (/\s/.test(trimmed)) {
    return { isValid: false, error: 'Username cannot contain spaces.' };
  }

  if (trimmed.startsWith('.')) {
    return { isValid: false, error: 'Username cannot start with a period.' };
  }

  if (trimmed.endsWith('.')) {
    return { isValid: false, error: 'Username cannot end with a period.' };
  }

  if (trimmed.includes('..')) {
    return { isValid: false, error: 'Username cannot contain consecutive periods.' };
  }

  if (!/^[a-zA-Z0-9._]+$/.test(trimmed)) {
    return {
      isValid: false,
      error: 'Username can only contain letters, numbers, underscores (_), and periods (.).',
    };
  }

  if (!USERNAME_REGEX.test(trimmed)) {
    return { isValid: false, error: 'Invalid username format.' };
  }

  return { isValid: true, normalized: trimmed.toLowerCase() };
}

/**
 * Normalizes username to lowercase.
 */
export function normalizeUsername(username) {
  return typeof username === 'string' ? username.trim().toLowerCase() : '';
}

/**
 * Generates unique alternative username suggestions if the requested one is taken.
 */
export async function generateUsernameSuggestions(base, isTakenFn) {
  const rawClean = (base || 'user')
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/[^a-z0-9._]/g, '_')
    .replace(/^\.+|\.+$/g, '')
    .replace(/\.{2,}/g, '.')
    .slice(0, 20) || 'user';

  const candidates = [
    `${rawClean}_${Math.floor(100 + Math.random() * 900)}`,
    `${rawClean}.${Math.floor(10 + Math.random() * 90)}`,
    `the_${rawClean}`,
    `${rawClean}_chat`,
    `${rawClean}_${new Date().getFullYear()}`,
    `${rawClean}${Math.floor(10 + Math.random() * 90)}`,
    `its_${rawClean}`,
  ];

  const suggestions = [];
  for (const candidate of candidates) {
    if (suggestions.length >= 4) break;
    const validation = validateUsername(candidate);
    if (validation.isValid) {
      const taken = await isTakenFn(validation.normalized);
      if (!taken && !suggestions.includes(validation.normalized)) {
        suggestions.push(validation.normalized);
      }
    }
  }

  return suggestions;
}

/**
 * Auto-generates a valid unique username from name or email for OAuth or existing accounts.
 */
export async function generateUniqueUsername(nameOrEmail, isTakenFn) {
  const base = (nameOrEmail || 'user')
    .toLowerCase()
    .split('@')[0]
    .replace(/[^a-z0-9._]/g, '_')
    .replace(/^\.+|\.+$/g, '')
    .replace(/\.{2,}/g, '.')
    .slice(0, 22) || 'user';

  let candidate = base;
  if (!validateUsername(candidate).isValid) {
    candidate = `user_${Math.floor(1000 + Math.random() * 9000)}`;
  }

  let isTaken = await isTakenFn(candidate);
  if (!isTaken) return candidate;

  // Append numeric suffix
  let attempts = 0;
  while (isTaken && attempts < 20) {
    attempts++;
    const suffix = `_${Math.floor(100 + Math.random() * 900)}`;
    const trial = `${candidate.slice(0, 30 - suffix.length)}${suffix}`;
    if (validateUsername(trial).isValid) {
      isTaken = await isTakenFn(trial);
      if (!isTaken) return trial;
    }
  }

  return `user_${Date.now().toString().slice(-6)}`;
}
