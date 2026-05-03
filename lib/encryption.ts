import type { BinaryLike } from "crypto";

function getCrypto() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("crypto") as typeof import("crypto");
}

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const PREFIX = "enc:v1:";

let encryptionKey: Buffer | null = null;
let deterministicSubKey: Buffer | null = null;
// HMAC pepper for blind indexes (User.emailHash, ArticleCredit.creditRoleHash). Derived from
// encryptionKey so it doesn't need its own env var; rotates with the legacy key today, gets its
// own derivation source after Phase 5 drops the legacy path.
let blindIndexKey: Buffer | null = null;
// Tracks whether instrumentation tried to initialize the key and failed. When set in production,
// every encrypt/decrypt call throws so all DB ops fail loudly instead of silently going plaintext.
let initFailed = false;

export function markEncryptionInitFailed(reason: string): void {
  initFailed = true;
  console.error(`[encryption] initialization failed: ${reason}`);
}

export function initEncryption(hexKey: string): void {
  initFailed = false;
  encryptionKey = Buffer.from(hexKey, "hex");
  if (encryptionKey.length !== 32) {
    throw new Error("Encryption key must be 32 bytes (64 hex characters)");
  }
  deterministicSubKey = Buffer.from(
    getCrypto().createHmac("sha256", encryptionKey).update("deterministic-iv").digest()
  );
  blindIndexKey = Buffer.from(
    getCrypto().createHmac("sha256", encryptionKey).update("blind-index-v1").digest()
  );
}

export function isEncryptionEnabled(): boolean {
  return encryptionKey !== null;
}

export function encrypt(
  plaintext: string,
  mode: "deterministic" | "random"
): string {
  // Production safety: if instrumentation flagged init as failed, refuse to operate so the bug surfaces
  // as 500s on every DB write instead of silently writing plaintext PII.
  if (process.env.NODE_ENV === "production" && initFailed) {
    throw new Error("Encryption not initialized; refusing to encrypt in production");
  }
  if (!encryptionKey || !deterministicSubKey) {
    // Match instrumentation: real production must never fall through to plaintext.
    if (process.env.NODE_ENV !== "development") {
      throw new Error("Encryption key not initialized in production");
    }
    return plaintext;
  }

  let iv: Buffer;
  if (mode === "deterministic") {
    iv = Buffer.from(
      getCrypto().createHmac("sha256", deterministicSubKey as BinaryLike)
        .update(plaintext)
        .digest()
        .subarray(0, IV_LENGTH)
    );
  } else {
    iv = getCrypto().randomBytes(IV_LENGTH);
  }

  const cipher = getCrypto().createCipheriv(ALGORITHM, encryptionKey, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  const combined = Buffer.concat([iv, encrypted, authTag]);
  return PREFIX + combined.toString("base64");
}

export function decrypt(ciphertext: string): string {
  if (ciphertext === null || ciphertext === undefined) {
    return ciphertext;
  }

  if (typeof ciphertext !== "string" || !ciphertext.startsWith(PREFIX)) {
    return ciphertext;
  }

  if (process.env.NODE_ENV === "production" && initFailed) {
    throw new Error("Encryption not initialized; refusing to decrypt in production");
  }
  if (!encryptionKey) {
    // Match instrumentation: real production must never silently surface ciphertext as plaintext.
    if (process.env.NODE_ENV !== "development") {
      throw new Error("Encryption key not initialized in production");
    }
    return ciphertext;
  }

  try {
    const combined = Buffer.from(ciphertext.slice(PREFIX.length), "base64");
    if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
      throw new Error("Ciphertext too short");
    }
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH, combined.length - AUTH_TAG_LENGTH);

    const decipher = getCrypto().createDecipheriv(ALGORITHM, encryptionKey, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch (err) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Decryption failed: ${(err as Error).message}`);
    }
    console.warn("Decryption failed, returning raw ciphertext:", (err as Error).message);
    return ciphertext;
  }
}

// ---- Envelope-encryption primitives (KMS migration Phase 2+) ----
//
// These take an explicit per-row DEK (provided by lib/kms.ts) instead of the singleton
// encryptionKey. Output is binary (Buffer) — meant to land in BYTEA columns. Format:
//   [12-byte IV][ciphertext][16-byte auth tag]

export function encryptWithKey(plaintext: string, dek: Buffer): Buffer {
  if (dek.length !== 32) throw new Error("DEK must be 32 bytes for AES-256-GCM");
  const iv = getCrypto().randomBytes(IV_LENGTH);
  const cipher = getCrypto().createCipheriv(ALGORITHM, dek, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, encrypted, authTag]);
}

export function decryptWithKey(buf: Buffer, dek: Buffer): string {
  if (dek.length !== 32) throw new Error("DEK must be 32 bytes for AES-256-GCM");
  if (buf.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) throw new Error("Ciphertext too short");
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(buf.length - AUTH_TAG_LENGTH);
  const ct = buf.subarray(IV_LENGTH, buf.length - AUTH_TAG_LENGTH);
  const decipher = getCrypto().createDecipheriv(ALGORITHM, dek, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

// HMAC-SHA256 over normalized plaintext. Used for equality lookups on encrypted fields
// (User.emailHash, ArticleCredit.creditRoleHash). Plaintext is lowercased for email parity
// with the existing case-insensitive Google OAuth lookup; pass already-normalized values for
// fields where casing matters.
export function blindIndex(plaintext: string): Buffer {
  if (!blindIndexKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Blind index key not initialized");
    }
    // Dev mode without ENCRYPTION_KEY: return a deterministic stand-in so the path doesn't blow up
    // on local DBs that aren't using encryption. Production refuses above.
    return getCrypto().createHash("sha256").update("dev:" + plaintext).digest();
  }
  return getCrypto().createHmac("sha256", blindIndexKey as BinaryLike).update(plaintext).digest();
}

export type EncryptionMode = "deterministic" | "random";

export const ENCRYPTED_FIELDS: Record<string, Record<string, EncryptionMode>> = {
  User: {
    email: "deterministic",
    name: "random",
    image: "random",
  },
  Article: {
    body: "random",
    featuredImage: "random",
  },
  ArticleCredit: {
    creditRole: "deterministic",
  },
  ArticleImage: {
    url: "random",
    caption: "random",
    altText: "random",
  },
  RoundTable: {
    prompt: "random",
  },
  RoundTableSide: {
    label: "random",
  },
  RoundTableTurn: {
    body: "random",
  },
};
