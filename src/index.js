require('dotenv/config');
const fs = require('fs');
const assert = require('assert');
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
  if (validatePipelines(pipelines)) {
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
 * Given a list of pipelines, extract all the entities that need to be resolved and resolve them.
 * @param pipelines
 * @returns {Promise<Map<string, Entity>>}
 */
async function resolveEntities(pipelines) {
  const unresolvedEntities = extractEntitiesFromPipelines(pipelines);
  return await resolveEntitiesWithApi(unresolvedEntities);
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
    type_display: type.charAt(0).toUpperCase() + type.slice(1)
  }
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
  if (match.type === 'multi-source') {
    return match.value.items.map((item) => makeEntity(item));

  } else if (match.type === 'source') {
    return [makeEntity(match.value)];

  } else if (match.type === 'multi-annotation') {
    return [];

  } else if (match.type === 'annotation') {
    return [];

  } else {
    return null;
  }
}

/**
 * Given a "rule" configuration, return an array of unresolved entities in it.
 * @param {Object} rule
 * @returns {Entity[]}
 */
function getEntitiesFromActions(rule) {
  if (rule.name === 'assign-static-entity-metadata') {
    return rule.config.metadata.reduce((entities, metadata) => {
      metadata.items.forEach((item) => {
        entities.push(makeEntity(item));
      });
      return entities;
    }, []);

  } else if (rule.name === 'modify-static-entity-tags') {
    return rule.config.entityTags.map((item) => (makeEntity(item)));

  } else if (rule.name === 'modify-derived-metadata') {
    if (!rule.config.maps) {
      return [];
    }
    return rule.config.maps.reduce((entities, map) => {
      map.map.forEach((item) => {
        entities.push(makeEntity(item));
      });
      return entities;
    }, []);

  } else if (rule.name === 'uncluster') {
    return [];

  } else {
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
    entities.forEach((entity) => { entityMap.set(entityKey(entity), entity) });

    pipeline.rules.forEach((rule) => {
      let entities = getEntitiesFromMatches(rule.match);
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
 * Return a string that is a key for looking up an entity given an unresolved entity item.
 * @param {Object} item
 * @returns {string} A standard key for looking up an unresolved entity
 */
function entityKey(item) {
  return (item.external_id || item.externalId) + '/' + item.provider;
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
  if (match.type === 'multi-source') {
    return new Set(match.value.items.map((item) => unresolvedEntityToMatchName(item, entities)));
  } else if (match.type=== 'source') {
    return new Set([unresolvedEntityToMatchName(match.value, entities)]);
  } else if (match.type === 'multi-annotation') {
    return new Set(match.value.items.map((item) => annotationDescriptionToMatchName(item)));
  } else if (match.type === 'annotation') {
    return new Set([annotationDescriptionToMatchName(match.value)]);
  } else {
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
      const targets = new Set(metadata.items.map((item) => unresolvedEntityToStaticMetadataActionName(item, entities)));
      // find the metadata type in the result map
      let targetTypeValue = map.get(targetType);
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
    const targets = new Set(rule.config.entityTags.map((item) => unresolvedEntityToStaticEntityTagActionName(item, entities)));
    let targetTypeValue = map.get(targetType);
    if (!targetTypeValue) {
      map.set(targetType, targets);
    } else {
      targets.forEach((target) => {
        targetTypeValue.add(target);
      });
    }

  } else if (rule.name === 'modify-derived-metadata') {
    rule.config.metadata.forEach((metadata) => {
      const metadataType = metadata.metadataType;
      const value = derivedMetadataActionName(metadata);
      let metadataTypeSet = map.get(metadataType);
      if (!metadataTypeSet) {
        map.set(metadataType, new Set([value]));
      } else {
        metadataTypeSet.add(value);
      }
    });

  } else if (rule.name === 'uncluster') {
    const metadataType = 'uncluster';
    const value = 'uncluster';
    let metadataTypeSet = map.get(metadataType);
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
              [...actionValue.values()].forEach((value) => actionSet.add(value));
            });
          });
        }
      }
    });
  });

  return sortMatchMap(matchMap);
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
    actionMap.forEach((actionSet,  metadataType) => {
      actionMap.set(metadataType, new Set([...actionSet].sort()));
    });
    matchMap.set(match, new Map([...actionMap.entries()].sort((a, b) => compare(a.key, b.key))));
  });
  return new Map([...matchMap.entries()].sort());
}


