const getBooleanEnvVar = require('./get-boolean-env-var');

describe('getBooleanEnvVar', () => {
  [
    'true',
    'TRUE',
    'TrUe',
  ].forEach(val => it(`should extract "${val}" as true`, () => {
    expect(getBooleanEnvVar('BOOL', { env: { BOOL: val } })).to.be.true;
  }));

  it('should extract anything not "true" or "TRUE" as false', () => {
    expect(getBooleanEnvVar('BOOL', { env: { BOOL: 'f' } })).to.be.false;
  });
});
