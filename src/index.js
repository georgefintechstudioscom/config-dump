require('dotenv/config');
const fs = require('fs');
const PipelineValidation = require('./pipelineValidation');
const FtsApiEntitiesService = require('./core-services/fts-api/FtsApiEntitiesService');

const FTS_TYPE_REGEX = /^fts_(?<type>[a-z]+)_/;
const TYPE_REGEX = /^(?<type>[a-z]+)_/;

const metadataSortOrder = new Map([
  ['jurisdictions', 10],
  ['issuingAgencies', 20],
  ['docTypes', 30],
  ['publicationDate', 40],
  ['volumeNumber', 50],
  ['volumes', 60],
  ['docNumber', 70],
  ['cik', 80],
  ['filedAs', 90],
  ['filingType', 100],
  ['filingDate', 110],
  ['celex', 120],
  ['uncluster', 130],
  ['entityTags', 140],
]);

const ISSUING_AGENCIES = 'issuingAgencies';
const JURISDICTIONS = 'jurisdictions';
const DOC_TYPES = 'docTypes';
const VOLUMES = 'volumes';
const DOC_CITATIONS = 'docCitations';
const CIK = 'cik';
const FILED_AS = 'filedAs';
const FILING_TYPE = 'filingType';

const entityTypeToMetadataType = new Map([
  ['usfedagency', ISSUING_AGENCIES],
  ['usstateagencies', ISSUING_AGENCIES],
  ['intergovagency', ISSUING_AGENCIES],
  ['govagency', ISSUING_AGENCIES],
  ['centralbanks', ISSUING_AGENCIES],
  ['finexchanges', ISSUING_AGENCIES],
  ['city', JURISDICTIONS],
  ['state', JURISDICTIONS],
  ['country', JURISDICTIONS],
  ['cadprov', JURISDICTIONS],
  ['region', JURISDICTIONS],
  ['intergovagency', JURISDICTIONS],
  ['doctype', DOC_TYPES],
  ['legalvolume', VOLUMES],
  ['legalrefdoc', DOC_CITATIONS],
  ['cik', CIK],
  ['filedas', FILED_AS],
  ['filingtype', FILING_TYPE],
]);

/**
 * @typedef {Object} Entity
 * @property {number} id
 * @property {string} external_id
 * @property {string} provider
 * @property {string} name
 * @property {string} type
 * @property {string} type_display
 */

/**
 * Return a string that is a key for looking up an entity a provider and an external ID.
 * @param {string} provider
 * @param {string} externalId
 * @returns {string} A standard key for looking up an entity
 */
function makeEntityKey(provider, externalId) {
  return `${externalId}/${provider}`;
}

/**
 * Break an entity key into provider and external ID.
 * @param {string} key
 * @returns {{provider: {string}, external_iId: {string}}}
 */
function unEntityKey(key) {
  const arr = key.split('/');
  return { provider: arr[1], external_id: arr[0] };
}

/**
 * Return a string that is a key for looking up an entity given an unresolved entity item.
 * @param {Object} item
 * @returns {string} A standard key for looking up an unresolved entity
 */
function entityKey(item) {
  return makeEntityKey(item.provider, item.external_id || item.externalId);
}

/**
 * Read an external file with a mapping of source entities to contributor entities.
 * @param {string} filename - JSON file containing the mapping of sources to contributors
 * @returns {Map<string, string>}
 */
function readSourceToContributorMapFromFile(filename) {
  if (filename) {
    const data = JSON.parse(fs.readFileSync(filename).toString());
    return data.map.reduce((map, item) => {
      map.set(
        makeEntityKey(item.sourceProvider, item.sourceExternalId),
        makeEntityKey(item.contributorProvider, item.contributorExternalId)
      );
      return map;
    }, new Map());
  }
  return new Map();
}

/**
 * Read pipeline configurations from files and store them in a list of pipelines.
 * @param {string[]} filenames
 * @param {Object[]} pipelines
 * @returns {void}
 */
function readPipelinesFromFiles(filenames, pipelines) {
  if (filenames) {
    filenames.reduce((arr, filename) => {
      const pipeline = JSON.parse(fs.readFileSync(filename).toString());
      arr.push(pipeline);
      pipeline.filename = filename;
      return arr;
    }, pipelines);
  }
}

