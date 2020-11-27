const getNumericEnvVar = require('./env/get-numeric-env-var');
const exponentialBackoff = require('./backoff/exponential-backoff');
const ResponseError = require('./errors/ResponseError');
const FtsApiNlpService = require('../core-services/fts-api/FtsApiNlpService');
const FtsApiNewsService = require('../core-services/fts-api/FtsApiNewsService');
const PostgresService = require('../core-services/postgres/PostgresService');
const TimeoutError = require('./errors/TimeoutError');
const SUPPORTED_LANGUAGE_CODES = require('../supported-language-codes');
const getLanguageValidator = require('./language/get-language-validator');

const langValidator = getLanguageValidator(SUPPORTED_LANGUAGE_CODES);

const mergeArticleEntitiesAndMetadata = require('./article/merge-article-entities-and-metadata');
const uniqueNerTagsByStart = require('./unique-ner-tags-by-start');
const duplicateAnnotationsWarning = require('./duplicate-annotations-warning');

const FederalRegisterNoticeMetadataExtractor = require('../metadata-extractors/federal-register/FederalRegisterNoticeMetadataExtractor');
const FederalRegisterExecOfficeMetadataExtractor = require('../metadata-extractors/federal-register/FederalRegisterExecOfficeMetadataExtractor');
const FederalRegisterRulesMetadataExtractor = require('../metadata-extractors/federal-register/FederalRegisterRulesMetadataExtractor');
const FederalRegisterProposedRulesMetadataExtractor = require('../metadata-extractors/federal-register/FederalRegisterProposedRulesMetadataExtractor');

// Default to around 2.85 minutes
const NER_SERVICE_BACKOFF_BASE_DELAY = getNumericEnvVar(
  'BACKOFF_NER_SERVICE_BASE_DELAY',
  { defaultValue: 1000 } // default to 1 second
);
const NER_SERVICE_BACKOFF_MAX_RETRIES = getNumericEnvVar(
  'BACKOFF_NER_SERVICE_MAX_RETRIES',
  { defaultValue: 10 }
);
const NER_SERVICE_BACKOFF_FACTOR = getNumericEnvVar(
  'BACKOFF_NER_SERVICE_FACTOR',
  { defaultValue: 1.6 }
);

const FED_REG_RULES_SOURCES = [
  6550372, // Federal Register | Latest Rules
  1970353, // Federal Register | Rules
];

const FED_REG_PROPOSED_RULES_SOURCES = [
  6550385, // Federal Register | Latest Proposed Rules
  1970354, // Federal Register | Proposed Rules
];

const FED_REG_NOTICE_TYPE_SOURCES = [
  4925221, // Federal Register | Documents of Type Notice
];

const FED_REG_EXEC_OFFICE_SOURCES = [
  3677513, // Federal Register | Documents | Executive Office of the President
];


// initializing extractors
/**
 * @type {Object<number, MetadataExtractor>}
 */
const METADATA_EXTRACTOR_MAP = [
  [FED_REG_RULES_SOURCES, new FederalRegisterRulesMetadataExtractor()],
  [FED_REG_PROPOSED_RULES_SOURCES, new FederalRegisterProposedRulesMetadataExtractor()],
  [FED_REG_NOTICE_TYPE_SOURCES, new FederalRegisterNoticeMetadataExtractor()],
  [FED_REG_EXEC_OFFICE_SOURCES, new FederalRegisterExecOfficeMetadataExtractor()],
]
  .flatMap(([sourceList, extractor]) => sourceList.map(s => ([s, extractor])))
  .reduce((map, [s, extractor]) => {
    if (map[s] !== undefined) {
      throw new Error(`Duplicate extractor specified for source: ${s}`);
    }
    map[s] = extractor;
    return map;
  }, {});


/**
 * Get the applicable metadata for a document.
 *
 * @param doc
 * @returns {Promise<DocMetadata>}
 */
const getMetadataForDoc = async (doc) => {
  if (doc.source === undefined || doc.source === 0) {
    console.error(`Doc without a source: doc ${doc.id}`);
    return {};
  }
  const extractor = METADATA_EXTRACTOR_MAP[doc.source];
  if (!extractor) {
    console.warn(`Doc without a metadata extractor: doc ${doc.id}`);
    return {};
  }
  return extractor.extractMetadata(doc);
};

