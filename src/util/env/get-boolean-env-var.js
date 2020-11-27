const getEnvVar = require('./get-env-var');

/**
 * @param {string} varName The name of the env variable.
 * @param {object} [options] Other options for extraction.
 * @param {Object<string, string>} [options.env=process.env] The environment to extract from.
 * @param {boolean} [options.defaultValue] A default value for the variable.
 * @return {boolean}
 */
function getBooleanEnvVar(varName, {
  env = process.env,
  required = false,
  defaultValue,
} = {}) {
  if (defaultValue !== undefined) {
    defaultValue = String(defaultValue);
  }
  return getEnvVar(varName, {
    parse: s => s.trim().toLowerCase() === 'true',
    defaultValue,
    env,
    required,
  });
}

module.exports = getBooleanEnvVar;
