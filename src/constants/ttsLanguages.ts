import type { TranslationLang } from '../services/TranslationPreferences';

export const TTS_LANGUAGE_MAP: Record<TranslationLang, string> = {
	auto: 'en-US',
	en: 'en-US',
	es: 'es-ES',
	fr: 'fr-FR',
	de: 'de-DE',
	hi: 'hi-IN',
	pt: 'pt-BR',
	it: 'it-IT',
	ja: 'ja-JP',
	ko: 'ko-KR',
	zh: 'zh-CN',
	ar: 'ar-SA',
	ru: 'ru-RU',
	sv: 'sv-SE',
	bn: 'bn-BD',
};

export const getTTSLanguage = (translationLang: TranslationLang | string | null | undefined): string => {
	if (!translationLang || translationLang === 'auto') {
		return TTS_LANGUAGE_MAP.en;
	}
	const normalized = translationLang.toLowerCase().trim();
	if (normalized in TTS_LANGUAGE_MAP) {
		return TTS_LANGUAGE_MAP[normalized as TranslationLang];
	}
	return TTS_LANGUAGE_MAP.en;
};

