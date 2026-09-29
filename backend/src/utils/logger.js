/**
 * Centralized Console Logger Utility
 * Provides uniform timestamps and log formatting for backend services.
 */
const formatTime = () => new Date().toISOString();

const formatMeta = (meta) => {
  if (!meta) return '';
  if (meta instanceof Error) {
    return `${meta.message} \n${meta.stack}`;
  }
  if (typeof meta === 'object') {
    try {
      return JSON.stringify(meta);
    } catch {
      return String(meta);
    }
  }
  return String(meta);
};

export const logger = {
  info: (message, meta = '') => {
    console.log(`[${formatTime()}] [INFO] ${message}`, formatMeta(meta));
  },
  warn: (message, meta = '') => {
    console.warn(`[${formatTime()}] [WARN] ${message}`, formatMeta(meta));
  },
  error: (message, meta = '') => {
    console.error(`[${formatTime()}] [ERROR] ${message}`, formatMeta(meta));
  },
  debug: (message, meta = '') => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[${formatTime()}] [DEBUG] ${message}`, formatMeta(meta));
    }
  },
};

export default logger;

