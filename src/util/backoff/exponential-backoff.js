const backoff = require('./backoff');

/**
 * Implementation of an exponential backoff.
 *
 * @see {@link https://en.wikipedia.org/wiki/Exponential_backoff}
 * @param {number} factor
 * @param {number} baseDelay
 * @returns {BackoffStrategy}
 */
function getExponentialStrategy({ factor, baseDelay }) {
  return ({ attemptNumber }) => ((factor ** attemptNumber) * baseDelay) - baseDelay;
}

/**
 * @template T
 * @param {function(): T|Promise<T>} fn
 * @param {number} [maxRetries = 100] seems like a reasonable number. Could also see leaving undefined for forever.
 * @param {function(Error): boolean} [isRetryable]
 * @param {function(Error): void|Promise<void>} [onError]
 * @param {number} [factor = 2]
 * @param {number} [baseDelay = 100] The base amount of ms to wait
 * @returns {Promise<T>}
 */
async function exponentialBackoff(fn, {
  isRetryable,
  onError,
  factor = 2,
  baseDelay = 100,
  maxRetries = 100,
}) {
  return backoff(fn, {
    maxRetries, onError, isRetryable, strategy: getExponentialStrategy({ factor, baseDelay }),
  });
}

module.exports = exponentialBackoff;
