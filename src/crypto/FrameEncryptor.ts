import { sessionManager } from './SessionManager';
import { createDeterministicIV } from './CryptoUtils';
import { DEFAULT_E2E_CONFIG } from './CryptoTypes';

export class FrameEncryptor {
  private enabled: boolean = DEFAULT_E2E_CONFIG.enabled;
  private frameCounters = new Map<string, number>();

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async encryptFrame(
    frame: any,
    peerId: string
  ): Promise<any> {
    if (!this.enabled) {
      return frame;
    }

    const session = sessionManager.getSession(peerId);
    if (!session) {
      console.log('no_session_skipping_encryption', peerId);
      return frame;
    }

    try {
      const frameData = new Uint8Array(frame.data);

      let counter = this.frameCounters.get(peerId) || 0;
      counter++;
      this.frameCounters.set(peerId, counter);

      const timestamp = frame.timestamp || Date.now();
      const ssrc = frame.synchronizationSource || 0;
      const iv = createDeterministicIV(timestamp, ssrc, counter);

      const encryptedData = await crypto.subtle.encrypt(
        {
          name: DEFAULT_E2E_CONFIG.algorithm,
          iv,
          tagLength: DEFAULT_E2E_CONFIG.tagSize,
        },
        session.sessionKey,
        frameData
      );

      frame.data = encryptedData;
      return frame;
    } catch (error) {
      console.log('frame_encryption_failed', error);
      return frame;
    }
  }

  async decryptFrame(
    frame: any,
    peerId: string
  ): Promise<any> {
    if (!this.enabled) {
      return frame;
    }

    const session = sessionManager.getSession(peerId);
    if (!session) {
      console.log('no_session_skipping_decryption', peerId);
      return frame;
    }

    try {
      const encryptedData = new Uint8Array(frame.data);

      const timestamp = frame.timestamp || Date.now();
      const ssrc = frame.synchronizationSource || 0;

      let counter = this.frameCounters.get(peerId) || 0;
      counter++;
      this.frameCounters.set(peerId, counter);

      const iv = createDeterministicIV(timestamp, ssrc, counter);

      const decryptedData = await crypto.subtle.decrypt(
        {
          name: DEFAULT_E2E_CONFIG.algorithm,
          iv,
          tagLength: DEFAULT_E2E_CONFIG.tagSize,
        },
        session.sessionKey,
        encryptedData
      );

      frame.data = decryptedData;
      return frame;
    } catch (error) {
      console.log('frame_decryption_failed', error);
      return frame;
    }
  }

  resetCounter(peerId: string): void {
    this.frameCounters.delete(peerId);
  }

  clearAllCounters(): void {
    this.frameCounters.clear();
  }
}

export const frameEncryptor = new FrameEncryptor();
