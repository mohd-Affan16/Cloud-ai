
const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getEncryptionKey() {
  const secret = process.env.API_KEY_ENCRYPTION_SECRET;

  if (!secret || !/^[0-9a-fA-F]{64}$/.test(secret)) {
    throw new Error(
      "API_KEY_ENCRYPTION_SECRET must be a 64-character hexadecimal string."
    );
  }

  return Buffer.from(secret, "hex");
}

function encryptApiKey(apiKey) {
  if (typeof apiKey !== "string" || apiKey.length === 0) {
    throw new Error("API key must be a non-empty string.");
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let ciphertext = cipher.update(apiKey, "utf8", "base64");
  ciphertext += cipher.final("base64");

  const authTag = cipher.getAuthTag();

  return {
    ciphertext,
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

function decryptApiKey(encryptedData) {
  const { ciphertext, iv, authTag } = encryptedData || {};

  if (
    typeof ciphertext !== "string" ||
    typeof iv !== "string" ||
    typeof authTag !== "string"
  ) {
    throw new Error("Invalid encrypted API-key data.");
  }

  const ivBuffer = Buffer.from(iv, "base64");
  const authTagBuffer = Buffer.from(authTag, "base64");

  if (ivBuffer.length !== IV_LENGTH || authTagBuffer.length !== 16) {
    throw new Error("Invalid encryption metadata.");
  }

  const key = getEncryptionKey();

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    ivBuffer
  );

  decipher.setAuthTag(authTagBuffer);

  let plaintext = decipher.update(ciphertext, "base64", "utf8");
  plaintext += decipher.final("utf8");

  return plaintext;
}

module.exports = {
  encryptApiKey,
  decryptApiKey,
};
