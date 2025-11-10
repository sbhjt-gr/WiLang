import { AZURE_SPEECH_KEY, AZURE_SPEECH_REGION, AZURE_SPEECH_ENABLED } from '@env';
import type { AzureConfig } from '../types/azure';

const validateConfig = (): boolean => {
	const hasKey = !!AZURE_SPEECH_KEY && AZURE_SPEECH_KEY.length > 0;
	const hasRegion = !!AZURE_SPEECH_REGION && AZURE_SPEECH_REGION.length > 0;
	return hasKey && hasRegion;
};

export const AzureConfigService = {
	getConfig(): AzureConfig {
		return {
			key: AZURE_SPEECH_KEY || '',
			region: AZURE_SPEECH_REGION || 'eastus',
			enabled: AZURE_SPEECH_ENABLED === 'true',
		};
	},

	isAvailable(): boolean {
		const config = this.getConfig();
		return config.enabled && validateConfig();
	},

	getEndpoint(): string {
		const config = this.getConfig();
		return `wss://${config.region}.stt.speech.microsoft.com/speech/universal/v2`;
	},
};
