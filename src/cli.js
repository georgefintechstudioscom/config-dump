const yargs = require('yargs');

const cli = yargs
  .usage('usage: $0 - Post-Processing configuration dump. All parameters are configurable in the env (or a .env file) in SCREAMING_SNAKE_CASE with the prefix CONFIG_DUMP_')
  .env('CONFIG_DUMP')
  .option('filename', {
    alias: 'f',
    array: true,
    description: 'Input file name(s)',
    requiresArg: true,
  })
  .option('pipeline', {
    alias: 'p',
    array: true,
    description: 'Pipeline ID(s) from control-plane api (or "all" for all pipeliens)',
    requiresArg: true,
  })
  .option('outfile', {
    alias: 'o',
    conflicts: 'xlsxfile',
    description: 'Name of the CSV output file',
    requiresArg: true,
  })
  .option('xlsxfile', {
    alias: 'x',
    conflict: 'outfile',
    description: 'Name of the XLSX output file',
    requiresArg: true,
  })
  .option('sourcemap', {
    alias: 'm',
    description: 'Source-to-contributor mapping file',
    requiresArg: true,
  })
  .help()
  .showHidden();

module.exports = cli;
