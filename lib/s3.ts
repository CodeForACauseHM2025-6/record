import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  // AWS SDK v3 (2025+) enables CRC32 checksum signing by default. That bakes a
  // x-amz-checksum-crc32 query param into presigned URLs which the browser PUT cannot satisfy
  // (it would need to compute and send the matching checksum header). Disabling makes presigned
  // PUTs work for plain `fetch(uploadUrl, { method: "PUT", body: file })`.
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

const BUCKET = process.env.AWS_S3_BUCKET!;

export async function createPresignedUploadUrl(
  key: string,
  contentType: string,
  contentLength: number
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
  });

  return getSignedUrl(s3, command, { expiresIn: 600 }); // 10 minutes
}

export async function deleteS3Object(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  await s3.send(command);
}
