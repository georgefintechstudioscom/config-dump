const chunk = require('lodash.chunk');

const Singleton = require('../../util/singleton/Singleton');
const FtsApiService = require('../fts-api/FtsApiService');

class FtsApiEntitiesService extends Singleton {
  /**
   * @param {FtsApiService} [ftsApiService]
   */
  constructor({
    ftsApiService = FtsApiService.getInstance(),
  } = {}) {
    super();
    /** @private */
    this.ftsApiService = ftsApiService;
    /** @private */
    this.baseUrl = `${this.ftsApiService.host}/entity`;
  }

  /**
   * @param {Object[]} unresolvedEntities
   * @returns {Promise<Object[]>}
   */
  async resolveEntities(unresolvedEntities) {
    const response = await this.ftsApiService.makeAuthenticatedRequest(
      `${this.baseUrl}`,
      {
        method: 'POST', // instead of PUT, does not update existing entities
        body: JSON.stringify({
          entities: unresolvedEntities,
        }),
      }
    );
    return response.entities;
  }

  /**
   * @param {number[]} entityIds
   * @returns {Promise<Object[]>}
   */
  async getEntities(entityIds) {
    const response = await this.ftsApiService.makeAuthenticatedRequest(
      `${this.baseUrl}/ids/${[...entityIds].join(',')}`,
      {
        method: 'GET', // instead of PUT, does not update existing entities
      }
    );
    return response.entities;
  }
}

module.exports = FtsApiEntitiesService;
