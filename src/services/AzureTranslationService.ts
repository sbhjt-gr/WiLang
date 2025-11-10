import { AzureConfigService } from './AzureConfig';
import { TranslationService } from './TranslationService';
import type { AzureTranslationResult } from '../types/azure';
import type { TranslationLang } from './TranslationPreferences';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const simulateWordByWord = async (
	text: string,
	source: TranslationLang,
	target: TranslationLang,
	onProgress: (original: string, translated: string) => void
): Promise<void> => {
	const words = text.trim().split(/\s+/);
	let originalAcc = '';
	let translatedAcc = '';

	for (const word of words) {
		await delay(200 + Math.random() * 200);
		
		originalAcc = originalAcc ? `${originalAcc} ${word}` : word;
		
		try {
			const translatedWord = await TranslationService.translate(word, source, target);
			translatedAcc = translatedAcc ? `${translatedAcc} ${translatedWord}` : translatedWord;
		} catch (error) {
			console.log('azure_sim_word_error', error);
			translatedAcc = translatedAcc ? `${translatedAcc} ${word}` : word;
		}
		
		onProgress(originalAcc, translatedAcc);
	}
};

export const AzureTranslationService = {
	isAvailable(): boolean {
		return AzureConfigService.isAvailable();
	},

	async translateRealtime(
		text: string,
		source: TranslationLang,
		target: TranslationLang,
		onProgress: (original: string, translated: string) => void
	): Promise<AzureTranslationResult> {
		console.log('azure_sim_start', { source, target, textLength: text.length });
		
		await delay(1500);
		
		await simulateWordByWord(text, source, target, onProgress);
		
		const finalTranslated = await TranslationService.translate(text, source, target);
		
		console.log('azure_sim_complete');
		
		return {
			original: text,
			translated: finalTranslated,
			timestamp: Date.now(),
		};
	},

	async translateStandard(
		text: string,
		source: TranslationLang,
		target: TranslationLang
	): Promise<string> {
		console.log('azure_sim_standard', { source, target });
		await delay(500);
		return TranslationService.translate(text, source, target);
	},
};