/**
 * Get all the NER tags for a document.
 *
 * @param {FTSDocument} doc
 * @param {string} language
 * @returns {Promise<NERTagTextResponse|null>}
 */
const getTagsForDoc = async (doc, language) => {
  const nlpService = FtsApiNlpService.getInstance();
  if (language === 'none') {
    console.log(`Skipping tagging for doc ${doc.id}.`);
    return null; // skip tags
  }

  const { entityId: langId } = langValidator({ iso1: language });

  return exponentialBackoff(
    () => nlpService.tagLegalText(doc.full_text, langId),
    {
      maxRetries: NER_SERVICE_BACKOFF_MAX_RETRIES,
      baseDelay: NER_SERVICE_BACKOFF_BASE_DELAY,
      factor: NER_SERVICE_BACKOFF_FACTOR,
      onError: err => console.error(err),
      isRetryable: err => err instanceof TimeoutError
        || (err instanceof ResponseError && err.response.status === 504), // Gateway Timeout
    }
  );
};

/**
 * @param {FTSDocument} doc
 * @param {NERTagTextResponse} nerResult
 * @returns {Promise<void>}
 */
const saveNerResultForDoc = async (doc, nerResult) => {
  const nlpService = FtsApiNlpService.getInstance();
  const newsService = FtsApiNewsService.getInstance();

  let { annotations: nerAnnotations } = nerResult;

  // TODO: TOTAL Hack, b/c of API Returning Duplicate Annotations. Should be removed once api is fixed.;
  const dupAnnotations = duplicateAnnotationsWarning(nerAnnotations);
  if (dupAnnotations.length > 0) {
    console.warn(`DUPLICATE ANNOTATIONS FOUND: ${doc.id}`);
    console.warn(`Dups ${doc.id}: `, JSON.stringify(dupAnnotations));
    nerAnnotations = uniqueNerTagsByStart(nerAnnotations);
  }

  nerAnnotations
    .forEach((annotation, i) => console.log(`Tag for doc ${doc.id} # ${i}`, JSON.stringify(annotation)));

  const annotations = nerAnnotations
    .map((nerAnnotation) => {
      const articleAnnotation = {
        docId: doc.id,
        startIndex: nerAnnotation.textLocation.start,
        endIndex: nerAnnotation.textLocation.end,
        label: nerAnnotation.resolutionMetadata.resolutionType,
        text: nerAnnotation.resolutionMetadata.annotationText,
      };
      if (nerAnnotation.resolvedEntityId) {
        articleAnnotation.entityId = nerAnnotation.resolvedEntityId;
      }
      return articleAnnotation;
    });

  if (annotations.length > 0) {
    console.log(`Found new tags for doc ${doc.id}. count: ${annotations.length}`);
    await newsService.addAnnotationsToDocument(doc.id, annotations);
  }
};

/**
 * Tag a document and update it in both postgres and elasticsearch.
 *
 * @param {FTSDocument} doc
 * @param {string} language
 * @returns {Promise<void>}
 */
const tagAndUpdateDoc = async (doc, language) => {
  // Connect to services
  const pgService = PostgresService.getInstance();
  const newsService = FtsApiNewsService.getInstance();

  const [nerResult, taggedMetadata] = await Promise.all([
    getTagsForDoc(doc, language),
    getMetadataForDoc(doc),
  ]);

  // First remove all the tags that have not been manually "APPROVED or REJECTED"
  // => This also drops "LEGAL_REF" and "OBLIGATION" entities from doc.
  await newsService.removeAnnotationsFromDocumentById(doc.id);

  if (nerResult) {
    await saveNerResultForDoc(doc, nerResult);
  } else {
    console.log(`No references found for ${doc.id}`);
  }

  const {
    entities: existingEntityIds,
    metadata: existingMetadata,
  } = await pgService.getEntitiesAndMetaDataFromDocument(doc.id);

  console.log(`Extracted metadata for doc ${doc.id}:`, JSON.stringify(taggedMetadata));

  const { mergedEntities, mergedMetadata } = mergeArticleEntitiesAndMetadata({
    docId: doc.id, existingMetadata, existingEntityIds, taggedMetadata,
  });

  doc.entities = mergedEntities;
  doc.metadata = mergedMetadata;

  await newsService.updateArticleById(doc.id, doc);
};

module.exports = tagAndUpdateDoc;
