import { APP_NAME, isSupportedBackupAppName } from "../constants/app";
import type { BackupAppName } from "../constants/app";
import { ImportLimitError } from "./security-limits";

export const PBKDF2_ITERATIONS = 310_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

export type EncryptedBackupEnvelope = {
  exportKind: "encrypted_full";
  appName: BackupAppName;
  version: string;
  exportedAt: string;
  algorithm: "AES-GCM";
  kdf: "PBKDF2";
  hash: "SHA-256";
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
};

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bufferSource(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

async function deriveAesKey(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: bufferSource(salt),
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export function assertBackupPassword(password: string): void {
  if (password.length < 8) {
    throw new ImportLimitError(
      "Backup password must be at least 8 characters.",
    );
  }
}

export async function encryptBackupPayload(
  plaintextUtf8: string,
  password: string,
  meta: { version: string; exportedAt: string },
): Promise<EncryptedBackupEnvelope> {
  assertBackupPassword(password);
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveAesKey(password, salt, PBKDF2_ITERATIONS);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: bufferSource(iv) },
    key,
    new TextEncoder().encode(plaintextUtf8),
  );

  return {
    exportKind: "encrypted_full",
    appName: APP_NAME,
    version: meta.version,
    exportedAt: meta.exportedAt,
    algorithm: "AES-GCM",
    kdf: "PBKDF2",
    hash: "SHA-256",
    iterations: PBKDF2_ITERATIONS,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  };
}

export async function decryptBackupEnvelope(
  envelope: EncryptedBackupEnvelope,
  password: string,
): Promise<string> {
  if (envelope.exportKind !== "encrypted_full") {
    throw new ImportLimitError("Not an encrypted backup file.");
  }
  if (
    envelope.algorithm !== "AES-GCM" ||
    envelope.kdf !== "PBKDF2" ||
    envelope.hash !== "SHA-256"
  ) {
    throw new ImportLimitError("Unsupported encryption parameters.");
  }

  const salt = fromBase64(envelope.salt);
  const iv = fromBase64(envelope.iv);
  const data = fromBase64(envelope.ciphertext);
  const key = await deriveAesKey(password, salt, envelope.iterations);

  try {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: bufferSource(iv) },
      key,
      bufferSource(data),
    );
    return new TextDecoder().decode(plain);
  } catch {
    throw new ImportLimitError(
      "Could not decrypt backup. Check your password and file.",
    );
  }
}

export function isEncryptedBackupEnvelope(
  data: unknown,
): data is EncryptedBackupEnvelope {
  if (!data || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  return (
    o.exportKind === "encrypted_full" &&
    isSupportedBackupAppName(o.appName) &&
    typeof o.ciphertext === "string" &&
    typeof o.salt === "string" &&
    typeof o.iv === "string"
  );
}
