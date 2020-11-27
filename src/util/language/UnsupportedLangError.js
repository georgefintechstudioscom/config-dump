const BadRequestError = require('../errors/BaseError');

class UnsupportedLangError extends BadRequestError {
  /**
   * @param {LangMetadata} lang
   */
  constructor(lang) {
    let message;
    if (lang.entityId !== undefined) {
      message = ` by id ${lang.entityId}`;
    } else if (lang.iso1 !== undefined) {
      message = ` by ISO 639-1 code ${lang.iso1}`;
    } else if (lang.iso2 !== undefined) {
      message = ` by ISO 639-2 code ${lang.iso2}`;
    }
    super(`Language${message} is not a currently supported language.`);
    this.lang = lang;
  }
}

module.exports = UnsupportedLangError;
