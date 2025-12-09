import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SourceLangCode, TargetLangCode } from './palabra/types';

const KEYS = {
  SOURCE: '@wilang:call_translation_source',
  TARGET: '@wilang:call_translation_target',
  ENABLED: '@wilang:call_translation_enabled',
  CLIENT_ID: '@wilang:palabra_client_id',
  CLIENT_SECRET: '@wilang:palabra_client_secret',
};

const DEFAULT_SOURCE: SourceLangCode = 'auto';
const DEFAULT_TARGET: TargetLangCode = 'en-us';

export const CallTranslationPrefs = {
  async getSource(): Promise<SourceLangCode> {
    try {
      const val = await AsyncStorage.getItem(KEYS.SOURCE);
      return (val as SourceLangCode) || DEFAULT_SOURCE;
    } catch {
      return DEFAULT_SOURCE;
    }
  },

  async setSource(lang: SourceLangCode): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.SOURCE, lang);
    } catch {
      console.log('call_prefs_save_err');
    }
  },

  async getTarget(): Promise<TargetLangCode> {
    try {
      const val = await AsyncStorage.getItem(KEYS.TARGET);
      return (val as TargetLangCode) || DEFAULT_TARGET;
    } catch {
      return DEFAULT_TARGET;
    }
  },

  async setTarget(lang: TargetLangCode): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.TARGET, lang);
    } catch {
      console.log('call_prefs_save_err');
    }
  },

  async isEnabled(): Promise<boolean> {
    try {
      const val = await AsyncStorage.getItem(KEYS.ENABLED);
      return val === '1';
    } catch {
      return false;
    }
  },

  async setEnabled(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.ENABLED, enabled ? '1' : '0');
    } catch {
      console.log('call_prefs_save_err');
    }
  },

  async getClientId(): Promise<string> {
    try {
      const val = await AsyncStorage.getItem(KEYS.CLIENT_ID);
      return val || '';
    } catch {
      return '';
    }
  },

  async setClientId(id: string): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.CLIENT_ID, id);
    } catch {
      console.log('call_prefs_save_err');
    }
  },

  async getClientSecret(): Promise<string> {
    try {
      const val = await AsyncStorage.getItem(KEYS.CLIENT_SECRET);
      return val || '';
    } catch {
      return '';
    }
  },

  async setClientSecret(secret: string): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.CLIENT_SECRET, secret);
    } catch {
      console.log('call_prefs_save_err');
    }
  },

  async getAll(): Promise<{
    source: SourceLangCode;
    target: TargetLangCode;
    enabled: boolean;
    clientId: string;
    clientSecret: string;
  }> {
    const [source, target, enabled, clientId, clientSecret] = await Promise.all([
      this.getSource(),
      this.getTarget(),
      this.isEnabled(),
      this.getClientId(),
      this.getClientSecret(),
    ]);
    return { source, target, enabled, clientId, clientSecret };
  },
};

export default CallTranslationPrefs;
