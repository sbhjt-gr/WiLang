import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFERRED_MODEL_KEY = '@wilang:preferred_whisper_model';

export type WhisperModelVariant = 'tiny' | 'base' | 'small' | 'medium' | 'large-v3';

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
};
