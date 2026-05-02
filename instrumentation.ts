export async function register() {
  if (typeof EdgeRuntime !== "undefined") return;

  const { initEncryption, markEncryptionInitFailed } = await import("@/lib/encryption");

  try {
    if (process.env.NODE_ENV === "production") {
      const arn = process.env.AWS_SECRETS_MANAGER_KEY_ARN;
      if (arn) {
        const { SecretsManagerClient, GetSecretValueCommand } = await import(
          "@aws-sdk/client-secrets-manager"
        );
        const client = new SecretsManagerClient({});
        const response = await client.send(
          new GetSecretValueCommand({ SecretId: arn })
        );
        if (!response.SecretString) {
          throw new Error("Encryption key not found in Secrets Manager");
        }
        initEncryption(response.SecretString);
        return;
      }

      const key = process.env.ENCRYPTION_KEY;
      if (!key) {
        throw new Error(
          "Encryption key required in production: set ENCRYPTION_KEY or AWS_SECRETS_MANAGER_KEY_ARN"
        );
      }
      initEncryption(key);
      return;
    }

    const key = process.env.ENCRYPTION_KEY;
    if (key) {
      initEncryption(key);
      console.log("Encryption enabled (dev mode)");
    } else {
      console.log("Encryption disabled (no ENCRYPTION_KEY set)");
    }
  } catch (err) {
    // Next.js swallows instrumentation errors and keeps serving — flag the encryption module so
    // every subsequent encrypt/decrypt throws in production, turning silent plaintext into loud 500s.
    markEncryptionInitFailed((err as Error).message);
    if (process.env.NODE_ENV === "production") {
      throw err;
    }
  }
}

declare const EdgeRuntime: string | undefined;
