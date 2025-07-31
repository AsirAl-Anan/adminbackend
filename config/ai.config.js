/**
 * Configuration settings for AI service
 */

export const AI_CONFIG = {
  // Gemini AI settings
  GEMINI: {
    MODEL: "gemini-2.5-flash-lite",
    MAX_RETRIES: 3,
    TIMEOUT_MS: 30000,
    RATE_LIMIT: {
      REQUESTS_PER_MINUTE: 60,
      BURST_LIMIT: 10,
    },
  },

  // File processing settings
  FILES: {
    MAX_SIZE_MB: 10,
    MAX_FILES_PER_REQUEST: 5,
    ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png',],
    CLEANUP_TIMEOUT_MS: 5000,
  },

  // Response settings
  RESPONSE: {
    MAX_QUESTIONS_PER_REQUEST: 50,
    INCLUDE_METADATA: true,
    VALIDATE_OUTPUT: true,
  },

  // Error handling
  ERROR_HANDLING: {
    INCLUDE_STACK_TRACE: process.env.NODE_ENV === 'development',
    LOG_ERRORS: true,
    RETRY_ON_FAILURE: true,
  },

  // Logging
  LOGGING: {
    LEVEL: process.env.LOG_LEVEL || 'info',
    INCLUDE_REQUEST_ID: true,
    LOG_AI_RESPONSES: process.env.NODE_ENV === 'development',
  },
};

/**
 * Get configuration value with fallback
 * @param {string} path - Dot-notation path to config value (e.g., 'GEMINI.MODEL')
 * @param {*} fallback - Fallback value if config not found
 * @returns {*} Configuration value
 */
export function getConfig(path, fallback = null) {
  const keys = path.split('.');
  let current = AI_CONFIG;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return fallback;
    }
  }

  return current;
}

/**
 * Validate required environment variables
 * @throws {Error} If required variables are missing
 */
export function validateEnvironment() {
  const required = ['GEMINI_API_KEY'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Get file size limit in bytes
 * @returns {number} Max file size in bytes
 */
export function getMaxFileSize() {
  return getConfig('FILES.MAX_SIZE_MB', 10) * 1024 * 1024;
}

/**
 * Check if development mode
 * @returns {boolean} True if in development mode
 */
export function isDevelopment() {
  return process.env.NODE_ENV === 'development';
}