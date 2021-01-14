# ConfigDump    

A utility to read post-processing configuration and generate a spreadsheet of the information.
In addition, this utility can be used to merge configuration pipelines and generate JSON output files
with the updated and de-duped configuration information.  Another very simple input file format can be used to specify
a pipeline that creates basic static entity metadata assignment, and this pipeline can be merged with an
existing one to create a new JSON output file for input.  This helps speed up simple configuration changes.

## Running Locally
- Update .env with variables
- `node index.js --filename input-file.json --outfile output-file.csv --sourcemap source-to-contributor-map.json # ... other arguments`

```sh
# Host of the FTS REST API
FTS_API_HOST=https://global-api.fintechstudios.com
# FTS_API_HOST=http://localhost:8081 # for local
FTS_API_TIMEOUT=15000 # 15 seconds
FTS_API_TOKEN_EXP_BUFFER=120000 # 2 mins
FTS_API_USERNAME
FTS_API_PASSWORD
FTS_API_KEY

# CLI Params

# Input filenames
CONFIG_DUMP_FILENAME=./entity-metadata-pipeline.json,./metadata-Latest-Edgar-Filings.json

# Output filename
CONFIG_DUMP_OUTFILE=./output.csv

# Self Signed Certificate Errors for Local Testing can be avoided by adding the following to the .env file
NODE_TLS_REJECT_UNAUTHORIZED = 0
```
- `node index.js --filename input-file.json --staticmetadatafile new-config.json --jsonfile merged-config.json`

### Arguments
--filename: A comma separated list of file names that are JSON representations of a post-processing pipelines 
configuration.

--pipeline: A comma separated list of pipeline IDs to get from the document-ingestion control-plane API (instead or or
in addition to the --filename input). (Not implemented yet.)

--outfile: A file name where to output a spreadsheet (CSV) representation of the post-processing pipelines in the
input.

--xlsxfile: A file name where to output a .xlsx spreadsheet representation of the post-processing pipelines in the 
input. Can be used with --outfile if desired. (Not implemented yet.)

--sourcemap: A JSON file that contains a mapping of contributor entities to source entities for grouping
into the same row of the output spreadsheet.  The form of the data is:
```json
{ "map": [
{ "contributorExternalId": "contributor_bankofengland", "contributorProvider": "fts", "sourceExternalId": "source_bankofenglandprudentialregulationpublicationsannualreportandbusinessplan", "sourceProvider": "fts" },
{ "contributorExternalId": "source_usseccorporationfinancenoactionlettersissuedunderexchangeactrule14a8", "sourceExternalId": "contributor_ussecuritiesandexchangecommission", "sourceProvider": "fts" },
{ "contributorExternalId": "contributor_europeancentralbankecb", "contributorProvider": "fts", "sourceExternalId": "source_europeancentralbankpublications", "sourceProvider": "fts" },
...
 ] }
```
--jsonfile: A file name where to output a JSON representation of the merged input pipelines, which can be used
as a configuration file for post-processing.  This file will de-dupe any matchers and rules in the configuration.

--staticmetadatafile:  A file for input whose data can be used to generate a very simple pipeline for matching
sources and assigning static entity metadata to those sources.  The input is converted to a pipeline for this
purpose, and can be merged with other pipelines.  The form of this input is:
```json
[
{ "from": [8210365], "to": [7997286,8001996] },
{ "from": [8241665], "to": [7997259] },
{ "from": [8241744,8075009], "to": [8224103] },
...
]
```
The long integers are entity IDs on the system where it is being run.  The "from" values are used to match
against source entities (source, contributor, author), and the "to" values are assigned as metadata to documents
that match the sources.  The entity types of the "to" values are used to determine what type of metadata
they are (e.g. "country" or "state" would become "jurisdictions" metadata).

# config-dump
