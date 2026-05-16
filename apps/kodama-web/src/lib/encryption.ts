// AES-256-GCM encryption for OAuth ciphertext columns in Convex.
// Key derived from KODAMA_STATE_SECRET (or NEXTAUTH_SECRET) by SHA-256.
// Output format: `${ivB64}:${ciphertextB64}:${tagB64}`.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit nonce — GCM standard
const TAG_LENGTH = 16;

function key(): Buffer {
  const secret =
    process.env.KODAMA_STATE_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error(
      "missing KODAMA_STATE_SECRET (or NEXTAUTH_SECRET) — required to encrypt OAuth tokens",
    );
  }
  return createHash("sha256").update(secret).digest();
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key(), iv, {
    authTagLength: TAG_LENGTH,
  });
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), ciphertext.toString("base64"), tag.toString("base64")].join(
    ":",
  );
}

export function decrypt(blob: string): string {
  const [ivB64, ctB64, tagB64] = blob.split(":");
  if (!ivB64 || !ctB64 || !tagB64) {
    throw new Error("malformed ciphertext");
  }
  const iv = Buffer.from(ivB64, "base64");
  const ciphertext = Buffer.from(ctB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const decipher = createDecipheriv(ALGORITHM, key(), iv, {
    authTagLength: TAG_LENGTH,
  });
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
