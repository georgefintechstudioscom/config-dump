const BaseError = require('./BaseError');

/**
 * Http Timeout Errors.
 */
class TimeoutError extends BaseError {
  /**
   *
   * @param {string} message
   * @param {number} timeoutLength
   */
  constructor(message, timeoutLength) {
    super(message);
    this.timeoutLength = timeoutLength;
  }
}

module.exports = TimeoutError;
