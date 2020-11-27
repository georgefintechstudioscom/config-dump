const getEnvVar = require('./get-env-var');

describe('getEnvVar', () => {
  const env = {
    VALID_NUMBER: '1',
    INVALID_NUMBER: 'batman',
  };

  it('should extract a key from the env', () => {
    expect(getEnvVar('VALID_NUMBER', { env })).to.equal(env.VALID_NUMBER);
  });

  it('should parse a key from the env', () => {
    const parsed = getEnvVar('VALID_NUMBER', { env, parse: Number });
    expect(parsed).to.equal(1);
  });

  it('should allow passing a default value', () => {
    const defaultValue = '10';
    expect(getEnvVar('NOT_THERE', { defaultValue })).to.equal(defaultValue);
  });

  it('should validate a key from the env', () => {
    const mustBe = 'a number';
    expect(() => getEnvVar('INVALID_NUMBER', {
      parse: Number,
      validate: x => !Number.isNaN(x),
      mustBe,
      env,
    })).to.throw(mustBe);
  });

  it('should throw when a required key is not set', () => {
    expect(() => getEnvVar('BOO', { required: true, env })).to.throw('required');
  });
});
