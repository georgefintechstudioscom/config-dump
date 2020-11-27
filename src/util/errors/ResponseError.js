const BaseError = require('./BaseError');

/**
 * Http Response Errors.
 */
class ResponseError extends BaseError {
  /**
   * @param {string} message
   * @param {Response} response
   */
  constructor(message, response) {
    super(message);
    this.response = response;
  }
}

module.exports = ResponseError;
