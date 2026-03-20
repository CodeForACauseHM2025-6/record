import { initEncryption } from "@/lib/encryption";

export async function register() {
  if (process.env.NODE_ENV === "production") {
    const { SecretsManagerClient, GetSecretValueCommand } = await import(
      "@aws-sdk/client-secrets-manager"
    );
    const client = new SecretsManagerClient({});
    const command = new GetSecretValueCommand({
      SecretId: process.env.AWS_SECRETS_MANAGER_KEY_ARN,
    });
    const response = await client.send(command);
    if (!response.SecretString) {
      throw new Error("Encryption key not found in Secrets Manager");
    }
    initEncryption(response.SecretString);
  } else {
    const key = process.env.ENCRYPTION_KEY;
    if (key) {
      initEncryption(key);
      console.log("Encryption enabled (dev mode)");
    } else {
      console.log("Encryption disabled (no ENCRYPTION_KEY set)");
    }
  }
}
