import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Application from 'expo-application';

const AUTH_ATTEMPTS_KEY = '@auth_attempts';
const AUTH_ATTEMPTS_TIMESTAMP_KEY = '@auth_attempts_timestamp';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000;

type FetchWithTimeoutOptions = RequestInit & {timeout?: number};

const fetchWithTimeout = async (resource: RequestInfo, options: FetchWithTimeoutOptions = {}) => {
  const {timeout = 5000, ...rest} = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(resource, {...rest, signal: controller.signal});
  } finally {
    clearTimeout(id);
  }
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email.toLowerCase());
};

export const validatePassword = (password: string, allowWeakPasswords: boolean = true): { valid: boolean; message: string; isWeak?: boolean } => {
  if (!password) {
    return { valid: false, message: 'Password is required' };
  }

  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters' };
  }

  if (password.length > 128) {
    return { valid: false, message: 'Password must be less than 128 characters' };
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasNonalphas = /\W/.test(password);

  const strengthScore = [hasUpperCase, hasLowerCase, hasNumbers, hasNonalphas].filter(Boolean).length;

  if (strengthScore < 2) {
    if (!allowWeakPasswords) {
      return { 
        valid: false, 
        message: 'Password must contain at least 2 of: uppercase, lowercase, numbers, or special characters' 
      };
    }
    return { 
      valid: true, 
      message: 'Consider using a stronger password with uppercase, lowercase, numbers, and special characters',
      isWeak: true
    };
  }

  return { valid: true, message: 'Strong password' };
};

export const validateName = (name: string): boolean => {
  if (!name) {
    return false;
  }

  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 50;
};

export const checkRateLimiting = async (): Promise<boolean> => {
  try {
    const attemptsStr = await AsyncStorage.getItem(AUTH_ATTEMPTS_KEY);
    const timestampStr = await AsyncStorage.getItem(AUTH_ATTEMPTS_TIMESTAMP_KEY);
    
    const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;
    const timestamp = timestampStr ? parseInt(timestampStr, 10) : 0;
    
    const now = Date.now();
    
    if (now - timestamp > LOCKOUT_DURATION) {
      await AsyncStorage.removeItem(AUTH_ATTEMPTS_KEY);
      await AsyncStorage.removeItem(AUTH_ATTEMPTS_TIMESTAMP_KEY);
      return true;
    }
    
    return attempts < MAX_ATTEMPTS;
  } catch (_error) {
    return true;
  }
};

export const incrementAuthAttempts = async (): Promise<void> => {
  try {
    const attemptsStr = await AsyncStorage.getItem(AUTH_ATTEMPTS_KEY);
    const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;
    
    await AsyncStorage.setItem(AUTH_ATTEMPTS_KEY, (attempts + 1).toString());
    await AsyncStorage.setItem(AUTH_ATTEMPTS_TIMESTAMP_KEY, Date.now().toString());
  } catch (_error) {
  }
};

export const resetAuthAttempts = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(AUTH_ATTEMPTS_KEY);
    await AsyncStorage.removeItem(AUTH_ATTEMPTS_TIMESTAMP_KEY);
  } catch (_error) {
  }
};

export const isEmailFromTrustedProvider = (email: string): boolean => {
  const trustedDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
  const domain = email.split('@')[1]?.toLowerCase();
  return trustedDomains.includes(domain);
};

export const getIpAddress = async (): Promise<{ ip: string | null }> => {
  try {
    const response = await fetchWithTimeout('https://api.ipify.org?format=json', {timeout: 5000});
    const data = await response.json();
    return { ip: data.ip };
  } catch (_error) {
    return { ip: null };
  }
};

export const getGeoLocationFromIp = async (ip: string): Promise<{ geo: any }> => {
  try {
    const response = await fetchWithTimeout(`https://ipapi.co/${ip}/json/`, {timeout: 5000});
    const data = await response.json();
    
    return {
      geo: {
        country: data.country_name,
        region: data.region,
        city: data.city,
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone
      }
    };
  } catch (_error) {
    return { geo: null };
  }
};

export const getDeviceInfo = async (): Promise<any> => {
  try {
    return {
      platform: Platform.OS,
      deviceType: Device.deviceType,
      deviceName: Device.deviceName,
      osName: Device.osName,
      osVersion: Device.osVersion,
      modelName: Device.modelName,
      brand: Device.brand,
      manufacturer: Device.manufacturer,
      appVersion: Application.nativeApplicationVersion,
      buildVersion: Application.nativeBuildVersion,
    };
  } catch (_error) {
    return {};
  }
};

export const storeUserSecurityInfo = async (userId: string, ipData: any, geoData: any, deviceInfo: any): Promise<void> => {
  try {
    const isSecureStoreAvailable = await SecureStore.isAvailableAsync();
    if (!isSecureStoreAvailable) {
      return;
    }

    const securityInfo = {
      userId,
      ipAddress: ipData?.ip ?? null,
      geolocation: geoData?.geo ?? null,
      deviceInfo: deviceInfo ?? {},
      timestamp: new Date().toISOString(),
    };

    await SecureStore.setItemAsync(
      `whisperlang_security_info_${userId}`,
      JSON.stringify(securityInfo),
      { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }
    );
  } catch (_error) {
  }
};