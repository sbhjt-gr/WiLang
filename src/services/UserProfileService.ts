import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../config/firebase';

interface UserProfile {
  displayName: string;
  email: string;
  photoURL?: string;
}

const CACHE_KEY_PREFIX = 'user_profile_';

export class UserProfileService {
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    const cacheKey = `${CACHE_KEY_PREFIX}${userId}`;
    
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      console.log('cache_check', cached ? 'hit' : 'miss');
      if (cached) {
        const profile = JSON.parse(cached);
        console.log('cache_return', profile.displayName);
        return profile;
      }
    } catch (error) {
      console.log('cache_error', error);
    }

    console.log('firestore_fetch');
    try {
      const userDoc = await getDoc(doc(firestore, 'users', userId));
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        const profile: UserProfile = {
          displayName: data.displayName || data.name || 'User',
          email: data.email || '',
          photoURL: data.photoURL,
        };
        
        console.log('firestore_data', profile.displayName);
        
        try {
          await AsyncStorage.setItem(cacheKey, JSON.stringify(profile));
          console.log('cache_saved');
        } catch (error) {
          console.log('cache_save_error', error);
        }
        
        return profile;
      }
      
      console.log('firestore_no_doc');
      return null;
    } catch (error) {
      console.log('firestore_error', error);
      return null;
    }
  }

  static async clearCache(userId: string): Promise<void> {
    const cacheKey = `${CACHE_KEY_PREFIX}${userId}`;
    try {
      await AsyncStorage.removeItem(cacheKey);
    } catch (error) {}
  }

  static async updateCache(userId: string, profile: UserProfile): Promise<void> {
    const cacheKey = `${CACHE_KEY_PREFIX}${userId}`;
    try {
      await AsyncStorage.setItem(cacheKey, JSON.stringify(profile));
    } catch (error) {}
  }
}
