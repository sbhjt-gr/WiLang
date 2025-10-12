import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGE_KEY = '@whisperlang_language';

export type LanguageCode = string | 'auto';

export type LanguageSettings = {
  code: LanguageCode;
};

const defaultSettings: LanguageSettings = {
  code: 'auto',
};

let cachedSettings: LanguageSettings = defaultSettings;
let listeners: Array<(settings: LanguageSettings) => void> = [];

export const SUPPORTED_LANGUAGES = [
  { code: 'auto', name: 'Auto-detect' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'tr', name: 'Turkish' },
  { code: 'pl', name: 'Polish' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'th', name: 'Thai' },
  { code: 'id', name: 'Indonesian' },
  { code: 'ms', name: 'Malay' },
  { code: 'sv', name: 'Swedish' },
  { code: 'no', name: 'Norwegian' },
  { code: 'da', name: 'Danish' },
  { code: 'fi', name: 'Finnish' },
  { code: 'cs', name: 'Czech' },
  { code: 'ro', name: 'Romanian' },
  { code: 'el', name: 'Greek' },
  { code: 'he', name: 'Hebrew' },
  { code: 'fa', name: 'Persian' },
];

const loadSettings = async (): Promise<LanguageSettings> => {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      cachedSettings = parsed;
      return parsed;
    }
  } catch (error) {
    console.log('lang_load_error', error instanceof Error ? error.message : String(error));
  }
  return defaultSettings;
};

const saveSettings = async (settings: LanguageSettings): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, JSON.stringify(settings));
    cachedSettings = settings;
    listeners.forEach((listener) => listener(settings));
  } catch (error) {
    console.log('lang_save_error', error instanceof Error ? error.message : String(error));
  }
};

export const getLanguageSettings = async (): Promise<LanguageSettings> => {
  return loadSettings();
};

export const setLanguageCode = async (code: LanguageCode): Promise<void> => {
  await saveSettings({ code });
};

export const getCachedLanguageSettings = (): LanguageSettings => {
  return cachedSettings;
};

export const subscribeLanguageSettings = (listener: (settings: LanguageSettings) => void): (() => void) => {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
};

loadSettings();
