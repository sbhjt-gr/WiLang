import * as FileSystem from 'expo-file-system';

import {
	REPLICATE_API_TOKEN,
	REPLICATE_MODEL_PATH,
	REPLICATE_MODEL_VERSION,
	REPLICATE_POLL_INTERVAL_MS,
	REPLICATE_PREDICTION_TIMEOUT_MS,
} from '@env';

const API_BASE_URL = 'https://api.replicate.com/v1';
const DEFAULT_MODEL_PATH = 'models/cjwbw/seamless_communication';
const DEFAULT_POLL_INTERVAL = 2_000;
const DEFAULT_PREDICTION_TIMEOUT = 90_000;
const DEFAULT_VERSION_ID = '668a4fec05a887143e5fe8d45df25ec4c794dd43169b9a11562309b2d45873b0';

const TASK_S2S = 'S2ST (Speech to Speech translation)';
const TASK_S2T = 'S2TT (Speech to Text translation)';

const LANGUAGE_NAME_MAP: Record<string, string> = {
	en: 'English',
	es: 'Spanish',
	fr: 'French',
	de: 'German',
	pt: 'Portuguese',
	hi: 'Hindi',
	ja: 'Japanese',
	ko: 'Korean',
	bn: 'Bengali',
	sv: 'Swedish',
};

export type ReplicatePredictionStatus =
	| 'starting'
	| 'processing'
	| 'succeeded'
	| 'failed'
	| 'canceled'
	| 'queued';

export type ReplicatePrediction<TOutput = any> = {
	id: string;
	status: ReplicatePredictionStatus;
	output: TOutput;
	error?: string | null;
	logs?: string | null;
	metrics?: Record<string, number>;
};

export type SpeechTranslationRequest = {
	fileUri: string;
	targetLanguage?: string;
	sourceLanguage?: string;
	mode?: 'speech_to_speech' | 'speech_to_text';
	maxInputAudioLength?: number;
	additionalInput?: Record<string, unknown>;
};

export type SpeechTranslationResult = {
	predictionId: string;
	status: ReplicatePredictionStatus;
	translatedText: string | null;
	targetLanguage: string | null;
	audioUrl: string | null;
	raw: ReplicatePrediction;
};

const sleep = (duration: number) => new Promise(resolve => setTimeout(resolve, duration));

const coerceNumber = (value: string | undefined, fallback: number): number => {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export class ReplicateTranslationService {
	private static get token() {
		return REPLICATE_API_TOKEN?.trim();
	}

	static isConfigured(): boolean {
		return Boolean(this.token);
	}

	private static get modelPath(): string {
		return REPLICATE_MODEL_PATH?.trim() || DEFAULT_MODEL_PATH;
	}

	private static get pollInterval(): number {
		return coerceNumber(REPLICATE_POLL_INTERVAL_MS, DEFAULT_POLL_INTERVAL);
	}

	private static get predictionTimeout(): number {
		return coerceNumber(REPLICATE_PREDICTION_TIMEOUT_MS, DEFAULT_PREDICTION_TIMEOUT);
	}

	private static get headers() {
		const token = this.token;
		if (!token) {
			throw new Error('REPLICATE_API_TOKEN is not configured.');
		}
		return {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		};
	}

	private static async fileToDataUri(fileUri: string): Promise<string> {
		const info = await FileSystem.getInfoAsync(fileUri);
		if (!info.exists) {
			throw new Error('Recording file no longer exists.');
		}
		const base64 = await FileSystem.readAsStringAsync(fileUri, {
			encoding: FileSystem.EncodingType.Base64,
		});
		const extension = (fileUri.split('.').pop() || '').toLowerCase();
		const mime = extension === 'wav' ? 'audio/wav' : extension === 'mp3' ? 'audio/mpeg' : 'audio/m4a';
		return `data:${mime};base64,${base64}`;
	}

	private static buildInput(dataUri: string, request: SpeechTranslationRequest) {
		const isTextMode = request.mode === 'speech_to_text';
		const languageKey = (request.targetLanguage || 'en').toLowerCase();
		const languageName = LANGUAGE_NAME_MAP[languageKey] || 'English';
		const taskName = isTextMode ? TASK_S2T : TASK_S2S;
		const input: Record<string, unknown> = {
			task_name: taskName,
			input_audio: dataUri,
			max_input_audio_length: request.maxInputAudioLength ?? 15,
			...request.additionalInput,
		};

		if (isTextMode) {
			input.target_language_text_only = languageName;
		} else {
			input.target_language_with_speech = languageName;
		}

		return input;
	}

	private static get versionPath(): string {
		const trimmed = REPLICATE_MODEL_VERSION?.trim();
		return trimmed || DEFAULT_VERSION_ID;
	}

	private static get predictionEndpoint(): string {
		const version = this.versionPath;
		return `${API_BASE_URL}/${this.modelPath}/versions/${version}/predictions`;
	}

	private static async createPrediction(body: Record<string, unknown>) {
		const response = await fetch(this.predictionEndpoint, {
			method: 'POST',
			headers: this.headers,
			body: JSON.stringify({ input: body }),
		});

		const json = await response.json();
		if (!response.ok) {
			const detail = (json && (json.detail || json.error)) || 'Unable to create prediction.';
			throw new Error(detail);
		}

		return json as ReplicatePrediction;
	}

	private static async fetchPrediction(predictionId: string) {
		const response = await fetch(`${API_BASE_URL}/predictions/${predictionId}`, {
			headers: this.headers,
		});
		const json = await response.json();
		if (!response.ok) {
			throw new Error(json?.detail || 'Unable to fetch prediction.');
		}
		return json as ReplicatePrediction;
	}

	private static async waitForPrediction(predictionId: string) {
		const startedAt = Date.now();

		while (true) {
			const prediction = await this.fetchPrediction(predictionId);
			if (prediction.status === 'succeeded' || prediction.status === 'failed' || prediction.status === 'canceled') {
				return prediction;
			}

			if (Date.now() - startedAt > this.predictionTimeout) {
				throw new Error('Timed out waiting for SeamlessM4T prediction.');
			}

			await sleep(this.pollInterval);
		}
	}

	private static parsePrediction(prediction: ReplicatePrediction): SpeechTranslationResult {
		const output = (prediction.output ?? {}) as Record<string, unknown>;
		const translatedText = typeof output.text_output === 'string' ? (output.text_output as string) : null;
		const audioUrl = typeof output.audio_output === 'string' ? (output.audio_output as string) : null;
		return {
			predictionId: prediction.id,
			status: prediction.status,
			translatedText,
			targetLanguage: (output.target_language as string) || null,
			audioUrl,
			raw: prediction,
		};
	}

	static async translateSpeech(
		request: SpeechTranslationRequest,
	): Promise<SpeechTranslationResult> {
		if (!this.isConfigured()) {
			throw new Error('Replicate API token is not configured.');
		}

		const dataUri = await this.fileToDataUri(request.fileUri);
		const input = this.buildInput(dataUri, request);
		const prediction = await this.createPrediction(input);
		const finalPrediction = await this.waitForPrediction(prediction.id);

		if (finalPrediction.status !== 'succeeded') {
			throw new Error(finalPrediction.error || 'SeamlessM4T prediction failed.');
		}

		return this.parsePrediction(finalPrediction);
	}
}

export default ReplicateTranslationService;
