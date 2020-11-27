/**
 * Defines a service that should be used as a singleton and is fully instantiable from a default constructor.
 * Services that want to avoid making duplicate connections, such as database services, are a good fit. If someone
 * needs a non-default instance, they are free to instantiate a new one.
 *
 * @abstract
 */
class Singleton {
  /**
   * @return {Singleton}
   */
  static getInstance() {
    if (!this.instance) {
      this.instance = new this();
    }
    return this.instance;
  }

  /**
   * Reset the current instance.
   *
   * @package
   */
  static reset() {
    this.instance = undefined;
  }
}

module.exports = Singleton;
