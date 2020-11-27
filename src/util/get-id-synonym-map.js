/**
 * Create a {@link Map} from string synonyms to an entity id. No duplicates allowed.
 *
 * @param {Object<number, string[]>} synonymMapping - a mapping from an entity id to a list of synonyms for it.
 * @returns {Map<string, number>}
 * @throws Error - when a duplicate synonym is found.
 */
function getIdSynonymMap(synonymMapping) {
  return Object
    .entries(synonymMapping)
    .flatMap(([id, names]) => names.map(name => [id, name.toLowerCase()]))
    .reduce((map, [id, name]) => {
      if (map.has(name)) {
        throw new Error(`Duplicate synonym ${name} specified.`);
      }
      map.set(name, Number(id));
      return map;
    }, new Map());
}

module.exports = getIdSynonymMap;
