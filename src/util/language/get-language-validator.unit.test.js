const UnsupportedLangError = require('./UnsupportedLangError');
const getLanguageValidator = require('./get-language-validator');

describe('get-language-validator', () => {
  const ENGLISH_ID = 3;
  const RUSSIAN_ID = 14585;

  it('should validate given an iso1 code and based on a list of supported iso-1 codes', () => {
    const validator = getLanguageValidator(['en', 'fr']);
    const lang = validator({ iso1: 'en' });
    expect(lang).to.have.property('iso1', 'en');
    expect(lang).to.have.property('entityId', ENGLISH_ID);
  });

  it('should validate given an entity id based on a list of supported iso-1 codes', () => {
    const validator = getLanguageValidator(['en', 'fr']);
    const lang = validator({ entityId: ENGLISH_ID });
    expect(lang).to.have.property('iso1', 'en');
    expect(lang).to.have.property('entityId', ENGLISH_ID);
  });

  it('should validate given an iso1 based on a list of supported entity ids', () => {
    // russian, english
    const validator = getLanguageValidator([14585, 3], 'entityId');
    const lang = validator({ iso1: 'ru' });
    expect(lang).to.have.property('iso1', 'ru');
    expect(lang).to.have.property('entityId', RUSSIAN_ID);
  });

  it('should throw an UnsupportedLangError if given a language not in the set', () => {
    const validator = getLanguageValidator(['en', 'fr']);
    expect(() => validator({ iso1: 'de' })).to.throw(UnsupportedLangError, 'de');
  });
});
