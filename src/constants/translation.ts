export type TranslationLanguageOption = {
	id: string;
	label: string;
	locale: string;
};

export const TRANSLATION_LANGUAGE_OPTIONS: TranslationLanguageOption[] = [
	{ id: 'auto', label: 'Auto Detect', locale: 'auto' },
	{ id: 'en', label: 'English', locale: 'en' },
	{ id: 'hi', label: 'Hindi', locale: 'hi' },
	{ id: 'bn', label: 'Bengali', locale: 'bn' },
	{ id: 'te', label: 'Telugu', locale: 'te' },
	{ id: 'mr', label: 'Marathi', locale: 'mr' },
	{ id: 'ta', label: 'Tamil', locale: 'ta' },
	{ id: 'gu', label: 'Gujarati', locale: 'gu' },
	{ id: 'kn', label: 'Kannada', locale: 'kn' },
	{ id: 'ml', label: 'Malayalam', locale: 'ml' },
	{ id: 'pa', label: 'Punjabi', locale: 'pa' },
	{ id: 'ur', label: 'Urdu', locale: 'ur' },
];

export const getTranslationOptionLabel = (id: string) => {
	const row = TRANSLATION_LANGUAGE_OPTIONS.find(item => item.id === id);
	return row ? row.label : id;
};
