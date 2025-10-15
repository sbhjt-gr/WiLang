import { User as FirebaseUser } from 'firebase/auth';
import * as SecureStore from 'expo-secure-store';

export type UserData = {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  lastLoginAt: string;
  createdAt?: any;
  updatedAt?: any;
  trustedEmail?: boolean;
  settings?: any;
  status?: any;
  registrationInfo?: any;
  lastLoginInfo?: any;
};

export const USER_AUTH_KEY = 'whisperlang_secure_user_auth_state';

export const storeAuthState = async (user: FirebaseUser | null, profileData?: any): Promise<boolean> => {
  try {
    const isSecureStoreAvailable = await SecureStore.isAvailableAsync();
    if (!isSecureStoreAvailable) {
      await SecureStore.deleteItemAsync(USER_AUTH_KEY);
      return false;
    }

    if (!user) {
      await SecureStore.deleteItemAsync(USER_AUTH_KEY);
      return true;
    }

    let userData: UserData = {
      uid: user.uid,
      email: user.email,
      emailVerified: user.emailVerified,
      displayName: user.displayName,
      lastLoginAt: new Date().toISOString(),
    };

    if (profileData) {
      userData = {
        ...userData,
        ...profileData,
        emailVerified: user.emailVerified,
        lastLoginAt: profileData.lastLoginAt || userData.lastLoginAt,
      };
    }

    await SecureStore.setItemAsync(
      USER_AUTH_KEY,
      JSON.stringify(userData),
      { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }
    );
    return true;
  } catch (_error) {
    return false;
  }
};

export const getUserFromSecureStorage = async (): Promise<UserData | null> => {
  try {
    const isSecureStoreAvailable = await SecureStore.isAvailableAsync();
    if (!isSecureStoreAvailable) {
      await SecureStore.deleteItemAsync(USER_AUTH_KEY);
      return null;
    }

    const userData = await SecureStore.getItemAsync(USER_AUTH_KEY);

    if (!userData) {
      return null;
    }

    const parsed = JSON.parse(userData);
    if (!parsed.uid) {
      await SecureStore.deleteItemAsync(USER_AUTH_KEY);
      return null;
    }

    try {
      return parsed;
    } catch {
      await SecureStore.deleteItemAsync(USER_AUTH_KEY);
      return null;
    }
  } catch {
    await SecureStore.deleteItemAsync(USER_AUTH_KEY);
    return null;
  }
};