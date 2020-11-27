const find = require('lodash.find');
const UnsupportedLangError = require('./UnsupportedLangError');
const getLangList = require('./get-lang-list');

/**
 * @callback LanguageValidator
 * @description returned validator function from {@link getLanguageValidator}.
 *  Validates that a given language is in the previously defined set and then returns the {@link LangMetadata}.
 * @param {Partial<LangMetadata>} langItem
 * @returns LangMetadata
 * @throws UnsupportedLangError if a match is not found from the supported set
 */

/**
 * @param {Array} supportedList
 * @param {LangMetadataKey} type
 * @returns {LanguageValidator}
 */
function getLanguageValidator(supportedList, type = 'iso1') {
  const supportedLangs = getLangList(new Set(supportedList), type);

  /**
   * @type {LanguageValidator}
   */
  return (langItem) => {
    const langMetadata = find(supportedLangs, langItem);
    if (!langMetadata) {
      throw new UnsupportedLangError(langItem);
    }
    return langMetadata;
  };
}

module.exports = getLanguageValidator;
