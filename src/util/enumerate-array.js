/**
 * Enumerate an array into a list of all sequences.
 *
 * @example
 * let sequences = enumerateArray([1, 2, 3]);
 * // [[1], [1, 2], [1, 2, 3]]
 *
 * @template T
 * @param {T[]} arr
 * @returns {T[][]}
 */
function enumerateArray(arr) {
  // take all existing and then push the item on to the end of a copy of the last list
  return arr
    .slice(1)
    .reduce(
      (enumeration, item) => enumeration.concat([[...enumeration[enumeration.length - 1], item]]),
      [[arr[0]]]
    );
}

module.exports = enumerateArray;
