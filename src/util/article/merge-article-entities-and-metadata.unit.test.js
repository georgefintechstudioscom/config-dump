const mergeArticleEntitiesAndMetadata = require('./merge-article-entities-and-metadata');

describe('#mergeArticleEntitiesAndMetadata', () => {
  it('should return empty data if no matches', () => {
    const docId = 1;
    const existingMetadata = {};
    const existingEntityIds = [];
    const taggedMetadata = {};
    expect(mergeArticleEntitiesAndMetadata({
      docId, existingMetadata, existingEntityIds, taggedMetadata,
    })).to.deep.eq({ mergedEntities: [], mergedMetadata: {} });
  });

  it('should return remove prior metadata values from entities', () => {
    const docId = 1;
    const existingMetadata = {
      docTypes: {
        type: 'entity',
        values: [6609539],
      },
      jurisdictions: {
        type: 'entity',
        values: [16],
      },
      issuingAgencies: {
        type: 'entity',
        values: [2066, 3652516],
      },
      publicationDate: {
        type: 'date',
        values: ['2019-10-16T00:00:00.000Z'],
      },
    };
    const existingEntityIds = [4, 56, 6609539, 16, 2066, 3652516];
    const taggedMetadata = {};
    expect(mergeArticleEntitiesAndMetadata({
      docId, existingMetadata, existingEntityIds, taggedMetadata,
    })).to.deep.eq({ mergedEntities: [4, 56], mergedMetadata: existingMetadata });
  });

  it('should append meta data entity ids into entities', () => {
    const docId = 1;
    const existingMetadata = {};
    const existingEntityIds = [];
    const taggedMetadata = {
      docTypes: {
        type: 'entity',
        values: [6609539],
      },
      jurisdictions: {
        type: 'entity',
        values: [16],
      },
      issuingAgencies: {
        type: 'entity',
        values: [2066, 3652516],
      },
      publicationDate: {
        type: 'date',
        values: ['2019-10-16T00:00:00.000Z'],
      },
    };
    expect(mergeArticleEntitiesAndMetadata({
      docId, existingMetadata, existingEntityIds, taggedMetadata,
    })).to.deep.eq({
      mergedEntities: [6609539, 16, 2066, 3652516],
      mergedMetadata: taggedMetadata,
    });
  });

  it('should append and remove entityIds', () => {
    const docId = 1;
    const existingMetadata = {
      docTypes: {
        type: 'entity',
        values: [6609539],
      },
      jurisdictions: {
        type: 'entity',
        values: [16],
      },
      issuingAgencies: {
        type: 'entity',
        values: [2066, 3652516],
      },
    };
    const existingEntityIds = [6609539, 16, 2066, 3652516, 18];
    const taggedMetadata = {
      docTypes: {
        type: 'entity',
        values: [23123],
      },
      jurisdictions: {
        type: 'entity',
        values: [167],
      },
      issuingAgencies: {
        type: 'entity',
        values: [20665, 365251611],
      },
    };
    expect(mergeArticleEntitiesAndMetadata({
      docId, existingMetadata, existingEntityIds, taggedMetadata,
    })).to.deep.eq({
      mergedEntities: [18, 23123, 167, 20665, 365251611],
      mergedMetadata: taggedMetadata,
    });
  });
});
