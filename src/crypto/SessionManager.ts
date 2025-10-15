import { KeyBundle, SessionState } from './CryptoTypes';
import { keyManager } from './KeyManager';
import { deriveKey, importKeyForAES, generateSecurityCode, hexToBytes } from './CryptoUtils';

export class SessionManager {
  private sessions = new Map<string, SessionState>();
  private securityCodes = new Map<string, string>();

  async establishSession(
    peerId: string,
    peerBundle: KeyBundle
  ): Promise<SessionState> {
    const existingSession = this.sessions.get(peerId);
    if (existingSession) {
      return existingSession;
    }

    const peerIdentityKey = hexToBytes(peerBundle.identityKey);
    const sharedSecret = keyManager.computeSharedSecret(peerIdentityKey);

    const derivedKey = deriveKey(sharedSecret);
    const sessionKey = await importKeyForAES(derivedKey);

    const session: SessionState = {
      peerId,
      sessionKey,
      counter: 0,
      established: Date.now(),
    };

    this.sessions.set(peerId, session);

    const localPublicKey = keyManager.getIdentityPublicKey();
    const securityCode = generateSecurityCode(localPublicKey, peerIdentityKey);
    this.securityCodes.set(peerId, securityCode);

    console.log('session_established', peerId);
    return session;
  }

  getSession(peerId: string): SessionState | undefined {
    return this.sessions.get(peerId);
  }

  getSecurityCode(peerId: string): string | undefined {
    return this.securityCodes.get(peerId);
  }

  incrementCounter(peerId: string): number {
    const session = this.sessions.get(peerId);
    if (!session) {
      throw new Error('session_not_found');
    }
    session.counter++;
    return session.counter;
  }

  hasSession(peerId: string): boolean {
    return this.sessions.has(peerId);
  }

  closeSession(peerId: string): void {
    this.sessions.delete(peerId);
    this.securityCodes.delete(peerId);
    console.log('session_closed', peerId);
  }

  closeAllSessions(): void {
    this.sessions.clear();
    this.securityCodes.clear();
    console.log('all_sessions_closed');
  }

  getActiveSessions(): string[] {
    return Array.from(this.sessions.keys());
  }
}

export const sessionManager = new SessionManager();
