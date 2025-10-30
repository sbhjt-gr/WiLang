import { NativeModulesProxy } from 'expo-modules-core';
import { NativeModules } from 'react-native';
import { TranslationCache } from './TranslationCache';

export type TranslationModule = {
	translateAsync: (text: string, source: string, target: string) => Promise<string>;
	downloadLanguagePackAsync: (source: string, target: string) => Promise<void>;
	isLanguagePackDownloadedAsync: (source: string, target: string) => Promise<boolean>;
	deleteLanguagePackAsync: (source: string, target: string) => Promise<void>;
	getDownloadedLanguagePacksAsync: () => Promise<string[]>;
	getAvailableLanguagesAsync: () => Promise<string[]>;
	isAvailable?: (() => boolean) | boolean;
	setEngineAsync?: (engine: string) => Promise<string | void>;
	translateWithUIAsync?: (text: string) => Promise<string>;
	appleAvailable?: boolean;
	appleUIAvailable?: boolean;
	engine?: string;
};

export type TranslationEngine = 'mlkit' | 'apple';

const rawModule = NativeModulesProxy.ExpoTranslationModule ?? (NativeModules as any).ExpoTranslationModule;
const nativeModule = rawModule as TranslationModule | undefined;

console.log('translation_module_init', {
	hasRawModule: !!rawModule,
	hasNativeModule: !!nativeModule,
	rawModuleType: typeof rawModule,
	nativeModuleType: typeof nativeModule,
	rawModuleKeys: rawModule ? Object.keys(rawModule) : [],
});

const cache = new TranslationCache();

const normalizeEngine = (value: unknown): TranslationEngine => {
	return value === 'apple' ? 'apple' : 'mlkit';
};

const appleAvailable = nativeModule ? Boolean((nativeModule as any).appleAvailable) : false;
const appleUIAvailable = nativeModule ? Boolean((nativeModule as any).appleUIAvailable) : false;

let currentEngine: TranslationEngine = normalizeEngine(nativeModule ? (nativeModule as any).engine : undefined);

if (currentEngine === 'apple' && !appleAvailable) {
	currentEngine = 'mlkit';
}

let engineSynced = false;

const keyFor = (text: string, source: string, target: string) => `${source}::${target}::${text}`;

const ensureModule = () => {
	console.log('ensureModule_called', { hasModule: !!nativeModule });
	if (!nativeModule) {
		console.error('translation_module_missing');
		throw new Error('translation_module_missing');
	}
	return nativeModule;
};

const syncEngine = async (mod: TranslationModule, desired?: TranslationEngine): Promise<TranslationEngine> => {
	const target = desired ?? currentEngine;
	const previous = currentEngine;
	if (engineSynced && target === currentEngine) {
		if (currentEngine === 'apple' && !appleAvailable) {
			const error: any = new Error('apple_unavailable');
			error.code = 'apple_unavailable';
			throw error;
		}
		return currentEngine;
	}
	if (target === 'apple' && !appleAvailable) {
		const error: any = new Error('apple_unavailable');
		error.code = 'apple_unavailable';
		throw error;
	}
	if (typeof mod.setEngineAsync === 'function') {
		try {
			const result = await mod.setEngineAsync(target);
			const resolved = normalizeEngine(result ?? target);
			currentEngine = resolved;
			engineSynced = true;
			return currentEngine;
		} catch (error) {
			console.error('engine_sync_error', error);
			currentEngine = previous;
			engineSynced = false;
			throw error;
		}
	}
	currentEngine = target;
	engineSynced = true;
	return currentEngine;
};

