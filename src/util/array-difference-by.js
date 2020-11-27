const identity = require('./identity');

/**
 * Finds an array objects that don't exist in the original array by an attribute
 *
 * @template T
 * @param {T[]} currentArray - New Array
 * @param {T[]} previousArray - Original Array
 * @param {function(T): *} [accessor=identity] - optional function to extract data to compare from list items
 * @return {T[]}
 */
function arrayDifferenceBy(currentArray, previousArray, accessor = identity) {
  return currentArray
    .filter(currentObject => previousArray
      .every(priorObject => accessor(priorObject) !== accessor(currentObject)));
}

module.exports = arrayDifferenceBy;
