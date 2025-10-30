import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TranslationEngine } from './TranslationService';

export type TranslationLang =
	| 'auto'
	| 'en'
	| 'es'
	| 'fr'
	| 'de'
	| 'hi'
	| 'pt'
	| 'it'
	| 'ja'
	| 'ko'
	| 'zh'
	| 'ar'
	| 'ru'
	| 'sv'
	| 'bn';

export type TranslationPack = {
	source: string;
	target: string;
};

const SOURCE_KEY = '@wilang:translation_source_lang';
const TARGET_KEY = '@wilang:translation_target_lang';
const ENABLED_KEY = '@wilang:translation_enabled';
const AUTO_KEY = '@wilang:translation_auto_detect';
const PACKS_KEY = '@wilang:translation_downloaded_packs';
const ENGINE_KEY = '@wilang:translation_engine';
const UI_KEY = '@wilang:translation_native_ui';

const DEFAULT_SOURCE: TranslationLang = 'auto';
const DEFAULT_TARGET: TranslationLang = 'en';
const DEFAULT_ENGINE: TranslationEngine = 'mlkit';

const parseBool = (value: string | null, fallback: boolean) => {
	if (value === '1') {
		return true;
	}
	if (value === '0') {
		return false;
	}
	return fallback;
};

const saveBool = async (key: string, value: boolean) => {
	try {
		await AsyncStorage.setItem(key, value ? '1' : '0');
	} catch (error) {}
};

const readLang = (value: string | null, fallback: TranslationLang) => {
	if (!value) {
		return fallback;
	}
	if (
		value === 'auto' ||
		value === 'en' ||
		value === 'es' ||
		value === 'fr' ||
		value === 'de' ||
		value === 'hi' ||
		value === 'pt' ||
		value === 'it' ||
		value === 'ja' ||
		value === 'ko' ||
		value === 'zh' ||
		value === 'ar' ||
		value === 'ru' ||
		value === 'sv' ||
		value === 'bn'
	) {
		return value;
	}
	return fallback;
};

export const TranslationPreferences = {
	async getEngine(): Promise<TranslationEngine> {
		try {
			const value = await AsyncStorage.getItem(ENGINE_KEY);
			if (value === 'apple') {
				return 'apple';
			}
		} catch (error) {}
		return DEFAULT_ENGINE;
	},
	async setEngine(value: TranslationEngine): Promise<void> {
		try {
			await AsyncStorage.setItem(ENGINE_KEY, value);
		} catch (error) {}
	},
	async getSource(): Promise<TranslationLang> {
		try {
			const value = await AsyncStorage.getItem(SOURCE_KEY);
			return readLang(value, DEFAULT_SOURCE);
		} catch (error) {}
		return DEFAULT_SOURCE;
	},
	async setSource(value: TranslationLang): Promise<void> {
		try {
			await AsyncStorage.setItem(SOURCE_KEY, value);
		} catch (error) {}
	},
	async getTarget(): Promise<TranslationLang> {
		try {
			const value = await AsyncStorage.getItem(TARGET_KEY);
			return readLang(value, DEFAULT_TARGET);
		} catch (error) {}
		return DEFAULT_TARGET;
	},
	async setTarget(value: TranslationLang): Promise<void> {
		try {
			await AsyncStorage.setItem(TARGET_KEY, value);
		} catch (error) {}
	},
	async isEnabled(): Promise<boolean> {
		try {
			const value = await AsyncStorage.getItem(ENABLED_KEY);
			return parseBool(value, false);
		} catch (error) {}
		return false;
	},
	async setEnabled(value: boolean): Promise<void> {
		await saveBool(ENABLED_KEY, value);
	},
	async isAutoDetect(): Promise<boolean> {
		try {
			const value = await AsyncStorage.getItem(AUTO_KEY);
			return parseBool(value, true);
		} catch (error) {}
		return true;
	},
	async setAutoDetect(value: boolean): Promise<void> {
		await saveBool(AUTO_KEY, value);
	},
	async isNativeUI(): Promise<boolean> {
		try {
			const value = await AsyncStorage.getItem(UI_KEY);
			return parseBool(value, false);
		} catch (error) {}
		return false;
	},
	async setNativeUI(value: boolean): Promise<void> {
		await saveBool(UI_KEY, value);
	},
	async getPacks(): Promise<TranslationPack[]> {
		try {
			const value = await AsyncStorage.getItem(PACKS_KEY);
			if (value) {
				const list = JSON.parse(value) as TranslationPack[];
				if (Array.isArray(list)) {
					return list.filter(item => item && typeof item.source === 'string' && typeof item.target === 'string');
				}
			}
		} catch (error) {}
		return [];
	},
	async setPacks(value: TranslationPack[]): Promise<void> {
		try {
			await AsyncStorage.setItem(PACKS_KEY, JSON.stringify(value));
		} catch (error) {}
	},
};
