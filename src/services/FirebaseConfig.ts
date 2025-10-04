import { getApp } from '@react-native-firebase/app';

let isInitialized = false;

export const initializeFirebase = async (): Promise<void> => {
  try {
    let app;
    try {
      app = getApp();
      isInitialized = true;
    } catch (error: any) {
      throw new Error('Firebase configuration files missing or invalid');
    }
  } catch (error) {
    isInitialized = false;
    if (__DEV__) {
      throw error;
    } else {
      throw new Error('Service initialization failed');
    }
  }
};

export const isFirebaseReady = (): boolean => {
  if (!isInitialized) {
    return false;
  }
  
  try {
    getApp();
    return true;
  } catch (error) {
    isInitialized = false;
    return false;
  }
};

export const waitForAuthReady = async (): Promise<boolean> => {
  return new Promise((resolve) => {
    const maxAttempts = 50;
    let attempts = 0;
    
    const checkReady = () => {
      if (isInitialized || attempts >= maxAttempts) {
        resolve(isInitialized);
        return;
      }
      
      attempts++;
      setTimeout(checkReady, 100);
    };
    
    checkReady();
  });
};

export { isInitialized };