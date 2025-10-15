export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export interface KeyBundle {
  identityKey: string;
  ephemeralKey: string;
  userId: string;
  timestamp: number;
}

export interface KeyBundleRaw {
  identityKey: Uint8Array;
  ephemeralKey: Uint8Array;
  userId: string;
  timestamp: number;
}

export interface SessionState {
  peerId: string;
  sessionKey: CryptoKey;
  counter: number;
  established: number;
}

export interface EncryptedFrame {
  data: ArrayBuffer;
  counter: number;
  timestamp: number;
}

export interface E2EConfig {
  enabled: boolean;
  algorithm: 'AES-GCM';
  keySize: 256;
  ivSize: 12;
  tagSize: 128;
}

export const DEFAULT_E2E_CONFIG: E2EConfig = {
  enabled: true,
  algorithm: 'AES-GCM',
  keySize: 256,
  ivSize: 12,
  tagSize: 128,
};
