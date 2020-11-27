# @fintechstudios/wait-for-elasticsearch
Waits for Elasticsearch to be ready to use.

## Usage

In all usages, if the host is not specified it will be read from the `ES_HOST` environment variable.

### CLI

#### `waitForEs [host=$ES_HOST] [maxRetries=10] [msBetweenRetries=2000]`

```sh
$ waitForES http://localhost:9200
Waiting for shards to settle on http://localhost:9200
Elasticsearch on http://localhost:9200 is ready (took 0.018s)
```

### API

#### `waitForES({ [host=$ES_HOST], [maxRetries=10], [msBetweenRetries=2000] })`

```js
const waitForES = require('@fintechstudios/wait-for-elasticsearch');

async main() {
  await waitForES({ host: 'http://localhost:9200' });
}
```
