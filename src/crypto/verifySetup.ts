import { keyManager } from './KeyManager';
import { sessionManager } from './SessionManager';

export async function verifyE2ESetup(): Promise<boolean> {
  try {
    console.log('e2e_verification_start');

    await keyManager.initialize();
    console.log('e2e_key_manager_initialized');

    const publicKey = keyManager.getIdentityPublicKey();
    if (!publicKey || publicKey.length !== 32) {
      console.log('e2e_verification_failed', 'invalid_public_key');
      return false;
    }
    console.log('e2e_public_key_valid');

    const bundle = keyManager.createKeyBundle('test-user');
    if (!bundle.identityKey || !bundle.ephemeralKey) {
      console.log('e2e_verification_failed', 'invalid_bundle');
      return false;
    }
    console.log('e2e_key_bundle_valid');

    const session = await sessionManager.establishSession('test-peer', bundle);
    if (!session.sessionKey) {
      console.log('e2e_verification_failed', 'invalid_session');
      return false;
    }
    console.log('e2e_session_valid');

    const securityCode = sessionManager.getSecurityCode('test-peer');
    if (!securityCode || securityCode.length === 0) {
      console.log('e2e_verification_failed', 'invalid_security_code');
      return false;
    }
    console.log('e2e_security_code_valid', securityCode);

    sessionManager.closeSession('test-peer');
    console.log('e2e_verification_complete');
    return true;
  } catch (error) {
    console.log('e2e_verification_error', error);
    return false;
  }
}
