import { 
  signOut, 
  onAuthStateChanged, 
  FirebaseAuthTypes 
} from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { getAuthInstance } from './FirebaseInstances';
import { 
  UserData, 
  storeAuthState, 
  getUserFromSecureStorage 
} from './AuthStorage';
import { isFirebaseReady } from './FirebaseConfig';

export const logoutUser = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    await signOut(getAuthInstance());
    
    try {
      await GoogleSignin.revokeAccess();
      await GoogleSignin.signOut();
    } catch {
      
    }
    
    await storeAuthState(null);
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: 'Failed to log out. Please try again.' 
    };
  }
};

export const getCurrentUser = (): FirebaseAuthTypes.User | null => {
  try {
    if (!isFirebaseReady()) {
      return null;
    }
    return getAuthInstance().currentUser;
  } catch (_error) {
    return null;
  }
};

export const isAuthenticated = async (): Promise<boolean> => {
  try {
    if (!isFirebaseReady()) {
      return false;
    }
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(getAuthInstance(), (user: FirebaseAuthTypes.User | null) => {
        unsubscribe();
        resolve(!!user);
      });
    });
  } catch (_error) {
    return false;
  }
};

export const initAuthState = async (): Promise<{ user: FirebaseAuthTypes.User | null; profile: UserData | null }> => {
  try {
    const currentUser = getAuthInstance().currentUser;
    if (currentUser) {
      try {
        await currentUser.reload();
      } catch {
        
      }
      
      await storeAuthState(currentUser);
      return { user: currentUser, profile: null };
    }
    
    const storedUser = await getUserFromSecureStorage();
    if (!storedUser) return { user: null, profile: null };
    
    return await new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(getAuthInstance(), async (user: FirebaseAuthTypes.User | null) => {
        unsubscribe();
        if (user) {
          try {
            await user.reload();
          } catch (error) {
            
          }
          
          await storeAuthState(user);
          resolve({ user, profile: storedUser });
        } else {
          resolve({ user: null, profile: null });
        }
      });
    });
  } catch (_error) {
    return { user: null, profile: null };
  }
};

export const getCompleteUserData = async (): Promise<{
  user: FirebaseAuthTypes.User | null;
  profile: UserData | null;
  isAuthenticated: boolean;
}> => {
  try {
    const currentUser = getCurrentUser();
    
    if (!currentUser) {
      const storedProfile = await getUserFromSecureStorage();
      return {
        user: null,
        profile: storedProfile,
        isAuthenticated: false
      };
    }

    try {
      await currentUser.reload();
    } catch (error) {
      
    }

    const profileData = await getUserFromSecureStorage();
    
    if (profileData && profileData.emailVerified !== currentUser.emailVerified) {
      profileData.emailVerified = currentUser.emailVerified;
      await storeAuthState(currentUser, profileData);
    }

    return {
      user: currentUser,
      profile: profileData,
      isAuthenticated: true
    };
  } catch (_error) {
    return {
      user: null,
      profile: null,
      isAuthenticated: false
    };
  }
};