/**
 * Read pipeline configurations from the document-ingestion control-plane and store them in a list of pipelines.
 * @param {string[]} pipelineIds
 * @param {Object[]} pipelines
 * @returns {Promise<void>}
 */
async function readPipelinesFromControlPlane(pipelineIds, pipelines) {
  // TODO
  if (pipelineIds && pipelineIds.length > 0) {
    throw new Error('Not implemented yet.');
  }
}

/**
 * Convert a list of entity data into a pipeline for assigning static entity metadata.
 * @param staticMetadata
 * @returns {Promise<{apiVersion: number, active: boolean, description: string, rules: [], id: number}>}
 */
async function convertStaticMetadataToPipeline(staticMetadata) {
  const entityIds = staticMetadata.reduce((set, item) => {
    item.from.concat(item.to).forEach(x => set.add(x));
    return set;
  }, new Set());
  const entityService = FtsApiEntitiesService.getInstance();
  const entities = await entityService.getEntities(entityIds);
  const entityMap = entities.reduce((map, entity) => {
    map.set(entity.id, entity);
    return map;
  }, new Map());
  const pipeline = {
    apiVersion: 1,
    id: 0,
    active: true,
    description: 'Static Entity Metadata Pipeline',
    rules: [],
  };
  staticMetadata.forEach((def) => {
    def.to.forEach((toId) => {
      const to = entityMap.get(toId);
      const metadataTypeV = entityTypeToMetadataType.get(to.type);
      const rule = {
        name: 'assign-static-entity-metadata',
        description: `Common rule for setting ${metadataTypeV}:${to.provider}/${to.external_id}`,
        config: {
          metadata: [
            {
              metadataType: metadataTypeV,
              items: [
                {
                  provider: to.provider,
                  externalId: to.external_id,
                },
              ],
            },
          ],
        },
        match: {
          type: 'multi-source',
          value: {
            items: [],
          },
        },
      };
      def.from.forEach((fromId) => {
        const from = entityMap.get(fromId);
        const matchItem = {
          provider: from.provider,
          externalId: from.external_id,
          name: from.name,
        };
        rule.match.value.items.push(matchItem);
      });
      pipeline.rules.push(rule);
    });
  });
  return pipeline;
}

/**
 * Read pipeline configurations from partial static metadata files and store them in a list of pipelines.
 * @param {string[]} staticmetadatafilenames
 * @param {Object[]} pipelines
 * @returns {Promise<void>}
 */
async function readPipelinesFromStaticMetadataFiles(staticmetadatafilenames, pipelines) {
  if (staticmetadatafilenames) {
    for (const staticmetadatafilename of staticmetadatafilenames) {
      const staticMetadata = JSON.parse(fs.readFileSync(staticmetadatafilename).toString());
      // eslint-disable-next-line no-await-in-loop
      const pipeline = await convertStaticMetadataToPipeline(staticMetadata);
      pipeline.filename = staticmetadatafilename;
      pipelines.push(pipeline);
    }
  }
}

/**
 * Return a reasonable guess for the entity type given the external ID of an entity.
 * @param {string} externalId
 * @returns {string|*}
 */
function getTypeFromExternalId(externalId) {
  let match = FTS_TYPE_REGEX.exec(externalId);
  if (match) {
    return match.groups.type;
  }
  match = TYPE_REGEX.exec(externalId);
  if (match) {
    return match.groups.type;
  }
  return 'unknown';
}

/**
 *
 * @param item
 * @returns {Entity}
 */
function makeEntity(item) {
  const type = getTypeFromExternalId(item.externalId);
  return {
    provider: item.provider,
    external_id: item.externalId,
    name: item.name || item.externalId,
    type,
    type_display: type.charAt(0).toUpperCase() + type.slice(1),
  };
}

/**
 * Given a "match" configuration, return an array of unresolved entities in it.
 * @param {Object} match
 * @returns {Entity[]}
 */
function getEntitiesFromMatches(match) {
  if (!match) {
    return [];
  }
  switch (match.type) {
    case 'multi-source':
      return match.value.items.map(item => makeEntity(item));

    case 'source':
      return [makeEntity(match.value)];

    case 'multi-annotation':
      return [];

    case 'annotation':
      return [];

    default:
      return null;
  }
}

