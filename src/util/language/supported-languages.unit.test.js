const SUPPORTED_LANGUAGES = require('./supported-languages');

describe('supported-languages', () => {
  [
    'entityId',
    'iso1',
    'iso2',
  ].forEach(key => it(`should contain no duplicate ${key}s`, () => {
    const allValsByKey = SUPPORTED_LANGUAGES
      .map(lang => lang[key]);
    allValsByKey.forEach((val, index) => {
      const lastIndex = allValsByKey.lastIndexOf(val);
      expect(lastIndex).to.equal(index, `Found duplicate ${key} ${val} at index ${index}`);
    });
  }));
});
