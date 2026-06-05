import { S3Client } from '@aws-sdk/client-s3';

const endpoint = process.env.S3_ENDPOINT;
const accessKeyId = process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
const region = process.env.S3_REGION || 'us-west-004';

export const isS3Configured = !!(endpoint && accessKeyId && secretAccessKey);

export const s3Client = isS3Configured
    ? new S3Client({
          endpoint,
          region,
          credentials: {
              accessKeyId: accessKeyId!,
              secretAccessKey: secretAccessKey!,
          },
          forcePathStyle: true, // Required for Backblaze B2 / MinIO
      })
    : null;

export const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || '';