/**
 * Given a "rule" configuration, return an array of unresolved entities in it.
 * @param {Object} rule
 * @returns {Entity[]}
 */
function getEntitiesFromActions(rule) {
  switch (rule.name) {
    case 'assign-static-entity-metadata':
      return rule.config.metadata.reduce((entities, metadata) => {
        metadata.items.forEach((item) => {
          entities.push(makeEntity(item));
        });
        return entities;
      }, []);

    case 'modify-static-entity-tags':
      return rule.config.entityTags.map(item => (makeEntity(item)));

    case 'modify-derived-metadata':
      if (!rule.config.maps) {
        return [];
      }
      return rule.config.maps.reduce((entities, map) => {
        map.map.forEach((item) => {
          entities.push(makeEntity(item));
        });
        return entities;
      }, []);

    case 'uncluster':
      return [];

    default:
      return null;
  }
}

/**
 * Given a list of pipeline configurations, return a map of entity keys and matching unresolved entities.
 * @param {Object[]} pipelines
 * @returns {Map<string, Entity>}
 */
function extractEntitiesFromPipelines(pipelines) {
  /**
   * @type {Map<string, Entity>}
   */
  const entityMap = new Map();

  pipelines.forEach((pipeline) => {
    const pipelineName = `Pipeline ID#${pipeline.id}`;
    // put the entities from the pipeline default matches list into the matchMap
    let entities = getEntitiesFromMatches(pipeline.match);
    if (!entities) {
      throw new Error(`Bad default match type ${pipeline.match.type} in ${pipelineName}`);
    }
    entities.forEach((entity) => { entityMap.set(entityKey(entity), entity); });

    pipeline.rules.forEach((rule) => {
      entities = getEntitiesFromMatches(rule.match);
      if (!entities) {
        throw new Error(`Bad default match type ${rule.match.type} in ${pipelineName}, rule ${rule.description}`);
      }
      entities.forEach((entity) => { entityMap.set(entityKey(entity), entity); });
      entities = getEntitiesFromActions(rule);
      if (!entities) {
        throw new Error(`Bad rule action name ${rule.name} in ${pipelineName}, rule ${rule.description}`);
      }
      entities.forEach((entity) => { entityMap.set(entityKey(entity), entity); });
    });
  });
  return entityMap;
}

/**
 * Add unresolved entities to the list of them from the sourceToContributorsMap
 * @param {Map<string, string>} sourceToContributorsMap
 * @param {Map<string, Entity>} unresolvedEntities
 */
function extractEntitiesFromSourceToContributorsMap(sourceToContributorsMap, unresolvedEntities) {
  sourceToContributorsMap.forEach((value, key) => {
    if (!unresolvedEntities.has(key)) unresolvedEntities.set(key, unEntityKey(key));
    if (!unresolvedEntities.has(value)) unresolvedEntities.set(value, unEntityKey(value));
  });
}

/**
 *
 * @param {Map<string,Entity>} unresolvedEntities
 * @returns {Promise<Map<string,Entity>>}
 */
async function resolveEntitiesWithApi(unresolvedEntities) {
  const entityService = FtsApiEntitiesService.getInstance();
  const resolved = await entityService.resolveEntities([...unresolvedEntities.values()]
    .filter(entity => (entity.name && entity.type && entity.type_display)));
  return resolved.reduce((map, entity) => {
    map.set(entityKey(entity), entity);
    return map;
  }, new Map());
}

/**
 * Given a list of pipelines, extract all the entities that need to be resolved and resolve them.
 * @param pipelines
 * @param sourceToContributorsMap
 * @returns {Promise<Map<string, Entity>>}
 */
async function resolveEntities(pipelines, sourceToContributorsMap) {
  const unresolvedEntities = extractEntitiesFromPipelines(pipelines);
  extractEntitiesFromSourceToContributorsMap(sourceToContributorsMap, unresolvedEntities);
  return resolveEntitiesWithApi(unresolvedEntities);
}

/**
 * Comparison method for metadata types, to get desired order for output.
 * @param {string} aString
 * @param {string} bString
 * @returns {number}
 */
function compare(aString, bString) {
  const a = metadataSortOrder.get(aString);
  const b = metadataSortOrder.get(bString);
  if (a && b) return a - b;
  if (!a && b) return 1;
  if (!b && a) return -1;
  if (aString > bString) return 1;
  if (aString < bString) return -1;
  return 0;
}