export const TranslationService = {
	isTranslationAvailable(): boolean {
		console.log('isTranslationAvailable_called', { hasModule: !!nativeModule });
		if (!nativeModule) {
			console.log('translation_unavailable_no_module');
			return false;
		}
		if (currentEngine === 'apple' && !appleAvailable) {
			return false;
		}
		try {
			const value = nativeModule.isAvailable;
			console.log('isAvailable_value', { value, type: typeof value });
			if (typeof value === 'function') {
				const result = Boolean(value());
				console.log('isAvailable_function_result', result);
				return result;
			}
			if (typeof value === 'boolean') {
				console.log('isAvailable_boolean_result', value);
				return value;
			}
			const result = Boolean(value);
			console.log('isAvailable_coerced_result', result);
			return result;
		} catch (error) {
			console.error('isTranslationAvailable_error', error);
			return false;
		}
	},
	async translate(text: string, source: string, target: string): Promise<string> {
		console.log('translate_called', { text, source, target, textLength: text.length });
		if (!text.trim()) {
			console.log('translate_empty_text');
			return text;
		}
		const cacheKey = keyFor(text, source, target);
		const cached = cache.get(cacheKey);
		if (cached) {
			console.log('translate_cache_hit', { cacheKey, cached });
			return cached;
		}
		console.log('translate_cache_miss', { cacheKey });
		const mod = ensureModule();
		await syncEngine(mod);
		console.log('translate_calling_native', { text, source, target });
		try {
			const res = await mod.translateAsync(text, source, target);
			console.log('translate_success', { result: res, resultLength: res?.length });
			cache.set(cacheKey, res);
			return res;
		} catch (error) {
			console.error('translate_native_error', error);
			console.log('translate_error_details', {
				error,
				message: error instanceof Error ? error.message : 'unknown',
				stack: error instanceof Error ? error.stack : undefined,
			});
			throw error;
		}
	},
	async downloadLanguagePack(source: string, target: string): Promise<void> {
		console.log('downloadLanguagePack_called', { source, target });
		const mod = ensureModule();
		await syncEngine(mod);
		try {
			await mod.downloadLanguagePackAsync(source, target);
			console.log('downloadLanguagePack_success', { source, target });
		} catch (error) {
			console.error('downloadLanguagePack_error', error);
			throw error;
		}
	},
	async isLanguagePackDownloaded(source: string, target: string): Promise<boolean> {
		console.log('isLanguagePackDownloaded_called', { source, target });
		const mod = ensureModule();
		await syncEngine(mod);
		try {
			const result = await mod.isLanguagePackDownloadedAsync(source, target);
			console.log('isLanguagePackDownloaded_result', { source, target, result });
			return result;
		} catch (error) {
			console.error('isLanguagePackDownloaded_error', error);
			throw error;
		}
	},
	async deleteLanguagePack(source: string, target: string): Promise<void> {
		const mod = ensureModule();
		await syncEngine(mod);
		await mod.deleteLanguagePackAsync(source, target);
		cache.clear();
	},
	async deleteLanguage(language: string): Promise<void> {
		const trimmed = language.trim();
		if (!trimmed) {
			return;
		}
		const mod = ensureModule();
		await syncEngine(mod);
		await mod.deleteLanguagePackAsync(trimmed, trimmed);
		cache.clear();
	},
	async getDownloadedLanguages(): Promise<string[]> {
		const mod = ensureModule();
		await syncEngine(mod);
		return mod.getDownloadedLanguagePacksAsync();
	},
	async getAvailableLanguages(): Promise<string[]> {
		const mod = ensureModule();
		await syncEngine(mod);
		return mod.getAvailableLanguagesAsync();
	},
	getCachedTranslation(text: string, source: string, target: string): string | null {
		return cache.get(keyFor(text, source, target));
	},
	cacheTranslation(text: string, translation: string, source: string, target: string): void {
		cache.set(keyFor(text, source, target), translation);
	},
	getEngine(): TranslationEngine {
		return currentEngine;
	},
	async setEngine(engine: TranslationEngine): Promise<TranslationEngine> {
		const mod = ensureModule();
		engineSynced = false;
		return syncEngine(mod, engine);
	},
	isAppleAvailable(): boolean {
		return appleAvailable;
	},
	isAppleUIAvailable(): boolean {
		return appleUIAvailable;
	},
	async translateWithUI(text: string): Promise<string> {
		if (!appleUIAvailable) {
			throw new Error('apple_ui_unavailable');
		}
		const mod = ensureModule();
		if (typeof mod.translateWithUIAsync !== 'function') {
			throw new Error('apple_ui_unavailable');
		}
		return mod.translateWithUIAsync(text);
	},
};
