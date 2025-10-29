import { NativeModulesProxy } from 'expo-modules-core';
import { TranslationCache } from './TranslationCache';

export type TranslationModule = {
	translateAsync: (text: string, source: string, target: string) => Promise<string>;
	downloadLanguagePackAsync: (source: string, target: string) => Promise<void>;
	isLanguagePackDownloadedAsync: (source: string, target: string) => Promise<boolean>;
	deleteLanguagePackAsync: (source: string, target: string) => Promise<void>;
	getDownloadedLanguagePacksAsync: () => Promise<string[]>;
	getAvailableLanguagesAsync: () => Promise<string[]>;
	isAvailable: () => boolean;
};

const nativeModule = NativeModulesProxy.ExpoTranslationModule as TranslationModule | undefined;

const cache = new TranslationCache();

const keyFor = (text: string, source: string, target: string) => `${source}::${target}::${text}`;

const ensureModule = () => {
	if (!nativeModule) {
		throw new Error('translation_module_missing');
	}
	return nativeModule;
};

export const TranslationService = {
	isTranslationAvailable(): boolean {
		if (!nativeModule) {
			return false;
		}
		try {
			return nativeModule.isAvailable();
		} catch (error) {
			return false;
		}
	},
	async translate(text: string, source: string, target: string): Promise<string> {
		if (!text.trim()) {
			return text;
		}
		const cached = cache.get(keyFor(text, source, target));
		if (cached) {
			return cached;
		}
		const mod = ensureModule();
		const res = await mod.translateAsync(text, source, target);
		cache.set(keyFor(text, source, target), res);
		return res;
	},
	async downloadLanguagePack(source: string, target: string): Promise<void> {
		const mod = ensureModule();
		await mod.downloadLanguagePackAsync(source, target);
	},
	async isLanguagePackDownloaded(source: string, target: string): Promise<boolean> {
		const mod = ensureModule();
		return mod.isLanguagePackDownloadedAsync(source, target);
	},
	async deleteLanguagePack(source: string, target: string): Promise<void> {
		const mod = ensureModule();
		await mod.deleteLanguagePackAsync(source, target);
		cache.clear();
	},
	async getDownloadedLanguages(): Promise<string[]> {
		const mod = ensureModule();
		return mod.getDownloadedLanguagePacksAsync();
	},
	async getAvailableLanguages(): Promise<string[]> {
		const mod = ensureModule();
		return mod.getAvailableLanguagesAsync();
	},
	getCachedTranslation(text: string, source: string, target: string): string | null {
		return cache.get(keyFor(text, source, target));
	},
	cacheTranslation(text: string, translation: string, source: string, target: string): void {
		cache.set(keyFor(text, source, target), translation);
	},
};