/**
 *
 * @param {Map<string,Map<string,Set<string>>>} matchMap
 * @returns {Map<string,Map<string,Set<string>>>}
 */
function sortMatchMap(matchMap) {
  matchMap.forEach((actionMap, match) => {
    actionMap.forEach((actionSet, metadataType) => {
      actionMap.set(metadataType, new Set([...actionSet].sort()));
    });
    matchMap.set(match, new Map([...actionMap.entries()].sort((a, b) => compare(a.key, b.key))));
  });
  return new Map([...matchMap.entries()].sort());
}

/**
 * Return a string that describes an entity match item.
 * @param {Entity} entity - a resolved entity
 * @param {Map<string,Entity>} entities - A map of external_id/provider entity strings to Entity objects
 * @returns {string}
 */
function resolvedEntityToMatchName(entity, entities) {
  if (!entity) return '';
  return `${entity.name} [${entity.id}][${entity.type}]`;
}

/**
 * Return a string that describes an entity match item.
 * @param {Object} item - a match.value item for match-type 'source' or a single match.value.item
 * for match-type 'multi-source'
 * @param {Map<string,Entity>} entities - A map of external_id/provider entity strings to Entity objects
 * @returns {string}
 */
function unresolvedEntityToMatchName(item, entities) {
  const entity = entities.get(entityKey(item));
  return resolvedEntityToMatchName(entity, entities);
}

/**
 * Return a string that describes an entity match item.
 * @param {Object} item - a match.value item for match-type 'source' or a single match.value.item
 * for match-type 'multi-source'
 * @param {Map<string,Entity>} entities - A map of external_id/provider entity strings to Entity objects
 * @returns {string}
 */
function unresolvedEntityToEntityKey(item) {
  return entityKey(item);
}

/**
 * Return a string that describes an entity match item.
 * @param {string} entityKeyString - an entityKey string
 * @param {Map<string,Entity>} entities - A map of external_id/provider entity strings to Entity objects
 * @returns {string}
 */
function entityKeyToMatchName(entityKeyString, entities) {
  const entity = entities.get(entityKeyString);
  return resolvedEntityToMatchName(entity, entities);
}

/**
 * Return a string that describes a static entity metadata action item.
 * @param {Object} item - a config.metadata.items item for rule action-type 'assign-static-entity-metadata'
 * @param {Map<string,Entity>} entities - A map of external_id/provider entity strings to Entity objects
 * @returns {string}
 */
function unresolvedEntityToStaticMetadataActionName(item, entities) {
  return unresolvedEntityToMatchName(item, entities);
}

/**
 * Return a string that describes a static entity tag action item.
 * @param {Object} item - a config.entityTags item for rule action-type 'modify-static-entity-tag'
 * @param {Map<string,Entity>} entities - A map of external_id/provider entity strings to Entity objects
 * @returns {string}
 */
function unresolvedEntityToStaticEntityTagActionName(item, entities) {
  const action = (item.action) ? item.action : 'add';
  // eslint-disable-next-line no-nested-ternary
  const relevance = (action !== 'add') ? '' : ((item.relevance) ? item.relevance : 'high');
  return `${unresolvedEntityToMatchName(item, entities)}[${action}][${relevance}]`;
}

/**
 * Return a string that describes a derived metadata action item.
 * @param {Object} item - a config.metadata item for rule action-type 'modify-derived-metadata-tag'
 * @returns {string}
 */
function derivedMetadataActionName(item) {
  const action = (item.action) ? item.action : 'add';
  return `[Derived][${action}]`;
}

/**
 * Return a string that describes an annotation match item.
 * @param {Object} item - a match.value item for match-type 'annotation' or a single match.value.item
 * for match-type 'multi-annotation'
 * @returns {string}
 */
function annotationDescriptionToMatchName(item) {
  return `${item.description} [${item.value}][${item.name.substring(item.name.lastIndexOf('/') + 1)}]`;
}

/**
 * Get a set of the strings that describe each match from match configuration.
 * @param {Object} match
 * @returns {Set<string>}
 */
