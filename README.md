# ConfigDump    

A utility to read post-processing configuration and generate a spreadsheet of the information.

## Running Locally
- Update .env with variables
- `node index.js --filename input-file.json --outfile output-file.csv # ... other arguments`

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
# config-dump
