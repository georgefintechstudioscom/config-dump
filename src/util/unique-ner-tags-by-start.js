const uniqueArrayBy = require('lodash.uniqby');

/**
 * Remove duplicate ner tags based on start index
 *
 * @param {NERAnnotation[]} nerTags
 */
function uniqueNerTagsByStart(nerTags) {
  return uniqueArrayBy(nerTags, nerTag => nerTag.textLocation.start);
}

module.exports = uniqueNerTagsByStart;
