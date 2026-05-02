import {
  KMSClient,
  GenerateDataKeyCommand,
  DecryptCommand,
} from "@aws-sdk/client-kms";

const KEK = process.env.KMS_KEY_ARN;
const REGION = process.env.AWS_REGION ?? "us-east-1";

let cachedClient: KMSClient | null = null;
function client(): KMSClient {
  if (!cachedClient) cachedClient = new KMSClient({ region: REGION });
  return cachedClient;
}

export function isKmsConfigured(): boolean {
  return !!KEK;
}

// Plaintext DEK cache so a request that touches the same row N times only burns one KMS Decrypt call.
// Keyed by base64(wrappedDek). 60s TTL is much longer than any single request, short enough that a
// process-memory dump captures little.
const dekCache = new Map<string, { dek: Buffer; expiresAt: number }>();
const DEK_TTL_MS = 60_000;

function evictExpired() {
  const now = Date.now();
  for (const [k, v] of dekCache) {
    if (v.expiresAt <= now) dekCache.delete(k);
  }
}

export type EncryptionContext = { recordType: string; recordId: string };

export async function generateDek(
  ctx: EncryptionContext,
): Promise<{ dek: Buffer; wrappedDek: Buffer; kekVersion: number }> {
  if (!KEK) throw new Error("KMS_KEY_ARN is not set");
  const out = await client().send(
    new GenerateDataKeyCommand({
      KeyId: KEK,
      KeySpec: "AES_256",
      EncryptionContext: ctx as Record<string, string>,
    }),
  );
  if (!out.Plaintext || !out.CiphertextBlob) {
    throw new Error("KMS GenerateDataKey returned an empty key");
  }
  return {
    dek: Buffer.from(out.Plaintext),
    wrappedDek: Buffer.from(out.CiphertextBlob),
    // Single KEK today; this becomes a real version number when we do hard rotation.
    kekVersion: 1,
  };
}

export async function unwrapDek(
  wrappedDek: Buffer,
  ctx: EncryptionContext,
): Promise<Buffer> {
  if (!KEK) throw new Error("KMS_KEY_ARN is not set");

  evictExpired();
  const cacheKey = wrappedDek.toString("base64");
  const cached = dekCache.get(cacheKey);
  if (cached) return cached.dek;

  const out = await client().send(
    new DecryptCommand({
      CiphertextBlob: wrappedDek,
      EncryptionContext: ctx as Record<string, string>,
    }),
  );
  if (!out.Plaintext) throw new Error("KMS Decrypt returned empty plaintext");

  const dek = Buffer.from(out.Plaintext);
  dekCache.set(cacheKey, { dek, expiresAt: Date.now() + DEK_TTL_MS });
  return dek;
}

// Test/admin hook only — clears the cache so a fresh KMS call is forced.
export function _resetDekCache(): void {
  dekCache.clear();
}
