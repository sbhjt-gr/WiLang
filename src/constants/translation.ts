export type TranslationLanguageOption = {
	id: string;
	label: string;
	locale: string;
};

export const TRANSLATION_LANGUAGE_OPTIONS: TranslationLanguageOption[] = [
	{ id: 'auto', label: 'Auto Detect', locale: 'auto' },
	{ id: 'en', label: 'English', locale: 'en' },
	{ id: 'es', label: 'Spanish', locale: 'es' },
	{ id: 'fr', label: 'French', locale: 'fr' },
	{ id: 'de', label: 'German', locale: 'de' },
	{ id: 'hi', label: 'Hindi', locale: 'hi' },
	{ id: 'pt', label: 'Portuguese', locale: 'pt' },
	{ id: 'it', label: 'Italian', locale: 'it' },
	{ id: 'ja', label: 'Japanese', locale: 'ja' },
	{ id: 'ko', label: 'Korean', locale: 'ko' },
	{ id: 'zh', label: 'Chinese', locale: 'zh' },
	{ id: 'ar', label: 'Arabic', locale: 'ar' },
	{ id: 'ru', label: 'Russian', locale: 'ru' },
	{ id: 'sv', label: 'Swedish', locale: 'sv' },
	{ id: 'bn', label: 'Bengali', locale: 'bn' },
];

export const getTranslationOptionLabel = (id: string) => {
	const row = TRANSLATION_LANGUAGE_OPTIONS.find(item => item.id === id);
	return row ? row.label : id;
};
