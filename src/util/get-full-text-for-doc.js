const FederalRegisterService = require('../core-services/federal-register');
const S3Service = require('../core-services/s3');

const exponentialBackoff = require('./backoff/exponential-backoff');
const TimeoutError = require('./errors/TimeoutError');
const ResponseError = require('./errors/ResponseError');
const getEnvVar = require('./env/get-env-var');
const getNumericEnvVar = require('./env/get-numeric-env-var');


// Utility functions
/**
 * Fetches the full text.
 *
 * @param doc
 * @returns {Promise<string|null>}
 */
const getFullTextForDoc = async (doc) => {
  const s3Service = new S3Service();
  const fedRegService = new FederalRegisterService();

  const FTS_FULL_TEXT_BUCKET = getEnvVar('FTS_FULL_TEXT_S3_BUCKET', { defaultValue: 'fts-sourced-full-document-text' });
  const FED_REG_API_BASE_BACKOFF_DELAY = getNumericEnvVar(
    'BACKOFF_FED_REG_API_BASE_DELAY',
    { defaultValue: 1000 } // default to 1 second
  );
  const FED_REG_API_MAX_RETRIES = getNumericEnvVar(
    'BACKOFF_FED_REG_API_MAX_RETRIES',
    { defaultValue: 10 }
  );

  if (!fedRegService.isFederalRegisterDocUrl(doc.url)) {
    return null;
  }
  // try to fetch from our bucket first
  let fullText = await s3Service.getTextIfExists({ bucket: FTS_FULL_TEXT_BUCKET, key: String(doc.id) });
  if (fullText == null) {
    console.log(`Fetching full text from the feds for doc ${doc.id}`);
    try {
      fullText = await exponentialBackoff(
        () => fedRegService.getFullTextForDocByUrl(doc.url),
        {
          baseDelay: FED_REG_API_BASE_BACKOFF_DELAY,
          maxRetries: FED_REG_API_MAX_RETRIES,
          onError: err => console.log(err),
          isRetryable: err => err instanceof TimeoutError // timed out
            || (err instanceof ResponseError && err.response.status === 429), // too many requests
        }
      );
      console.log(`Persisting fed reg full text to s3 for doc ${doc.id}`);
      await s3Service.putText({ bucket: FTS_FULL_TEXT_BUCKET, key: String(doc.id), text: fullText });
    } catch (err) {
      console.error(
        `Error getting full text for doc ${doc.id} w/ url ${doc.url}. Using current text for tagging.`, err
      );
      return null;
    }
  }
  return fullText;
};

module.exports = getFullTextForDoc;
