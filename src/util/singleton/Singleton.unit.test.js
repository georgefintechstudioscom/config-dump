const Singleton = require('./Singleton');

class SubClassA extends Singleton {}

class SubClassB extends Singleton {}


describe('Singleton', () => {
  afterEach(() => {
    [Singleton, SubClassA, SubClassB].forEach(Class => Class.reset());
  });

  it('should only instantiate once', () => {
    const first = Singleton.getInstance();
    const second = Singleton.getInstance();
    expect(first).to.equal(second);
  });

  it('should be sub-class-able', () => {
    const instance = SubClassA.getInstance();
    expect(instance).to.be.instanceof(SubClassA);
  });

  it('should be sub-class-able by multiple classes', () => {
    const instanceA = SubClassA.getInstance();
    const instanceB = SubClassB.getInstance();
    expect(instanceA).to.be.instanceof(SubClassA);
    expect(instanceB).to.be.instanceof(SubClassB);
    expect(instanceA).to.not.equal(instanceB);
  });

  it('should reset the instance', () => {
    const first = Singleton.getInstance();
    Singleton.reset();
    const second = Singleton.getInstance();
    expect(first).to.not.equal(second);
  });
});
