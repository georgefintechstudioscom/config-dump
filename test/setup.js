require('array.prototype.flatmap/shim')();
const sinon = require('sinon');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(sinonChai);
chai.use(chaiAsPromised);

global.sinon = sinon;
global.chai = chai;
global.expect = chai.expect;
