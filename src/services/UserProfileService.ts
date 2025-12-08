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
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {}

    try {
      const userDoc = await getDoc(doc(firestore, 'users', userId));
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        const profile: UserProfile = {
          displayName: data.displayName || data.name || 'User',
          email: data.email || '',
          photoURL: data.photoURL,
        };
        
        try {
          await AsyncStorage.setItem(cacheKey, JSON.stringify(profile));
        } catch (error) {}
        
        return profile;
      }
      
      return null;
    } catch (error) {
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
