async function wait(ms) {
  return new Promise(res => setTimeout(res, ms));
}

/**
 * @typedef {function({ attemptNumber: number, error: Error }): number} BackoffStrategy
 * @description A function that determines how much to delay (in ms) before the next attempt.
 */

/**
 * Internal executor of backoffs to hide details from user.
 *
 * @template T
 * @param {function(): T|Promise<T>} fn
 * @param {number} [maxRetries] if undefined, will retry forever.
 * @param {BackoffStrategy} strategy
 * @param {function(Error): boolean} isRetryable
 * @param {function(Error): void|Promise<void>} onError
 * @param {number} [attemptNumber=0] the current attempt number.
 * @returns {Promise<T>}
 */
async function backoffInternal(fn, { // configurable by the end user
  strategy,
  maxRetries,
  isRetryable,
  onError,
  attemptNumber = 1,
}) {
  try {
    return await fn();
  } catch (error) {
    onError(error);

    if (maxRetries !== undefined && attemptNumber > maxRetries) {
      throw new Error(`Max retries hit. Final error: ${error}`);
    }

    if (!isRetryable(error)) {
      throw new Error(`Non-retryable error: ${error}`);
    }

    await wait(strategy({ attemptNumber, error }));

    // tail recursion ftw
    return backoffInternal(
      fn,
      {
        strategy, isRetryable, onError, maxRetries, attemptNumber: attemptNumber + 1,
      }
    );
  }
}


/**
 * @template T
 * @param {function(): T|Promise<T>} fn
 * @param {number} [maxRetries] if undefined, will retry forever.
 * @param {BackoffStrategy} strategy
 * @param {function(Error): boolean} [isRetryable]
 * @param {function(Error): void|Promise<void>} [onError]
 * @returns {Promise<T>}
 */
async function backoff(fn, {
  strategy,
  maxRetries,
  isRetryable = err => true,
  onError = (err) => {
  },
}) {
  return backoffInternal(fn, {
    strategy, maxRetries, isRetryable, onError,
  });
}

module.exports = backoff;
