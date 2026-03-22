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

export function initEncryption(hexKey: string): void {
  encryptionKey = Buffer.from(hexKey, "hex");
  if (encryptionKey.length !== 32) {
    throw new Error("Encryption key must be 32 bytes (64 hex characters)");
  }
  deterministicSubKey = Buffer.from(
    getCrypto().createHmac("sha256", encryptionKey).update("deterministic-iv").digest()
  );
}

export function isEncryptionEnabled(): boolean {
  return encryptionKey !== null;
}

export function encrypt(
  plaintext: string,
  mode: "deterministic" | "random"
): string {
  if (!encryptionKey || !deterministicSubKey) {
    if (process.env.NODE_ENV === "production") {
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

  if (!encryptionKey) {
    if (process.env.NODE_ENV === "production") {
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
};
