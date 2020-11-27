/**
 * @fileOverview Hardcoded mappings between FTS and other standards.
 * @see {@link https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes}
 * @see {@link https://en.wikipedia.org/wiki/ISO_639-1}
 * @see {@link https://en.wikipedia.org/wiki/ISO_639-2}
 */

/**
 * @typedef {Object} LangMetadata - Object containing language data for mappings between FTS and other standards.
 * @property {string} iso1 - The ISO 639-1 code for the language (2 characters).
 * @property {string} iso2 - The ISO 639-2 T code for the language (3 characters).
 * @property {EntityId} entityId - The entity id in the FTS platform.
 */

/**
 * @typedef {('iso1'|'iso2'|'entityId')} LangMetadataKey
 */

/**
 * All supported languages on the FTS platform.
 *
 * @type {LangMetadata[]}
 */
module.exports = [
  { // English
    iso1: 'en',
    iso2: 'eng',
    entityId: 3,
  },
  { // Russian
    iso1: 'ru',
    iso2: 'rus',
    entityId: 14585,
  },
  { // Spanish
    iso1: 'es',
    iso2: 'spa',
    entityId: 14589,
  },
  { // Polish
    iso1: 'pl',
    iso2: 'pol',
    entityId: 14635,
  },
  { // Czech
    iso1: 'cs',
    iso2: 'cse',
    entityId: 14646,
  },
  { // Portuguese
    iso1: 'pt',
    iso2: 'por',
    entityId: 14682,
  },
  { // Swedish
    iso1: 'sv',
    iso2: 'swe',
    entityId: 14693,
  },
  { // German
    iso1: 'de',
    iso2: 'deu',
    entityId: 14699,
  },
  { // Kazakh
    iso1: 'kk',
    iso2: 'kaz',
    entityId: 14733,
  },
  { // Slovenian
    iso1: 'sl',
    iso2: 'slv',
    entityId: 14785,
  },
  { // Dutch
    iso1: 'nl',
    iso2: 'nld',
    entityId: 14795,
  },
  { // Korean
    iso1: 'ko',
    iso2: 'kor',
    entityId: 14858,
  },
  { // Danish
    iso1: 'da',
    iso2: 'dan',
    entityId: 14889,
  },
  { // French
    iso1: 'fr',
    iso2: 'fra',
    entityId: 14914,
  },
  { // Italian
    iso1: 'it',
    iso2: 'ita',
    entityId: 15233,
  },
  { // Finnish
    iso1: 'fi',
    iso2: 'fin',
    entityId: 15275,
  },
  { // Norweigian
    iso1: 'no',
    iso2: 'nor',
    entityId: 15637,
  },
  { // Bulgarian
    iso1: 'bg',
    iso2: 'bul',
    entityId: 16226,
  },
  { // Arabic
    iso1: 'ar',
    iso2: 'ara',
    entityId: 17118,
  },
  { // Romanian
    iso1: 'ro',
    iso2: 'ron',
    entityId: 17226,
  },
  { // Ukrainian
    iso1: 'uk',
    iso2: 'ukr',
    entityId: 17508,
  },
  { // Slovak
    iso1: 'sk',
    iso2: 'slk',
    entityId: 17766,
  },
  { // Hungarian
    iso1: 'hu',
    iso2: 'hun',
    entityId: 23812,
  },
  { // Hebrew
    iso1: 'he',
    iso2: 'heb',
    entityId: 25839,
  },
  { // Turkish
    iso1: 'tr',
    iso2: 'tur',
    entityId: 28555,
  },
  { // Japanese
    iso1: 'ja',
    iso2: 'jpn',
    entityId: 31134,
  },
  { // Chinese (simplified)
    iso1: 'zh',
    iso2: 'zho',
    entityId: 32454,
  },
  { // Estonian
    iso1: 'et',
    iso2: 'est',
    entityId: 35578,
  },
  { // Icelandic
    iso1: 'is',
    iso2: 'isl',
    entityId: 51365,
  },
  { // Lithuanian
    iso1: 'lt',
    iso2: 'lit',
    entityId: 92879,
  },
  { // Greek
    iso1: 'el',
    iso2: 'ell',
    entityId: 106603,
  },
  { // Hindi
    iso1: 'hi',
    iso2: 'hin',
    entityId: 710734,
  },
  { // Indonesian
    iso1: 'id',
    iso2: 'ind',
    entityId: 4937797,
  },
  { // Uzbek
    iso1: 'uz',
    iso2: 'uzb',
    entityId: 4979717,
  },
];
