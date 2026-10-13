/**
 * Format message timestamp as HH:MM
 * @param {string|Date} dateStr
 * @returns {string}
 */
const getLocale = (language) => (language === 'bn' ? 'bn-BD' : language === 'hi' ? 'hi-IN' : 'en-US');

export const formatMsgTime = (dateStr, language = 'en') => {
  const date = new Date(dateStr);
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
