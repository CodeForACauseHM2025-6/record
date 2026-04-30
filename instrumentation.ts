export async function register() {
  if (typeof EdgeRuntime !== "undefined") return;

  const { initEncryption } = await import("@/lib/encryption");

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
}

declare const EdgeRuntime: string | undefined;