function getMatches(match) {
  if (!match) {
    return new Set();
  }
  switch (match.type) {
    case 'multi-source':
      return new Set(match.value.items.map(item => unresolvedEntityToEntityKey(item)));
    case 'source':
      return new Set([unresolvedEntityToEntityKey(match.value)]);
    case 'multi-annotation':
      return new Set(match.value.items.map(item => annotationDescriptionToMatchName(item)));
    case 'annotation':
      return new Set([annotationDescriptionToMatchName(match.value)]);
    default:
      return null;
  }
}

/**
 *
 * @param {Object} rule
 * @param {Map<string,Entity>} entities
 * @returns {Map<string,Set<string>>}  Map of metadata type name to values to set
 */
function getActions(rule, entities) {
  const map = new Map();
  if (rule.name === 'assign-static-entity-metadata') {
    rule.config.metadata.forEach((metadata) => {
      const targetType = metadata.metadataType;
      // create a set of entity names under this metadata type
      const targets = new Set(metadata
        .items
        .map(item => unresolvedEntityToStaticMetadataActionName(item, entities)));
      // find the metadata type in the result map
      const targetTypeValue = map.get(targetType);
      // if not found, add the target type as key, and set of entities as value to the map
      if (!targetTypeValue) {
        map.set(targetType, targets);
      } else {
        // otherwise, add the elements of the set as values to the existing key
        targets.forEach((target) => {
          targetTypeValue.add(target);
        });
      }
    });
  } else if (rule.name === 'modify-static-entity-tags') {
    const targetType = 'entityTags';
    const targets = new Set(rule
      .config
      .entityTags
      .map(item => unresolvedEntityToStaticEntityTagActionName(item, entities)));
    const targetTypeValue = map.get(targetType);
    if (!targetTypeValue) {
      map.set(targetType, targets);
    } else {
      targets.forEach((target) => {
        targetTypeValue.add(target);
      });
    }
  } else if (rule.name === 'modify-derived-metadata') {
    rule.config.metadata.forEach((metadata) => {
      const { metadataType } = metadata;
      const value = derivedMetadataActionName(metadata);
      const metadataTypeSet = map.get(metadataType);
      if (!metadataTypeSet) {
        map.set(metadataType, new Set([value]));
      } else {
        metadataTypeSet.add(value);
      }
    });
  } else if (rule.name === 'uncluster') {
    const metadataType = 'uncluster';
    const value = 'uncluster';
    const metadataTypeSet = map.get(metadataType);
    if (!metadataTypeSet) {
      map.set(metadataType, new Set([value]));
    } else {
      metadataTypeSet.add(value);
    }
  } else {
    return null;
  }
  return map;
}

/**
 * Aggregate the data by matches for spreadsheet output.
 * @param {Object[]} pipelines
 * @param {Map<string,Entity>} entities
 * @returns {Map<string, Map<string, Set<string>>>}
 */
function aggregateByMatches(pipelines, entities) {
  /**
   * @type {Map<string, Map<string, Set<string>>>}
   */
  const matchMap = new Map();
  pipelines.forEach((pipeline) => {
    const pipelineName = `Pipeline ID#${pipeline.id}`;
    const defaultMatches = getMatches(pipeline.match);
    if (!defaultMatches) {
      throw new Error(`Bad default match type ${pipeline.match.type} in ${pipelineName}`);
    }
    pipeline.rules.forEach((rule) => {
      let matches = getMatches(rule.match);
      if (!matches) {
        throw new Error(`Bad rule match type ${rule.match.type} in ${pipelineName}`);
      }
      if (matches.size === 0) {
        matches = defaultMatches;
      }
      if (matches.size > 0) {
        const actions = getActions(rule, entities);
        if (!actions) {
          throw new Error(`Bad rule action name ${rule.name} in ${pipelineName}`);
        }
        if (actions.size > 0) {
          matches.forEach((match) => {
            let actionMap = matchMap.get(match);
            if (!actionMap) {
              actionMap = new Map();
              matchMap.set(match, actionMap);
            }
            actions.forEach((actionValue, actionKey) => {
              let actionSet = actionMap.get(actionKey);
              if (!actionSet) {
                actionSet = new Set();
                actionMap.set(actionKey, actionSet);
              }
              [...actionValue.values()].forEach(value => actionSet.add(value));
            });
          });
        }
      }
    });
  });

  return sortMatchMap(matchMap);
}

