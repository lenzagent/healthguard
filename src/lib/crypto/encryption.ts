/**
 * AES-256-GCM Encryption Utilities
 *
 * Used for encrypting sensitive health data at rest.
 * PIPL requirement: all personal health information must be encrypted during storage.
 *
 * Uses Web Crypto API (available in Node.js 19+ and Edge runtime).
 */

const ALGORITHM = "AES-GCM"; // Key size (32 bytes) determines AES-256
const IV_LENGTH = 12; // 96 bits is recommended for GCM
const AUTH_TAG_LENGTH = 128; // bits

function getEncryptionKey(): Uint8Array {
  const keyHex = process.env.HEALTH_DATA_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error("HEALTH_DATA_ENCRYPTION_KEY environment variable is not set");
  }
  // Convert hex string to Uint8Array using Buffer (avoids TS lib type issues)
  const key = Buffer.from(keyHex, "hex");
  if (key.length !== 32) {
    throw new Error("HEALTH_DATA_ENCRYPTION_KEY must be 32 bytes (64 hex characters) for AES-256");
  }
  return new Uint8Array(key);
}

async function importKey(rawKey: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    rawKey as BufferSource,
    { name: ALGORITHM },
    false,
    ["encrypt", "decrypt"]
  );
}

export interface EncryptedData {
  ciphertext: string; // base64-encoded ciphertext
  iv: string; // base64-encoded initialization vector
  authTag: string; // base64-encoded authentication tag
}

/**
 * Encrypt plaintext health data using AES-256-GCM.
 */
export async function encryptHealthData(plaintext: string): Promise<EncryptedData> {
  const rawKey = getEncryptionKey();
  const key = await importKey(rawKey);

  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encodedPlaintext = new TextEncoder().encode(plaintext);

  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv, tagLength: AUTH_TAG_LENGTH },
    key,
    encodedPlaintext
  );

  // The encrypted buffer contains ciphertext + auth tag at the end
  const encryptedArray = new Uint8Array(encrypted);
  const ciphertext = encryptedArray.slice(0, encryptedArray.length - 16);
  const authTag = encryptedArray.slice(encryptedArray.length - 16);

  return {
    ciphertext: Buffer.from(ciphertext).toString("base64"),
    iv: Buffer.from(iv).toString("base64"),
    authTag: Buffer.from(authTag).toString("base64"),
  };
}

/**
 * Decrypt health data encrypted with AES-256-GCM.
 */
export async function decryptHealthData(encrypted: EncryptedData): Promise<string> {
  const rawKey = getEncryptionKey();
  const key = await importKey(rawKey);

  const iv = Buffer.from(encrypted.iv, "base64");
  const ciphertext = Buffer.from(encrypted.ciphertext, "base64");
  const authTag = Buffer.from(encrypted.authTag, "base64");

  // Recombine ciphertext + auth tag
  const combined = new Uint8Array(ciphertext.length + authTag.length);
  combined.set(new Uint8Array(ciphertext), 0);
  combined.set(new Uint8Array(authTag), ciphertext.length);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: new Uint8Array(iv), tagLength: AUTH_TAG_LENGTH },
    key,
    combined
  );

  return new TextDecoder().decode(decrypted);
}
