let cachedChar = null;

/**
 * Lazily load the char module with error handling.
 * @returns {object} The loaded char module.
 */
function getCharModule() {
  if (!cachedChar) {
    try {
      cachedChar = require('./char');
    } catch (err) {
      console.error('Failed to load char module:', err);
      throw err;
    }
  }
  return cachedChar;
}

module.exports = { getCharModule };

