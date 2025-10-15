import './cryptoPolyfill';
import { x25519 } from '@noble/curves/ed25519.js';
import * as SecureStore from 'expo-secure-store';
import { KeyPair, KeyBundle } from './CryptoTypes';
import { bytesToHex, hexToBytes } from './CryptoUtils';
import { randomBytes } from '@noble/hashes/utils.js';

const IDENTITY_KEY_STORAGE_KEY = 'whisperlang_identity_key';
const EPHEMERAL_KEY_TTL = 24 * 60 * 60 * 1000;

export class KeyManager {
  private identityKeyPair: KeyPair | null = null;
  private ephemeralKeyPair: KeyPair | null = null;
  private ephemeralKeyTimestamp: number = 0;

  async initialize(): Promise<void> {
    await this.loadOrGenerateIdentityKey();
    await this.generateEphemeralKey();
  }

  private async loadOrGenerateIdentityKey(): Promise<void> {
    try {
      const storedKey = await SecureStore.getItemAsync(IDENTITY_KEY_STORAGE_KEY);

      if (storedKey) {
        const parsed = JSON.parse(storedKey);
        this.identityKeyPair = {
          publicKey: hexToBytes(parsed.publicKey),
          privateKey: hexToBytes(parsed.privateKey),
        };
        console.log('identity_key_loaded');
      } else {
        await this.generateAndStoreIdentityKey();
      }
    } catch (error) {
      console.log('identity_key_load_failed', error);
      await this.generateAndStoreIdentityKey();
    }
  }

  private async generateAndStoreIdentityKey(): Promise<void> {
    const privateKey = randomBytes(32);
    const publicKey = x25519.getPublicKey(privateKey);

    this.identityKeyPair = { publicKey, privateKey };

    const toStore = {
      publicKey: bytesToHex(publicKey),
      privateKey: bytesToHex(privateKey),
    };

    await SecureStore.setItemAsync(
      IDENTITY_KEY_STORAGE_KEY,
      JSON.stringify(toStore)
    );

    console.log('identity_key_generated');
  }

  private async generateEphemeralKey(): Promise<void> {
    const privateKey = randomBytes(32);
    const publicKey = x25519.getPublicKey(privateKey);

    this.ephemeralKeyPair = { publicKey, privateKey };
    this.ephemeralKeyTimestamp = Date.now();

    console.log('ephemeral_key_generated');
  }

  async rotateEphemeralKeyIfNeeded(): Promise<void> {
    const now = Date.now();
    if (now - this.ephemeralKeyTimestamp > EPHEMERAL_KEY_TTL) {
      await this.generateEphemeralKey();
      console.log('ephemeral_key_rotated');
    }
  }

  getIdentityPublicKey(): Uint8Array {
    if (!this.identityKeyPair) {
      throw new Error('identity_key_not_initialized');
    }
    return this.identityKeyPair.publicKey;
  }

  getEphemeralPublicKey(): Uint8Array {
    if (!this.ephemeralKeyPair) {
      throw new Error('ephemeral_key_not_initialized');
    }
    return this.ephemeralKeyPair.publicKey;
  }

  createKeyBundle(userId?: string, peerId?: string): KeyBundle {
    if (!this.identityKeyPair || !this.ephemeralKeyPair) {
      throw new Error('keys_not_initialized');
    }

    if (!userId && !peerId) {
      throw new Error('key_bundle_missing_identifier');
    }

    const bundle: KeyBundle = {
      identityKey: bytesToHex(this.identityKeyPair.publicKey),
      ephemeralKey: bytesToHex(this.ephemeralKeyPair.publicKey),
      timestamp: Date.now(),
    };

    if (userId) {
      bundle.userId = userId;
    }

    if (peerId) {
      bundle.peerId = peerId;
    }

    return bundle;
  }

  computeSharedSecret(peerPublicKey: Uint8Array): Uint8Array {
    if (!this.identityKeyPair) {
      throw new Error('identity_key_not_initialized');
    }

    console.log('computing_shared_secret', { 
      privateKeyType: typeof this.identityKeyPair.privateKey,
      privateKeyLength: this.identityKeyPair.privateKey.length,
      publicKeyType: typeof peerPublicKey,
      publicKeyLength: peerPublicKey.length 
    });

    return x25519.getSharedSecret(this.identityKeyPair.privateKey, peerPublicKey);
  }

  async clearKeys(): Promise<void> {
    this.identityKeyPair = null;
    this.ephemeralKeyPair = null;
    this.ephemeralKeyTimestamp = 0;

    try {
      await SecureStore.deleteItemAsync(IDENTITY_KEY_STORAGE_KEY);
      console.log('keys_cleared');
    } catch (error) {
      console.log('keys_clear_failed', error);
    }
  }
}

export const keyManager = new KeyManager();
