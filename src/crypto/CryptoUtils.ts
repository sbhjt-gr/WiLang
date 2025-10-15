import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha2';

export function deriveKey(
  sharedSecret: Uint8Array,
  salt: string = 'WhisperLang-E2E-v1',
  info: string = 'session-key'
): Uint8Array {
  return hkdf(sha256, sharedSecret, salt, info, 32);
}

export function createDeterministicIV(
  timestamp: number,
  ssrc: number,
  counter: number
): Uint8Array {
  const iv = new Uint8Array(12);
  const view = new DataView(iv.buffer);
  view.setUint32(0, ssrc, false);
  view.setBigUint64(4, BigInt(timestamp), false);
  return iv;
}

export function generateSecurityCode(
  localKey: Uint8Array,
  remoteKey: Uint8Array
): string {
  const keys = [localKey, remoteKey].sort((a, b) => {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      if (a[i] !== b[i]) return a[i] - b[i];
    }
    return a.length - b.length;
  });

  const combined = new Uint8Array(keys[0].length + keys[1].length);
  combined.set(keys[0], 0);
  combined.set(keys[1], keys[0].length);

  const hash = sha256(combined);

  const digits = hash.slice(0, 8);
  let code = '';
  for (let i = 0; i < 6; i++) {
    const value = (digits[i * 2] << 8) | digits[i * 2 + 1];
    code += (value % 10000).toString().padStart(4, '0');
    if (i < 5) code += ' ';
  }

  return code.substring(0, 14);
}

export async function importKeyForAES(keyData: Uint8Array): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('hex_string_invalid_length');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}
