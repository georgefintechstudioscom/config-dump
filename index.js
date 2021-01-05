#!/usr/bin/env node
require('dotenv/config');
require('array.prototype.flatmap/shim')();
const { version } = require('./package.json');
const cli = require('./src/cli');
const run = require('./src/index');

if (require.main === module) {
  const args = cli // eslint-disable-line no-unused-expressions
    .version(version)
    .argv;

  const {
    filename, pipeline, outfile, xlsxfile, jsonfile, sourcemap, staticmetadatafile
  } = args;

  if (!(filename || pipeline || staticmetadatafile)) {
    throw new TypeError('Must supply one or more -filename(s) and/or -pipeline(s) and/or -staticmetadatafile(s).');
  }

  if (!(outfile || xlsxfile || jsonfile)) {
    throw new TypeError('Must supply -outfile and/or -xlsxfile and/or -jsonfile for output.');
  }

  run({
    opts: {
      filename,
      pipeline,
      outfile,
      xlsxfile,
      jsonfile,
      sourcemap,
      staticmetadatafile,
    },
  }).then(() => {
    console.log('Done!');
    // process.exit(0);
  }).catch((e) => {
    console.log('Error');
    console.log(e);
    process.exit(1);
  });
}
