const SUPPORTED_LANGUAGES = require('./supported-languages');

/**
 * Get a filtered list of languages by a specific key.
 *
 * @package
 * @param {Set} vals
 * @param {LangMetadataKey} [key='iso1']
 * @returns {LangMetadata[]}
 */
function getLangList(vals, key = 'iso1') {
  return SUPPORTED_LANGUAGES
    .filter(lang => vals.has(lang[key]));
}

module.exports = getLangList;
