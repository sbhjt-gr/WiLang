import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFERRED_MODEL_KEY = '@wilang:preferred_whisper_model';
const PREFERRED_LANGUAGE_KEY = '@wilang:preferred_whisper_language';

export type WhisperModelVariant = 'tiny' | 'base' | 'small' | 'medium' | 'large-v3';

export type WhisperLanguage = 'auto' | 'en' | 'es' | 'fr' | 'hi' | 'de' | 'pt' | 'bn' | 'sv' | 'ja' | 'ko';

export const SUPPORTED_LANGUAGES: { code: WhisperLanguage; name: string; flag: string }[] = [
  { code: 'auto', name: 'Auto Detect', flag: '🌐' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'bn', name: 'Bengali', flag: '🇧🇩' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
];

export const ModelPreferences = {
  async getPreferredModel(): Promise<WhisperModelVariant> {
    try {
      const stored = await AsyncStorage.getItem(PREFERRED_MODEL_KEY);
      if (stored && ['tiny', 'base', 'small', 'medium', 'large-v3'].includes(stored)) {
        return stored as WhisperModelVariant;
      }
    } catch (error) {
    }
    return 'small';
  },

  async setPreferredModel(model: WhisperModelVariant): Promise<void> {
    try {
      await AsyncStorage.setItem(PREFERRED_MODEL_KEY, model);
    } catch (error) {
    }
  },

  async getPreferredLanguage(): Promise<WhisperLanguage> {
    try {
      const stored = await AsyncStorage.getItem(PREFERRED_LANGUAGE_KEY);
      if (stored && SUPPORTED_LANGUAGES.some(lang => lang.code === stored)) {
        return stored as WhisperLanguage;
      }
    } catch (error) {
    }
    return 'auto';
  },

  async setPreferredLanguage(language: WhisperLanguage): Promise<void> {
    try {
      await AsyncStorage.setItem(PREFERRED_LANGUAGE_KEY, language);
    } catch (error) {
    }
  },
};
