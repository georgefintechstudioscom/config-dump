const DocumentType = require('../../metadata-extractors/document-type');

/**
 * Merges new metadata and entities with existing entities and metadata
 *
 * @param {number} docId
 * @param {DocMetadata} taggedMetadata
 * @param {DocMetadata} existingMetadata
 * @param {number[]} existingEntityIds
 * @returns {MergedEntitiesAndMetaData}
 */
function mergeArticleEntitiesAndMetadata({
  docId, existingMetadata, existingEntityIds, taggedMetadata,
}) {
  const entitiesToAdd = [];

  // get all tagged entities from the metadata
  const metadataEntities = Object.values(taggedMetadata)
    .filter(({ type }) => type === 'entity')
    .flatMap(({ values }) => values)
    .map(id => Number(id));
  entitiesToAdd.push(...metadataEntities);

  // Remove all old metadata entities from the entities list
  // Yes, this is not ideal, as there could be overlapping tags that
  // from the normal tagging, and this should not be the long-term solution
  const entitiesToRemove = Object.values(existingMetadata || {})
    .filter(({ type }) => type === 'entity')
    .flatMap(({ values }) => values)
    .map(id => Number(id))
    // and remove all previous document types to clear out way for new types :vomit:
    .concat(Object.values(DocumentType));

  if (entitiesToAdd.length === 0 && Object.keys(taggedMetadata).length === 0 && entitiesToRemove.length === 0) {
    console.log('No entities or metadata to add or remove');
    return { mergedEntities: existingEntityIds, mergedMetadata: existingMetadata };
  }
  // Filter out all current entities in the removal list and add all entities from the add list
  const notRemovedEntities = existingEntityIds
    .filter(eId => !entitiesToRemove.includes(eId));
  const updatedEntities = notRemovedEntities.concat(entitiesToAdd);

  const mergedEntities = Array.from(new Set(updatedEntities));

  const numRemoved = existingEntityIds.length - notRemovedEntities.length;
  console.log(
    `Adding entities to doc ${docId}: adding ${entitiesToAdd.length},
       removing ${numRemoved} for a total of ${updatedEntities.length} entities`
  );

  // Merge the existing metadata with new content. Anything is the new metadata object
  // takes precedent over existing metadata with the same key.
  const mergedMetadata = Object.assign(existingMetadata || {}, taggedMetadata);

  return { mergedEntities, mergedMetadata };
}

module.exports = mergeArticleEntitiesAndMetadata;
