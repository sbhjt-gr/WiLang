export type AzureStatus = 'idle' | 'connecting' | 'translating' | 'error';

export type AzureConfig = {
	key: string;
	region: string;
	enabled: boolean;
};

export type AzureTranslationResult = {
	original: string;
	translated: string;
	timestamp: number;
};

export type AzureMode = 'realtime' | 'standard';
