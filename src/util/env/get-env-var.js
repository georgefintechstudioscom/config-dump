/**
 * @template T
 * @param {string} varName The name of the env variable.
 * @param {object} [options] Other options for extraction.
 * @param {function(string): T} [options.parse = function(string): string] A function to parse it, only called if it exists.
 * @param {function(T): boolean} [options.validate = function(string): true] A function to validate it.
 * @param {string} [options.mustBe = 'be valid'] A description of what the value must be.
 * @param {Object<string, string>} [options.env = process.env] The environment to extract from.
 * @param {string} [options.defaultValue] A default value for the variable.
 * @return {T|undefined}
 */
function getEnvVar(varName, {
  validate = x => true,
  parse = x => x,
  mustBe = 'be valid',
  env = process.env,
  required = false,
  defaultValue,
} = {}) {
  const raw = env[varName] || defaultValue;

  if (raw === undefined && required) {
    throw new Error(`${varName} is required and must set in the environment.`);
  }

  let parsed;
  if (raw !== undefined) {
    parsed = parse(raw);
  }

  if (parsed !== undefined && !validate(parsed)) {
    throw new Error(`${varName} must ${mustBe}, not ${raw}`);
  }
  return parsed;
}

module.exports = getEnvVar;
