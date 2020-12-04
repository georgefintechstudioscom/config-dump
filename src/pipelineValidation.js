const _parent = '_parent';

const
  entityDefinition = {
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

const
  matchTypes = [
    'multi-source',
    'source',
    'multi-annotation',
    'annotation',
  ];

const
  multiSourceMatch = {
    items: {
      required: true,
      type: 'array',
      def: entityDefinition,
    },
  };

const
  annotationMatchTypes = [
    'matched.document-ingestion.fintechstudios.com/channel-id',
    'matched.document-ingestion.fintechstudios.com/document-id',
    'matched.document-ingestion.fintechstudios.com/source-id',
  ];

const
  annotationDefinition = {
    name: {
      required: true,
      type: 'string',
      oneOf: new Set(annotationMatchTypes),
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

const
  multiAnnotationMatch = {
    items: {
      required: true,
      type: 'array',
      def: annotationDefinition,
    },
  };

const
  matchMap = new Map([
    ['multi-source', multiSourceMatch],
    ['source', entityDefinition],
    ['multi-annotation', multiAnnotationMatch],
    ['annotation', annotationDefinition],
  ]);

const
  matchDef = {
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

const
  assignStaticEntityMetadataRule = {
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
          def: entityDefinition,
        },
      },
    },
  };

const
  functions = [
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

const
  actions = ['add', 'remove'];

const
  assignmentTypes = ['formatted', 'result'];

const
  argsRequiredMap = new Map([
    functions.map(func => ([func, !(func === 'trim' || func.startsWith('federalRegister'))])),
  ]);

const
  functionArgsMap = new Map([
    ['createEntity', new Set(['type', 'typeDisplay', 'name', 'externalId', 'provider',
      'allowMissingVariables', 'keepPartial'])],
    ['federalRegisterIssuingAgencies', new Set()],
    ['federalRegisterNoticesIssuingAgencies', new Set()],
    ['federalRegisterDocTypes', new Set()],
    ['federalRegisterExecutiveOfficeDocTypes', new Set()],
    ['federalRegisterNoticesDocTypes', new Set()],
    ['findEntities', new Set(['entityTypes'])],
    ['format', new Set(['template', 'allowMissingVariables', 'keepPartial'])],
    ['regex', new Set(['command', 'regex', 'replacement'])],
    ['setVariable', new Set(['name', 'value'])],
    ['source', new Set(['sourceName'])],
    ['split', new Set(['delimiter'])],
    ['sublist', new Set(['start', 'end'])],
    ['textToEntityMap', new Set(['mapName', 'entityTypes'])],
    ['trim', new Set()],
  ]);

const
  nameValueMap = new Map([
    ['command', new Set(['match', 'replace', 'removeOnNoMatch', 'removeOnMatch'])],
    ['sourceName', new Set(['url', 'title', 'fullText', 'summary'])],
  ]);

const
  metadataTypes = [
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

const
  modifyDerivedMetadataRule = {
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
        },
      },
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
          },
        },
      },
    },
  };

