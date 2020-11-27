const fetch = require('node-fetch');
const getEnvVar = require('../../util/env/get-env-var');
const getNumericEnvVar = require('../../util/env/get-numeric-env-var');
const Singleton = require('../../util/singleton/Singleton');
const ResponseError = require('../../util/errors/ResponseError');
const TimeoutError = require('../../util/errors/TimeoutError');

const { Headers, FetchError } = fetch;

class FtsApiService extends Singleton {
  /**
   * @param {string} [host]
   * @param {number} [timeout]
   * @param {number} [tokenExpirationBuffer]
   * @param {string} [username]
   * @param {string} [password]
   * @param {string} [apiKey]
   */
  constructor({
    host = getEnvVar('FTS_API_HOST', {
      defaultValue: 'https://global-api.fintechstudios.com',
      validate: s => !s.endsWith('/'),
      mustBe: 'not end with a trailing slash',
    }),
    timeout = getNumericEnvVar('FTS_API_TIMEOUT', {
      defaultValue: 15000, // 15 seconds
      validate: x => x > 0,
      mustBe: 'above 0',
    }),
    tokenExpirationBuffer = getNumericEnvVar('FTS_API_TOKEN_EXP_BUFFER', {
      defaultValue: 2 * 60000, // 2 minutes
      validate: x => x > 0,
      mustBe: 'above 0',
    }),
    username = getEnvVar('FTS_API_USERNAME', { required: true }),
    password = getEnvVar('FTS_API_PASSWORD', { required: true }),
    apiKey = getEnvVar('FTS_API_KEY', { required: true }),
  } = {}) {
    super();
    this.host = host;
    this.timeout = timeout;
    this.tokenExpirationBuffer = tokenExpirationBuffer;
    /** @private */
    this.password = password;
    /** @private */
    this.username = username;
    /** @private */
    this.apiKey = apiKey;
    /** @private */
    this.tokenExpiration = null;
    /** @private */
    this.token = null;
  }

  /**
   * Determine whether the current auth token is still valid or if a new one should be fetched.
   *
   * @private
   * @return {boolean}
   */
  get tokenIsValid() {
    // Expire before actual token expiration to make the likelihood
    // of token expiring during the request latency very small
    return this.tokenExpiration != null
      && (this.tokenExpiration - Date.now()) > this.tokenExpirationBuffer;
  }

  /**
   * Fetch a new auth token and expiration.
   *
   * @private
   * @return {Promise<void>}
   */
  async login() {
    const body = {
      email: this.username,
      password: this.password,
    };
    const { token, expires } = await this.makeRequest(`${this.host}/auth/login`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    this.token = token;
    this.tokenExpiration = expires;
  }

  /**
   * Mirrors the `fetch` API for requesting, but always returns JSON.
   *
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch}
   * @package
   * @param {string|Request} resource
   * @param {RequestInit} [init]
   * @return {Promise<*>}
   */
  async makeRequest(resource, init = { timeout: this.timeout }) {
    const headers = new Headers(init.headers);
    headers.set('Content-Type', 'application/json');
    headers.set('Accept', 'application/json');

    /** @type {Response} */
    let res;
    try {
      res = await fetch(resource, {
        ...init,
        headers,
      });
    } catch (error) {
      if (error instanceof FetchError && error.type === 'request-timeout') {
        throw new TimeoutError(error.message, init.timeout);
      }
      throw error;
    }

    if (!res.ok) {
      throw new ResponseError(`FTS API Request error: ${res.statusText} - ${res}`, res);
    }

    const text = await res.text();
    // Deletion requests return no content
    if (text === '') {
      return undefined;
    }
    const body = JSON.parse(text);

    // API Gateway squashes errors
    if (body.error) {
      throw new ResponseError(`${body.error.type}: ${body.error.message}`);
    }

    return body;
  }

  /**
   * Mirrors the `fetch` API for requesting, but always returns JSON.
   *
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch}
   * @package
   * @param {string|Request} resource
   * @param {RequestInit} [init]
   * @return {Promise<*>}
   */
  async makeAuthenticatedRequest(resource, init = { timeout: this.timeout }) {
    if (!this.tokenIsValid) {
      await this.login();
    }
    const headers = new Headers(init.headers);
    headers.set('x-api-key', this.apiKey);
    headers.set('x-api-token', this.token);
    return this.makeRequest(resource, {
      ...init,
      headers,
    });
  }

  /**
   * @public
   * @returns {Promise<'ok'>}
   */
  async getStatus() {
    const { status } = await this.makeRequest(`${this.host}/status`);
    return status;
  }
}

module.exports = FtsApiService;
