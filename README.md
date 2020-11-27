# NER Batch Backfill

A utility to manually tag documents with the NER system.

## Running Locally
- Update .env with variables
- `node index.js --doc-id DOC_ID # ... other arguments`

```sh
# Postgres connections
FTS_DB_HOST=localhost
FTS_DB_USER=postgres
FTS_DB_PASS=postgres
FTS_DB_NAME=fts

# Host of the FTS REST API
FTS_API_HOST=https://global-api.fintechstudios.com
# FTS_API_HOST=http://localhost:8081 # for local
FTS_API_TIMEOUT=15000 # 15 seconds
FTS_API_TOKEN_EXP_BUFFER=120000 # 2 mins
FTS_API_USERNAME
FTS_API_PASSWORD
FTS_API_KEY

## NLP API specific
FTS_API_NLP_TIMEOUT=60000 # 1 min

# Elasticsearch Host
ES_HOST=localhost:80
ES_CONNECT_TO_AWS=false

# Redis
FTS_REDIS_HOST=localhost

# S3
FTS_FULL_TEXT_S3_BUCKET=fts-sourced-full-document-text
S3_ENDPOINT # defaults to the default AWS S3 endpoint, set to http://localhost:4566 for testing against the docker image.

# Fed Reg API 
BACKOFF_FED_REG_API_MAX_RETRIES=10 # max number of times
BACKOFF_FED_REG_API_BASE_DELAY=1000 # millis for the base of exp. backoff

# CLI Params

# Start and end of the update
NER_BATCH_START_DATE=Thu Dec 07 2017 00:00:01 GMT-0400 (Eastern Daylight Time)
NER_BATCH_END_DATE=Thu Dec 12 2017 23:59:59 GMT-0400 (Eastern Daylight Time)

# Source to update
NER_BATCH_SOURCE_ID=1970354

# Language to run NER as
NER_BATCH_LANGUAGE=en # en or de

# Don't retag any documents with LEGAL_REF attached
NER_BATCH_SKIP_VERIFIED_ANNOTATED_ARTICLES='LEGAL_REF'

# Self Signed Certificate Errors for Local Testing can be avoided by adding the following to the .env file
NODE_TLS_REJECT_UNAUTHORIZED = 0
```
# config-dump