function normalizeMatchesForMerging(match) {
  switch (match.type) {
    case 'source':
      match.type = 'multi-source';
      match.value = { items: [match.value] };
      break;
    case 'annotation':
      match.type = 'multi-annotation';
      match.value = { items: [match.value] };
      break;
    default:
      break;
  }
}

function mergeMatches(match1, match2) {
  if (!match2) {
    return;
  }
  normalizeMatchesForMerging(match1);
  normalizeMatchesForMerging(match2);

  if (match1.type !== match2.type) {
    throw new Error('Match types must be the same to merge matches.');
  }

  const matches = getMatches(match1);
  let newItems;
  switch (match2.type) {
    case 'multi-source':
      newItems = match2.value.items.filter(item => !matches.has(unresolvedEntityToEntityKey(item)));
      break;
    case 'multi-annotation':
      newItems = match2.value.items.filter(item => !matches.has(annotationDescriptionToMatchName(item)));
      break;
    default:
      throw new Error(`Invalid match type ${match2.type}.`);
  }
  if (newItems) {
    match1.value.items = match1.value.items.concat(newItems);
  }
}

/**
 * Return a Map of rule definitions to the rule.  De-dupes rule definitions and merges matches as needed.
 * @param {Map<string, Object>} existing
 * @param {Object[]} rules
 * @returns {Map<string, Object>}
 */
function getRulesMap(existing, rules) {
  const ret = existing || new Map();
  rules.forEach((rule) => {
    const key = `${JSON.stringify(rule.config)}|${(rule.match || { type: 'default' }).type}`;
    if (ret.has(key) && !key.endsWith('|default')) {
      mergeMatches(ret.get(key).match, rule.match);
    } else {
      ret.set(key, rule);
    }
  });
  return ret;
}

/**
 * Aggregate by actions for JSON output.
 * @param {Object[]} pipelines
 * @param {Map<string,Entity>} entities
 * @returns {Map<string, Map<string, Set<string>>>}
 */
function aggregateByActions(pipelines, entities) {
  const agg = {
    apiVersion: undefined,
    id: undefined,
    active: true,
    description: undefined,
    match: {
      type: undefined,
      description: undefined,
      value: undefined,
    },
    rules: [],
  };

  let rulesMap = null;
  pipelines.forEach((pipeline) => {
    if (!agg.apiVersion) {
      agg.apiVersion = pipeline.apiVersion;
      agg.id = pipeline.id;
      agg.description = pipeline.description;
    }
    if (pipeline.match) {
      if (!agg.match.value) {
        agg.match = pipeline.match;
      } else {
        if (pipeline.match.type !== agg.match.type) {
          throw new Error('Default match types in different pipelines must all be the same.');
        }
        mergeMatches(agg.match, pipeline.match);
      }
    }

    rulesMap = getRulesMap(rulesMap, pipeline.rules);
  });
  rulesMap.forEach(rule => agg.rules.push(rule));

  return agg;
}

/**
 * Make a string compliant with simple CSV.
 * @param str
 * @returns {string}
 */
