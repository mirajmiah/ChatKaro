/**
 * Format message timestamp as HH:MM
 * @param {string|Date} dateStr
 * @returns {string}
 */
const getLocale = (language) => (language === 'bn' ? 'bn-BD' : language === 'hi' ? 'hi-IN' : 'en-US');

export const formatMsgTime = (dateStr, language = 'en') => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(getLocale(language), { hour: '2-digit', minute: '2-digit' });
};

/**
 * Format last seen for sidebar — shows relative time for recent, date for older
 * @param {string|Date} dateStr
 * @returns {string}
 */
export const formatLastSeen = (dateStr, language = 'en') => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const relativeTime = new Intl.RelativeTimeFormat(getLocale(language), { numeric: 'auto' });
  if (diffMins < 1) return relativeTime.format(0, 'minute');
  if (diffMins < 60) return relativeTime.format(-diffMins, 'minute');
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return relativeTime.format(-diffHours, 'hour');
  return date.toLocaleDateString(getLocale(language), { month: 'short', day: 'numeric' });
};

/**
 * Format last seen for chat header / profile details — shows exact relative or date time
 * e.g., "last seen today at 8:04 pm", "last seen yesterday at 10:49 pm", "last seen just now"
 * @param {string|Date} dateStr
 * @param {string} language
 * @param {Function} t
 * @returns {string}
 */
export const formatLastSeenDetailed = (dateStr, language = 'en', t = (s) => s) => {
  if (!dateStr) return t('Offline');
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return t('Offline');

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) {
    return t('last seen just now');
  }
  if (diffMins < 60) {
    return t('last seen {mins}m ago', { mins: diffMins });
  }

  const locale = getLocale(language);
  const timeStr = date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', hour12: true });

  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return t('last seen today at {time}', { time: timeStr });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  if (isYesterday) {
    return t('last seen yesterday at {time}', { time: timeStr });
  }

  const isSameYear = date.getFullYear() === now.getFullYear();
  if (isSameYear) {
    const dateFormatted = date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
    return t('last seen {date} at {time}', { date: dateFormatted, time: timeStr });
  }

  const fullDateFormatted = date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  return t('last seen {date} at {time}', { date: fullDateFormatted, time: timeStr });
};
