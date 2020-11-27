const getNumericEnvVar = require('./get-numeric-env-var');

describe('getNumericEnvVar', () => {
  it('should extract a number from the env', () => {
    expect(getNumericEnvVar('NUMBER', { env: { NUMBER: '1' } })).to.equal(1);
  });

  it('should reject when a key is not a number', () => {
    expect(() => getNumericEnvVar('NOT_A_NUMBER', { env: { NOT_A_NUMBER: 'a Batman' } }))
      .to.throw('a number');
  });
});
