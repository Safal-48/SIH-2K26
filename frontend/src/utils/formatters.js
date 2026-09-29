/**
 * General Formatting Utilities
 */

/**
 * Format uptime in seconds to human-readable string
 * @param {number} seconds
 */
export const formatUptime = (seconds) => {
  if (!seconds || seconds < 0) return '0s';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (hrs > 0) parts.push(`${hrs}h`);
  if (mins > 0) parts.push(`${mins}m`);
  parts.push(`${secs}s`);
  return parts.join(' ');
};

/**
 * Format ISO date string into readable local timestamp
 * @param {string|Date} date
 */
export const formatTimestamp = (date) => {
  if (!date) return 'N/A';
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
};
