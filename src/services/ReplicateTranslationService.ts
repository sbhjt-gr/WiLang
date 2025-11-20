import * as FileSystem from 'expo-file-system';
import type { FileSystemUploadOptions } from 'expo-file-system';

import {
	REPLICATE_API_TOKEN,
	REPLICATE_MODEL_PATH,
	REPLICATE_POLL_INTERVAL_MS,
	REPLICATE_PREDICTION_TIMEOUT_MS,
} from '@env';

const API_BASE_URL = 'https://api.replicate.com/v1';
const DEFAULT_MODEL_PATH = 'models/meta/seamless-m4t';
const DEFAULT_POLL_INTERVAL = 2_000;
const DEFAULT_PREDICTION_TIMEOUT = 90_000;

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
	voice?: string;
	temperature?: number;
	beamSize?: number;
	additionalInput?: Record<string, unknown>;
};

export type SpeechTranslationResult = {
	predictionId: string;
	status: ReplicatePredictionStatus;
	translatedText: string | null;
	detectedLanguage: string | null;
	targetLanguage: string | null;
	audioUrl: string | null;
	raw: ReplicatePrediction;
};

type ReplicateFileResponse = {
	urls?: {
		serve?: string;
		get?: string;
		download?: string;
	};
	paths?: {
		serve?: string;
		get?: string;
	};
	serve_url?: string;
	get_url?: string;
};

const sleep = (duration: number) => new Promise(resolve => setTimeout(resolve, duration));

const resolveServeUrl = (payload: ReplicateFileResponse): string | null => {
	return (
		payload?.urls?.serve ||
		payload?.urls?.get ||
		payload?.urls?.download ||
		payload?.paths?.serve ||
		payload?.paths?.get ||
		payload?.serve_url ||
		payload?.get_url ||
		null
	);
};

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

	private static async uploadAudioAsync(fileUri: string): Promise<string> {
		if (!fileUri) {
			throw new Error('Missing recording URI.');
		}

		if (/^https?:/i.test(fileUri)) {
			return fileUri;
		}

		const info = await FileSystem.getInfoAsync(fileUri);
		if (!info.exists) {
			throw new Error('Recording file no longer exists.');
		}

		const uploadOptions: FileSystemUploadOptions = {
			headers: {
				Authorization: `Bearer ${this.token}`,
				'Content-Type': 'application/octet-stream',
			},
			httpMethod: 'POST',
			uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
		};

		const response = await FileSystem.uploadAsync(
			`${API_BASE_URL}/files`,
			fileUri,
			uploadOptions,
		);

		if (response.status < 200 || response.status >= 300) {
			throw new Error(`Failed to upload audio (${response.status}).`);
		}

		let json: ReplicateFileResponse;
		try {
			json = JSON.parse(response.body);
		} catch (error) {
			throw new Error('Invalid upload response.');
		}

		const remoteUrl = resolveServeUrl(json);
		if (!remoteUrl) {
			throw new Error('Upload succeeded but no audio URL was returned.');
		}

		return remoteUrl;
	}

	private static buildInput(audioUrl: string, request: SpeechTranslationRequest) {
		const taskName = request.mode === 'speech_to_text' ? 'Speech-to-Text' : 'Speech-to-Speech';
		const input: Record<string, unknown> = {
			task_name: taskName,
			speech: audioUrl,
			target_language: request.targetLanguage ?? 'eng',
			source_language: request.sourceLanguage ?? 'auto',
			temperature: request.temperature ?? 1,
			beam_size: request.beamSize ?? 5,
			...request.additionalInput,
		};

		if (request.mode !== 'speech_to_text') {
			input.vocoder = request.voice ?? 'auto';
		}

		return input;
	}

	private static async createPrediction(body: Record<string, unknown>) {
		const response = await fetch(`${API_BASE_URL}/${this.modelPath}/predictions`, {
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
		const rawOutput = prediction.output;
		const output = Array.isArray(rawOutput) ? rawOutput[0] : rawOutput;

		let translatedText: string | null = null;
		let detectedLanguage: string | null = null;
		let targetLanguage: string | null = null;
		let audioUrl: string | null = null;

		if (typeof output === 'string') {
			if (/^https?:/i.test(output)) {
				audioUrl = output;
			} else {
				translatedText = output;
			}
		} else if (output && typeof output === 'object') {
			const candidateText =
				(output as any).translated_text ||
				(output as any).translation ||
				(output as any).text ||
				(Array.isArray((output as any).texts) ? (output as any).texts[0] : null);
			translatedText = candidateText ?? null;
			detectedLanguage =
				(output as any).detected_language ||
				(output as any).source_language ||
				null;
			targetLanguage =
				(output as any).target_language ||
				(output as any).language ||
				null;
			audioUrl =
				(output as any).audio ||
				(output as any).audio_out ||
				(output as any).audio_url ||
				(output as any).speech ||
				null;
		}

		return {
			predictionId: prediction.id,
			status: prediction.status,
			translatedText,
			detectedLanguage,
			targetLanguage,
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

		const remoteAudioUrl = await this.uploadAudioAsync(request.fileUri);
		const input = this.buildInput(remoteAudioUrl, request);
		const prediction = await this.createPrediction(input);
		const finalPrediction = await this.waitForPrediction(prediction.id);

		if (finalPrediction.status !== 'succeeded') {
			throw new Error(finalPrediction.error || 'SeamlessM4T prediction failed.');
		}

		return this.parsePrediction(finalPrediction);
	}
}

export default ReplicateTranslationService;
