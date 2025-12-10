import AsyncStorage from '@react-native-async-storage/async-storage';

const ENABLED_KEY = '@wilang:tts_enabled';
const RATE_KEY = '@wilang:tts_rate';
const PITCH_KEY = '@wilang:tts_pitch';
const VOLUME_KEY = '@wilang:tts_volume';
const LANGUAGE_KEY = '@wilang:tts_language';

const DEFAULT_ENABLED = false;
const DEFAULT_RATE = 1.0;
const DEFAULT_PITCH = 1.0;
const DEFAULT_VOLUME = 1.0;
const DEFAULT_LANGUAGE: string | null = null;

const parseFloat = (value: string | null, fallback: number): number => {
	if (!value) {
		return fallback;
	}
	const parsed = Number.parseFloat(value);
	if (Number.isNaN(parsed)) {
		return fallback;
	}
	return parsed;
};

const saveFloat = async (key: string, value: number): Promise<void> => {
	try {
		await AsyncStorage.setItem(key, value.toString());
	} catch (error) {}
};

const parseBool = (value: string | null, fallback: boolean): boolean => {
	if (value === '1') {
		return true;
	}
	if (value === '0') {
		return false;
	}
	return fallback;
};

const saveBool = async (key: string, value: boolean): Promise<void> => {
	try {
		await AsyncStorage.setItem(key, value ? '1' : '0');
	} catch (error) {}
};

export const TTSPreferences = {
	async isEnabled(): Promise<boolean> {
		try {
			const value = await AsyncStorage.getItem(ENABLED_KEY);
			return parseBool(value, DEFAULT_ENABLED);
		} catch (error) {}
		return DEFAULT_ENABLED;
	},
	async setEnabled(value: boolean): Promise<void> {
		await saveBool(ENABLED_KEY, value);
	},
	async getRate(): Promise<number> {
		try {
			const value = await AsyncStorage.getItem(RATE_KEY);
			return parseFloat(value, DEFAULT_RATE);
		} catch (error) {}
		return DEFAULT_RATE;
	},
	async setRate(value: number): Promise<void> {
		const clamped = Math.max(0.1, Math.min(2.0, value));
		await saveFloat(RATE_KEY, clamped);
	},
	async getPitch(): Promise<number> {
		try {
			const value = await AsyncStorage.getItem(PITCH_KEY);
			return parseFloat(value, DEFAULT_PITCH);
		} catch (error) {}
		return DEFAULT_PITCH;
	},
	async setPitch(value: number): Promise<void> {
		const clamped = Math.max(0.0, Math.min(2.0, value));
		await saveFloat(PITCH_KEY, clamped);
	},
	async getVolume(): Promise<number> {
		try {
			const value = await AsyncStorage.getItem(VOLUME_KEY);
			return parseFloat(value, DEFAULT_VOLUME);
		} catch (error) {}
		return DEFAULT_VOLUME;
	},
	async setVolume(value: number): Promise<void> {
		const clamped = Math.max(0.0, Math.min(1.0, value));
		await saveFloat(VOLUME_KEY, clamped);
	},
	async getLanguage(): Promise<string | null> {
		try {
			const value = await AsyncStorage.getItem(LANGUAGE_KEY);
			return value || DEFAULT_LANGUAGE;
		} catch (error) {}
		return DEFAULT_LANGUAGE;
	},
	async setLanguage(value: string | null): Promise<void> {
		try {
			if (value) {
				await AsyncStorage.setItem(LANGUAGE_KEY, value);
			} else {
				await AsyncStorage.removeItem(LANGUAGE_KEY);
			}
		} catch (error) {}
	},
};

