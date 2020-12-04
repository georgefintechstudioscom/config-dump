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
  ['uncluster', 1000],
  ['entityTags', 2000],
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
 * Read pipeline configurations from files and store them in a list of pipelines.
 * @param {string[]} filenames
 * @param {Object[]} pipelines
 * @returns {Promise<void>}
 */
async function readPipelinesFromFiles(filenames, pipelines) {
  if (filenames) {
    filenames.reduce((arr, filename) => {
      const pipeline = JSON.parse(fs.readFileSync(filename));
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
  if (pipelineIds && pipelineIds.size > 0) {
    throw new Error('Not implemented yet.');
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
 * Return a string that is a key for looking up an entity given an unresolved entity item.
 * @param {Object} item
 * @returns {string} A standard key for looking up an unresolved entity
 */
function entityKey(item) {
  return `${item.external_id || item.externalId}/${item.provider}`;
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
 *
 * @param {Map<string,Entity>} unresolvedEntities
 * @returns {Promise<Map<string,Entity>>}
 */
async function resolveEntitiesWithApi(unresolvedEntities) {
  const entityService = FtsApiEntitiesService.getInstance();
  const resolved = await entityService.resolveEntities([...unresolvedEntities.values()]);
  return resolved.reduce((map, entity) => {
    map.set(entityKey(entity), entity);
    return map;
  }, new Map());
}

/**
 * Given a list of pipelines, extract all the entities that need to be resolved and resolve them.
 * @param pipelines
 * @returns {Promise<Map<string, Entity>>}
 */
async function resolveEntities(pipelines) {
  const unresolvedEntities = extractEntitiesFromPipelines(pipelines);
  return resolveEntitiesWithApi(unresolvedEntities);
}

/**
 *
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
 * @param {Object} item - a match.value item for match-type 'source' or a single match.value.item
 * for match-type 'multi-source'
 * @param {Map<string,Entity>} entities - A map of external_id/provider entity strings to Entity objects
 * @returns {string}
 */
function unresolvedEntityToMatchName(item, entities) {
  const entity = entities.get(entityKey(item));
  return `${entity.name} [${entity.id}][${entity.type}]`;
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
 *
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
  return `${item.description} [${item.value}][${item.name.substring(item.name.lastIndexOf('/') + 1)}`;
}

/**
 * Get a list of the strings that describe each match from match configuration.
 * @param {Object} match
 * @param {Map<string,Entity>} entities
 * @returns {Set<string>}
 */
function getMatches(match, entities) {
  if (!match) {
    return new Set();
  }
  switch (match.type) {
    case 'multi-source':
      return new Set(match.value.items.map(item => unresolvedEntityToMatchName(item, entities)));
    case 'source':
      return new Set([unresolvedEntityToMatchName(match.value, entities)]);
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
 *
 * @param {Object[]} pipelines
 * @param {Map<string,Entity>} entities
 * @returns {Map<string, Map<string, Set<string>>>}
 */
function aggregate(pipelines, entities) {
  /**
   * @type {Map<string, Map<string, Set<string>>>}
   */
  const matchMap = new Map();
  pipelines.forEach((pipeline) => {
    const pipelineName = `Pipeline ID#${pipeline.id}`;
    const defaultMatches = getMatches(pipeline.match, entities);
    if (!defaultMatches) {
      throw new Error(`Bad default match type ${pipeline.match.type} in ${pipelineName}`);
    }
    pipeline.rules.forEach((rule) => {
      let matches = getMatches(rule.match, entities);
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

/**
 * Make a string compliant with simple CSV.
 * @param str
 * @returns {string}
 */
function makeFieldCsv(str) {
  if (str.includes('"') || str.includes(',')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Write the aggregated output to a CSV file named in the argument.
 * @param {string} outfile - The name of the output file
 * @param {Map<string,Map<string,Set<string>>>} agg
 * @returns {Promise<void>}
 */
async function writeCsv(outfile, agg) {
  const types = new Map();
  agg.forEach((value) => {
    value.forEach((data, metadataType) => {
      types.set(metadataType, metadataSortOrder.get(metadataType));
    });
  });
  const columns = new Map([...types.entries()].sort((a, b) => a[1] - b[1]));
  let columnNumber = 1;
  // eslint-disable-next-line no-plusplus
  columns.forEach((value, key) => columns.set(key, columnNumber++));

  const writeStream = fs.createWriteStream(outfile);
  let record = 'Match';
  columns.forEach((columnNo, metadataType) => {
    record += `,${metadataType}`;
  });
  writeStream.write(`${record}\n`);

  agg.forEach((value, key) => { // map, match string
    let row = makeFieldCsv(key);
    columns.forEach((columnNo, metadataType) => {
      if (value.has(metadataType)) {
        row += `,${makeFieldCsv([...value.get(metadataType).values()].join('; '))}`;
      } else {
        row += ',""';
      }
    });
    writeStream.write(`${row}\n`);
  });

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

/**
 * The main execution of the program.
 * @param {string[]} opts.filename
 * @param {string[]} opts.pipeline
 * @param {string} opts.outfile
 * @param {string} opts.xlsxfile
 * @returns {Promise<void>}
 */
async function run({ opts }) {
  const pipelines = [];
  await readPipelinesFromFiles(opts.filename, pipelines);
  await readPipelinesFromControlPlane(opts.pipeline, pipelines);
  if (PipelineValidation.validatePipelines(pipelines)) {
    const entities = await resolveEntities(pipelines);
    const agg = aggregate(pipelines, entities);
    if (opts.outfile) {
      await writeCsv(opts.outfile, agg);
    }
    if (opts.xlsxfile) {
      await writeXlsx(opts.xlsxfile, agg);
    }
  }
}

module.exports = run;
