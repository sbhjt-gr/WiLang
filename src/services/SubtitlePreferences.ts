import AsyncStorage from '@react-native-async-storage/async-storage';

export type ExpoSpeechMode = 'cloud' | 'device' | 'auto';
export type SubtitleLang = 'auto' | 'en' | 'es' | 'fr' | 'hi' | 'de' | 'pt' | 'bn' | 'sv' | 'ja' | 'ko';

const MODE_KEY = '@wilang:subtitle_mode';
const LANG_KEY = '@wilang:subtitle_lang';
const ENABLED_KEY = '@wilang:subtitle_enabled';

const LANG_MAP: Record<SubtitleLang, string> = {
	auto: 'en-US',
	en: 'en-US',
	es: 'es-ES',
	fr: 'fr-FR',
	hi: 'hi-IN',
	de: 'de-DE',
	pt: 'pt-BR',
	bn: 'bn-BD',
	sv: 'sv-SE',
	ja: 'ja-JP',
	ko: 'ko-KR',
};

const DEFAULT_MODE: ExpoSpeechMode = 'cloud';
const DEFAULT_LANG: SubtitleLang = 'auto';

export const EXPO_ON_DEVICE_SERVICE = 'com.google.android.as';

export const SubtitlePreferences = {
	async getExpoMode(): Promise<ExpoSpeechMode> {
		try {
			const val = await AsyncStorage.getItem(MODE_KEY);
			if (val === 'cloud' || val === 'device' || val === 'auto') {
				return val;
			}
		} catch (error) {}
		return DEFAULT_MODE;
	},
	async setExpoMode(val: ExpoSpeechMode): Promise<void> {
		try {
			await AsyncStorage.setItem(MODE_KEY, val);
		} catch (error) {}
	},
	async getExpoLanguage(): Promise<SubtitleLang> {
		try {
			const val = await AsyncStorage.getItem(LANG_KEY);
			if (val && (val as SubtitleLang) in LANG_MAP) {
				return val as SubtitleLang;
			}
		} catch (error) {}
		return DEFAULT_LANG;
	},
	async setExpoLanguage(val: SubtitleLang): Promise<void> {
		try {
			await AsyncStorage.setItem(LANG_KEY, val);
		} catch (error) {}
	},
	getLocale(code: SubtitleLang): string {
		return LANG_MAP[code] || LANG_MAP.auto;
	},
	async isEnabled(): Promise<boolean> {
		try {
			const value = await AsyncStorage.getItem(ENABLED_KEY);
			if (value === '1') {
				return true;
			}
			if (value === '0') {
				return false;
			}
		} catch (error) {}
		return false;
	},
	async setEnabled(value: boolean): Promise<void> {
		try {
			await AsyncStorage.setItem(ENABLED_KEY, value ? '1' : '0');
		} catch (error) {}
	},
};
