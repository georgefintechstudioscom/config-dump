const getEnvVar = require('./get-env-var');

/**
 * @param {string} varName The name of the env variable.
 * @param {object} [options] Other options for extraction.
 * @param {Object<string, string>} [options.env=process.env] The environment to extract from.
 * @param {number} [options.defaultValue] A default value for the variable.
 * @return {number}
 */
function getNumericEnvVar(varName, {
  env = process.env,
  required = false,
  defaultValue,
} = {}) {
  defaultValue = defaultValue === undefined ? undefined : defaultValue.toString();
  return getEnvVar(varName, {
    parse: s => Number(s),
    validate: x => !Number.isNaN(x),
    mustBe: 'a number',
    defaultValue,
    env,
    required,
  });
}

module.exports = getNumericEnvVar;
