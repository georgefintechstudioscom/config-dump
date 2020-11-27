require('dotenv/config');
const S3 = require('aws-sdk/clients/s3');
const getEnvVar = require('../../src/util/env/get-env-var');

const BUCKETS = [
  getEnvVar('FTS_FULL_TEXT_S3_BUCKET', { defaultValue: 'fts-sourced-full-document-text' }),
];

async function createBuckets(s3 = new S3({
  endpoint: getEnvVar('S3_ENDPOINT', { required: true }),
  // us-east-1 in not a valid region when creating buckets: @see https://github.com/boto/boto3/issues/125
  region: getEnvVar('S3_REGION', { defaultValue: 'us-west-1' }),
  s3ForcePathStyle: true,
})) {
  await Promise.all(
    BUCKETS.map(
      bucket => s3.createBucket({
        Bucket: bucket,
      }).promise()
    )
  );
  return (await s3.listBuckets().promise()).Buckets;
}

if (require.main === module) {
  console.log('Creating testing S3 buckets.');
  createBuckets()
    .then(out => console.log(out))
    .catch(err => console.error(err));
}