const
  modifyStaticEntityTagsRule = {
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

const
  unclusterRule = null;

const
  ruleTypes = new Set([
    'assign-static-entity-metadata',
    'modify-derived-metadata',
    'modify-static-entity-tags',
    'uncluster',
  ]);

/**
 * Map of rule name to rule type definitions.  Used by getThing().
 * @type {Map<string, Object>}
 */
const
  ruleMap = new Map([
    ['assign-static-entity-metadata', assignStaticEntityMetadataRule],
    ['modify-derived-metadata', modifyDerivedMetadataRule],
    ['modify-static-entity-tags', modifyStaticEntityTagsRule],
    ['uncluster', unclusterRule],
  ]);

const
  ruleDef = {
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

/**
     * Based on a condition, add a message to the list of errors.  Return the condition.
     * @param {boolean} value - the value of the condition
     * @param {string} message - the message to put in errors if value is false
     * @param [{string}] errors - the consolidated list of errors
     * @returns {boolean} - equal to 'value'
     */
function condition(value, message, errors) {
  if (!value) errors.push(message);
  return value;
}

/**
 * Given a thing to get ('def', 'required', 'oneOf' in the definition, look for references to other fields in
 * properties like 'defKey' or 'oneOfKey', and use the value found there (or in ancestor configItems) as a key to a
 * 'defMap' or 'oneOfMap' that should be used for the next definition, or required field flag, or limited
 * value set (oneOf). If the key property does not exist, expect to find the plain property
 * like 'def' or 'oneOf', and use that.
 * @param {string} thing - name of the desired property
 * @param {Object} defItem - the configItem's expected definition from this code
 * @param {Object} configItem - an object defined in the configuration pipeline
 * @returns {*} - Returns an {Object} for 'def', {boolean} for 'required', a Set<string> for 'oneOf'
 */
function getThing(thing, defItem, configItem) {
  const keyProperty = `${thing}Key`;
  if (defItem[keyProperty]) {
    let key = null;
    while (configItem && !key) {
      key = configItem[defItem[keyProperty]];
      configItem = configItem[_parent];
    }
    return defItem[`${thing}Map`].get(key);
  }
  return defItem[thing];
}

/**
 * Tag new errors with additional information from parent configItem, and consolidate errors.
 * @param [{string}] subErrors - errors from the sub-configItem
 * @param {string} tag - A string to prepend the subErrors with that helps identify where the error happened
 * @param [{string}] errors - Array of error strings to consolidate to
 * @returns [{string}] Consolidated error list
 */
function tagAndAddErrors(subErrors, tag, errors) {
  subErrors.forEach((subError) => {
    errors.push(`${tag}.${subError}`);
  });
}

/**
 * Check a configuration object from the pipeline definition for validity, and any sub-object below it.
 * @param {Object} configItem - Configuration item from pipeline
 * @param {Object} definition - Definition of expected format defined in this code
 * @param {Object} parentConfigItem, null for top-level
 * @param {Object} parentDefinition, null for top-level
 * @returns [{string}] List of errors
 */
function check(configItem, definition, parentConfigItem, parentDefinition) {
  const errors = [];
  if (!configItem && !definition) {
    return errors;
  }
  configItem[_parent] = parentConfigItem;
  definition[_parent] = parentDefinition;
  for (const [key, value] of Object.entries(configItem)) {
    if (key !== _parent) {
      const defItem = definition[key];
      if (condition(defItem, `${key}: Unexpected property "${key}".`, errors)) {
        if (defItem.type === 'object' || defItem.type === 'array') {
          const isObject = defItem.type === 'object';
          (isObject ? [value] : value).forEach((item, index) => {
            tagAndAddErrors(
              check(item, getThing('def', defItem, configItem), configItem, definition),
              `${key}${!isObject ? `[${index}]` : ''}`,
              errors
            );
          });
        } else if (defItem.type === 'string-array') {
          value.forEach((item, index) => {
            condition(
              typeof (item) === 'string',
              `${key}: Invalid value type "${typeof (item)}" for property "${key}[${index}]".  Must be "string".`,
              errors
            );
          });
        } else {
          condition(
            // eslint-disable-next-line valid-typeof
            typeof (value) === defItem.type,
            `${key}: Invalid value type "${typeof (value)}" for property "${key}".  Must be "${defItem.type}".`,
            errors
          );
          const oneOfSet = getThing('oneOf', defItem, configItem);
          condition(!oneOfSet || oneOfSet.has(value), `${key}: Value of "${value}" is invalid.`, errors);
        }
      }
    }
  }
  for (const [key, defItem] of Object.entries(definition)) {
    if (key !== _parent) {
      const requiredFlag = getThing('required', defItem, configItem);
      condition(
        Object.keys(configItem).includes(key) || !requiredFlag,
        `${key}: Missing required property "${key}".`,
        errors
      );
    }
  }
  return errors;
}


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

/**
 * Check the pipelines for correct format and data.
 * @param {Object[]} pipelines
 * @return {boolean} Success or failure
 */
function validatePipelines(pipelines) {
  const errors = [];
  pipelines.forEach((pipeline) => {
    const tag = `validation error: pipeline #${pipeline.id}, file ${pipeline.filename}`;
    tagAndAddErrors(validateMatch(pipeline.match), `${tag}.Default Match`, errors);
    tagAndAddErrors(validateRules(pipeline.rules), tag, errors);
  });
  errors.forEach(error => console.error(error));
  return errors.length === 0;
}


const PipelineValidation = {
  validatePipelines,
};

module.exports = PipelineValidation;
