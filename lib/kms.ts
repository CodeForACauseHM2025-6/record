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
// Keyed by base64(wrappedDek). The homepage fans out to 20-30+ encrypted rows per render; without a
// cross-request cache, consecutive page loads each spend that many KMS Decrypt calls (tripping the
// CloudWatch decrypt-spike alarm and adding ~1s of KMS round-trip latency on warm renders).
// 10 min is long enough that a normal browsing session reuses the same DEKs, short enough that a
// process-memory dump captures only the working set, not historical content.
const dekCache = new Map<string, { dek: Buffer; expiresAt: number }>();
const DEK_TTL_MS = 600_000;

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
  // Return a fresh copy each time so callers can `dek.fill(0)` to wipe their plaintext copy
  // after use without corrupting the cached entry. Without this, an update path that calls
  // unwrapDek() and then wipes its DEK would zero out the cached buffer, and every subsequent
  // read for the same row would get an all-zeros "DEK" and fail AES-GCM auth.
  if (cached) return Buffer.from(cached.dek);

  const out = await client().send(
    new DecryptCommand({
      CiphertextBlob: wrappedDek,
      EncryptionContext: ctx as Record<string, string>,
    }),
  );
  if (!out.Plaintext) throw new Error("KMS Decrypt returned empty plaintext");

  const dek = Buffer.from(out.Plaintext);
  dekCache.set(cacheKey, { dek, expiresAt: Date.now() + DEK_TTL_MS });
  // Return a copy so the caller's wipe doesn't touch the cache entry.
  return Buffer.from(dek);
}

// Test/admin hook only — clears the cache so a fresh KMS call is forced.
export function _resetDekCache(): void {
  dekCache.clear();
}
