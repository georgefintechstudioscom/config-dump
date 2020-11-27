#!/usr/bin/env node
const https = require('https');
const http = require('http');

/**
 * Ask the ES API for the shard health on the given host.
 * @param {string} host
 * @return {Promise<{ status: string }>}
 */
async function getShardHealth(host) {
  const esApiUrl = `${host}/_cluster/health/?level=shards`;
  const httpLib = host.startsWith('https') ? https : http;

  return new Promise((resolve, reject) => {
    httpLib.get(esApiUrl, (res) => {
      res.on('data', data => resolve(JSON.parse(data)));
    }).on('error', err => reject(err));
  });
}

/**
 * Wait for milliseconds to pass
 * @param {number} ms
 * @return {Promise<*>}
 */
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Resolve a promise when Elasticsearch on the given host is ready to use.
 *
 * @async
 * @param {string} [host=process.env.ES_HOST] - elasticsearch host, e.g. http://es.example.com:9200
 * @param {number} [maxRetries=10] - times to try before rejecting the promise
 * @param {number} [msBetweenRetries=2000] - seconds to wait between retries
 * @return {Promise<string>} resolves to success message
 */
async function waitForES({ host = process.env.ES_HOST, maxRetries = 10, msBetweenRetries = 2000 } = {}) {
  console.debug(`Waiting for shards to settle on ${host}`);
  const start = new Date();
  for (let i = 0; i < maxRetries; i += 1) {
    try {
      const { status } = await getShardHealth(host);
      if (status !== 'red') {
        const end = new Date();
        return `Elasticsearch on ${host} is ready (took ${(end - start) / 1000}s)`;
      }
    } catch (err) {
      console.warn(err.message || err);
      console.log(`Will retry in ${msBetweenRetries / 1000}s`);
    }
    await sleep(msBetweenRetries);
  }

  throw new Error(`Shards on ${host} did not settle in ${msBetweenRetries / 1000 * maxRetries}s`);
}


if (require.main === module) {
  waitForES({
    host: process.argv[2],
    maxRetries: process.argv[3],
    msBetweenRetries: process.argv[4],
  })
    .then(out => console.log(out))
    .catch((err) => {
      console.error(err.message || err);
      process.exit(1);
    });
}

module.exports = waitForES;