function makeFieldCsv(str) {
  if (str.length === 0 || str.includes('"') || str.includes(',')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Write the aggregated output to a CSV file named in the argument.
 * @param {string} outfile - The name of the output file
 * @param {Map<string,Map<string,Set<string>>>} agg (match name, map<metadatatypename, values>)
 * @param {Map<string, Entity>} entities - entityKey to Entity
 * @param {Map<string, string>} sourceToContributorMap - entityKey to entityKey
 * @returns {Promise<void>}
 */
async function writeCsv(outfile, agg, entities, sourceToContributorMap) {
  const CONTRIBUTOR = 0;
  const SOURCE = 1;
  const OTHER = 2;
  const display = [CONTRIBUTOR, SOURCE, OTHER];
  const headers = ['Contributor', 'Source', 'Other'];
  const types = [new Map(), new Map(), new Map()];
  agg.forEach((value, matchName) => {
    value.forEach((data, metadataType) => {
      let type = OTHER;
      if (matchName.startsWith('contributor_')) type = CONTRIBUTOR;
      else if (matchName.startsWith('source_')) type = SOURCE;
      types[type].set(metadataType, metadataSortOrder.get(metadataType));
    });
  });

  const columns = [];
  const writeStream = await fs.createWriteStream(outfile);
  let record = '';
  display.forEach((i) => {
    columns.push(new Map([...types[i].entries()].sort((a, b) => a[1] - b[1])));
    let columnNumber = 1;
    // eslint-disable-next-line no-plusplus
    columns[i].forEach((value, key) => columns[i].set(key, columnNumber++));
    if (columns[i].size > 0) {
      if (record.length > 0) record += ',';
      record += headers[i];
      columns[i].forEach((columnNo, metadataType) => {
        record += `,${metadataType}`;
      });
    }
  });
  await writeStream.write(`${record}\n`);

  const done = new Set();
  for (let iteration = 0; iteration < 2; iteration += 1) {
    for (const something of agg.entries()) {
      const key = something[0];
      const value = something[1];
      let keys;
      let values;
      let matches;

      if (iteration === 0) {
        if (key.startsWith('source_')) {
          keys = [sourceToContributorMap.get(key), key, ''];
          values = [agg.get(keys[CONTRIBUTOR]) || new Map(), value, new Map()];
          matches = [
            entityKeyToMatchName(keys[CONTRIBUTOR], entities) || keys[CONTRIBUTOR] || '',
            entityKeyToMatchName(key, entities) || key || '',
            '',
          ];
          done.add(keys[CONTRIBUTOR]);
        } else if (!key.startsWith('contributor_')) {
          keys = ['', '', key];
          values = [new Map(), new Map(), value];
          matches = ['', '', key];
        }
      } else if (iteration === 1) {
        if (key.startsWith('contributor_') && !done.has(key)) {
          keys = [key, '', ''];
          values = [value, new Map(), new Map()];
          matches = [entityKeyToMatchName(key, entities) || key, '', ''];
        }
      }
      if (keys) {
        let row = '';
        display.filter(i => columns[i].size > 0).forEach((i) => {
          if (row.length > 0) row += ',';
          row += makeFieldCsv(matches[i]);
          columns[i].forEach((columnNo, metadataType) => {
            if (values[i].has(metadataType)) {
              row += `,${makeFieldCsv([...values[i].get(metadataType).values()].join('; '))}`;
            } else {
              row += ',""';
            }
          });
        });
        // eslint-disable-next-line no-await-in-loop
        await writeStream.write(`${row}\n`);
      }
    }
  }

  await writeStream.end();
}

/**
 * Write the aggregated output to a CSV file named in the argument.
 * @param {string} outfile - The name of the output file
 * @param {Map<string,Map<string,Set<string>>>} agg
 * @returns {Promise<void>}
 */
async function writeXlsx(outfile, agg) {
  // TODO!
}

async function writeJson(jsonfile, agg) {
  const writeStream = fs.createWriteStream(jsonfile);
  await writeStream.write(`${JSON.stringify(agg)}`);
  await writeStream.end();
}

/**
 * The main execution of the program.
 * @param {string[]} opts.filename
 * @param {string[]} opts.pipeline
 * @param {string} opts.sourcemap
 * @param {string} opts.outfile
 * @param {string} opts.xlsxfile
 * @param {string} opts.jsonfile
 * @param {string[]} opts.staticmetadatafile
 * @returns {Promise<void>}
 */
async function run({ opts }) {
  const pipelines = [];
  readPipelinesFromFiles(opts.filename, pipelines);
  await readPipelinesFromControlPlane(opts.pipeline, pipelines);
  await readPipelinesFromStaticMetadataFiles(opts.staticmetadatafile, pipelines);
  if (PipelineValidation.validatePipelines(pipelines)) {
    const sourceToContributorMap = readSourceToContributorMapFromFile(opts.sourcemap);
    const entities = await resolveEntities(pipelines, sourceToContributorMap);
    if (opts.outfile || opts.xlsxfile) {
      const agg = aggregateByMatches(pipelines, entities);
      if (opts.outfile) {
        await writeCsv(opts.outfile, agg, entities, sourceToContributorMap);
      }
      if (opts.xlsxfile) {
        await writeXlsx(opts.xlsxfile, agg);
      }
    }
    if (opts.jsonfile) {
      const agg = aggregateByActions(pipelines, entities);
      await writeJson(opts.jsonfile, agg);
    }
  }
}

module.exports = run;