/**
 * Make a string compliant with simple CSV.
 * @param str
 * @returns {string}
 */
function makeFieldCsv(str) {
  if (str.includes('"') || str.includes(',')) {
    return '"' + str.replace(/"/g, '""') + '"';
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
  columns.forEach((value, key) => columns.set(key, columnNumber++));

  let writeStream = fs.createWriteStream(outfile);
  let record = 'Match';
  columns.forEach((columnNumber, metadataType) => {
    record += ',' + metadataType;
  });
  writeStream.write(record + '\n');

  agg.forEach((value, key) => {  // map, match string
    let record = makeFieldCsv(key);
    columns.forEach((columnNumber, metadataType) => {
      if (value.has(metadataType)) {
        record += ',' + makeFieldCsv([...value.get(metadataType).values()].join('; '));
      } else {
        record += ',""';
      }
    });
    writeStream.write(record + '\n');
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
 * Check the pipelines for correct format and data.
 * @param {Object[]} pipelines
 * @return {boolean} Success or failure
 */
function validatePipelines(pipelines) {
  const errors = [];
  pipelines.forEach((pipeline) => {
      tagAndAddErrors(validateMatch(pipeline.match), `validation error: pipeline #${pipeline.id}, file ${pipeline.filename}.Default Match`, errors);
      tagAndAddErrors(validateRules(pipeline.rules), `validation error: pipeline #${pipeline.id}, file ${pipeline.filename}`, errors);
  });
  errors.forEach((error) => console.error(error));
  return errors.length === 0;
}

const annotationMatchMembers = [
  'matched.document-ingestion.fintechstudios.com/channel-id',
  'matched.document-ingestion.fintechstudios.com/document-id',
  'matched.document-ingestion.fintechstudios.com/source-id',
];

const metadataTypes = [
  'cik',
  'docCitations',
  'docNumber',
  'docSummary',
  'docTypes',
  'filedAs',
  'filingDate',
  'filingType',
  'issuingAgencies',
  'jurisdictions',
  'publicationDate',
  'volumeNumber',
  'volumes',
];

function reassertOrThrow(ex, item, message) {
  if (ex.name === 'AssertionError') {
    assert(false, `${message}${item.description || item.name ? `(${item.description || item.name})` : ''}.${ex.message}`);
  }
  else {
    throw ex;
  }
}

const _parent = '_parent';

function condition(value, message, errors) {
  if (!value) errors.push(message);
  return value;
}

function getThing(thing, defItem, configItem) {
  const keyProperty = `${thing}Key`;
  if (defItem[keyProperty]) {
    let key = null;
    while (configItem && !key) {
      key = configItem[defItem[keyProperty]];
      configItem = configItem[_parent];
    }
    return defItem[`${thing}Map`].get(key);
  } else {
    return defItem[thing];
  }
}

function tagAndAddErrors(subErrors, tag, errors) {
  subErrors.forEach((subError) => {
    errors.push(`${tag}.${subError}`);
  });
}

/**
 *
 * @param {Object} configItem
 * @param {Object} definition
 * @param {Object} parentConfigItem
 * @param {Object} parentDefinition
 */
function check(configItem, definition, parentConfigItem, parentDefinition) {
  const errors = [];
  if (!configItem && !definition) {
    return errors;
  }
  // link to the parent
  configItem[_parent] = parentConfigItem;
  definition[_parent] = parentDefinition;
  // check each property in the config item
  for (const [key, value] of Object.entries(configItem)) {
    // don't process the link to parent
    if (key === _parent) continue;
    // get the definition for the property
    const defItem = definition[key];
    if (!condition(defItem, `${key}: Unexpected property "${key}".`, errors)) continue;
    if (defItem.type === 'object' || defItem.type === 'array') {
      const isObject = defItem.type === 'object';
      (isObject ? [value] : value).forEach((item, index) => {
          tagAndAddErrors(check(item, getThing('def', defItem, configItem), configItem, definition), `${key}${!isObject ? `[${index}]` : ''}`, errors);
      });
    } else if (defItem.type === 'string-array') {
      value.forEach((item, index) => {
        condition(typeof (item) === 'string', `${key}: Invalid value type "${typeof (item)}" for property "${key}[${index}]".  Must be "string".`, errors);
      });
    } else {
      condition(typeof (value) === defItem.type, `${key}: Invalid value type "${typeof (value)}" for property "${key}".  Must be "${defItem.type}".`, errors);
      const oneOfSet = getThing('oneOf', defItem, configItem);
      condition(!oneOfSet || oneOfSet.has(value), `${key}: Value of "${value}" is invalid.`, errors);
    }
  }
  // now check to make sure all required items in this definition are present
  for (const [key, defItem] of Object.entries(definition)) {
    if (key === _parent) continue;
    const requiredFlag = getThing('required', defItem, configItem);
    condition(Object.keys(configItem).includes(key) || !requiredFlag, `${key}: Missing required property "${key}".`, errors);
  }
  return errors;
}

const entityDefinition = {
  provider: {
    required: true,
    type: 'string',
  },
  externalId: {
    required: true,
    type: 'string',
  },
  name: {
    required: false,
    type: 'string',
  },
};

const matchTypes = [
  'multi-source',
  'source',
  'multi-annotation',
  'annotation',
];

const multiSourceMatch = {
    items: {
      required: true,
      type: 'array',
      def: entityDefinition,
    }
};

const annotationDefinition = {
    name: {
      required: true,
      type: 'string',
      oneOf: new Set(annotationMatchMembers),
    },
    value: {
      required: true,
      type: 'string',
    },
    description: {
      required: false,
      type: 'string',
    },
};

const multiAnnotationMatch = {
    items: {
      required: true,
      type: 'array',
      def: annotationDefinition,
    }
};

const matchMap = new Map([
  ['multi-source', multiSourceMatch],
  ['source', entityDefinition],
  ['multi-annotation', multiAnnotationMatch],
  ['annotation', annotationDefinition],
]);

const matchDef = {
    type: {
      required: true,
      type: 'string',
      oneOf: new Set(matchTypes),
    },
    description: {
      required: false,
      type: 'string',
    },
    value: {
      required: true,
      type: 'object',
      defKey: 'type',
      defMap: matchMap,
    },
};

const assignStaticEntityMetadataRule = {
    metadata: {
      required: true,
      type: 'array',
      def: {
        metadataType: {
          required: true,
          type: 'string',
        },
        items: {
          required: true,
          type: 'array',
          def: entityDefinition
        }
      }
    }
};

const functions = [
    'createEntity',
    'federalRegisterIssuingAgencies',
    'federalRegisterNoticesIssuingAgencies',
    'federalRegisterDocTypes',
    'federalRegisterExecutiveOfficeDocTypes',
    'federalRegisterNoticesDocTypes',
    'findEntities',
    'format',
    'regex',
    'setVariable',
    'source',
    'split',
    'sublist',
    'textToEntityMap',
    'trim',
];

const actions = [ 'add', 'remove' ];

const assignmentTypes = [ 'formatted', 'result' ];

const argsRequiredMap = new Map([
    functions.map((func) => ([func, !(func === 'trim' || func.startsWith('federalRegister'))]))
]);

const functionArgsMap = new Map([
  ['createEntity', new Set(['type', 'typeDisplay','name','externalId','provider','allowMissingVariables','keepPartial'])],
  ['federalRegisterIssuingAgencies', new Set()],
  ['federalRegisterNoticesIssuingAgencies', new Set()],
  ['federalRegisterDocTypes', new Set()],
  ['federalRegisterExecutiveOfficeDocTypes', new Set()],
  ['federalRegisterNoticesDocTypes', new Set()],
  ['findEntities', new Set(['entityTypes'])],
  ['format', new Set(['template','allowMissingVariables','keepPartial'])],
  ['regex', new Set(['command','regex','replacement'])],
  ['setVariable', new Set(['name','value'])],
  ['source', new Set(['sourceName'])],
  ['split', new Set(['delimiter'])],
  ['sublist', new Set(['start','end'])],
  ['textToEntityMap', new Set(['mapName','entityTypes'])],
  ['trim', new Set()],
]);

const nameValueMap = new Map([
  ['command', new Set(['match','replace','removeOnNoMatch','removeOnMatch'])],
  ['sourceName', new Set(['url','title','fullText','summary'])],
]);

const modifyDerivedMetadataRule = {
  derive: {
    required: true,
    type: 'array',
    def: {
      function: {
        required: true,
        type: 'string',
        oneOf: new Set(functions),
      },
      args: {
        requiredParentKey: 'function',
        requiredMap: argsRequiredMap,
        type: 'array',
        def: {
          name: {
            required: true,
            type: 'string',
            oneOfKey: 'function',
            oneOfMap: functionArgsMap,
          },
          value: {
            required: true,
            type: 'string',
            oneOfKey: 'name',
            oneOfMap: nameValueMap,
          },
        },
      },
    },
  },
  metadata: {
    required: true,
    type: 'array',
    def: {
      metadataType: {
        required: true,
        type: 'string',
        oneOf: new Set(metadataTypes),
      },
      action: {
        required: false,
        type: 'string',
        oneOf: new Set(actions),
      },
      assignmentType: {
        required: false,
        type: 'string',
        oneOf: new Set(assignmentTypes),
      },
      offset: {
        required: false,
        type: 'number',
        oneOf: new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
      },
      formats: {
        required: false,
        type: 'string-array',
      }
    }
  },
  maps: {
    required: false,
    type: 'array',
    def: {
      name: {
        required: true,
        type: 'string',
      },
      map: {
        required: true,
        type: 'array',
        def: {
          ...entityDefinition,
          text: {
            required: true,
            type: 'string-array',
          },
        }
      }
    }
  },
};

const modifyStaticEntityTagsRule = {
  entityTags: {
    required: true,
    type: 'array',
    def: {
      ...entityDefinition,
      action: {
        required: false,
        type: 'string',
        oneOf: new Set(['add', 'remove']),
      },
      relevance: {
        required: false,
        type: 'string',
        oneOf: new Set(['high', 'medium', 'low']),
      },
    },
  },
};

const unclusterRule = null;

const ruleTypes = new Set([
  'assign-static-entity-metadata',
  'modify-derived-metadata',
  'modify-static-entity-tags',
  'uncluster',
]);

const ruleMap = new Map([
  ['assign-static-entity-metadata', assignStaticEntityMetadataRule],
  ['modify-derived-metadata', modifyDerivedMetadataRule],
  ['modify-static-entity-tags', modifyStaticEntityTagsRule],
  ['uncluster', unclusterRule],
]);

const ruleDef = {
    name: {
      required: true,
      type: 'string',
      oneOf: ruleTypes,
    },
    description: {
      required: false,
      type: 'string',
    },
    config: {
      required: true,
      type: 'object',
      defKey: 'name',
      defMap: ruleMap,
    },
    match: {
      required: false,
      type: 'object',
      def: matchDef,
    },
};

function validateMatch(match, what) {
  const errors = [];
  if (!match) {
    return errors;
  }
  tagAndAddErrors(check(match, matchDef, null, null), what, errors);
  return errors;
}

function validateRules(rules) {
  const errors = [];
  rules.forEach((rule, index) => {
    tagAndAddErrors(check(rule, ruleDef, null, null), `rules[${index}]`, errors);
  });
  return errors;
}


module.exports = run;
