/**
 * Palabra Translation Service for React Native
 *
 * This service handles real-time speech-to-speech translation using Palabra AI.
 * It manages:
 * - Session lifecycle (create/delete)
 * - Audio streaming via LiveKit WebRTC
 * - Translation events and callbacks
 */

import { EventEmitter } from 'events';
import { ConnectionState } from 'livekit-client';
import { PalabraApiClient } from './PalabraApiClient';
import { PalabraLiveKitTransport, RemoteTrackInfo } from './PalabraLiveKitTransport';
import {
  PalabraAuth,
  SourceLangCode,
  TargetLangCode,
  SessionResponse,
  TranslationStatus,
  ConnectionState as PalabraConnectionState,
  PalabraEventTypes,
  TranscriptionData,
  TranslationData,
  PipelineConfig,
} from './types';

const DEFAULT_API_BASE_URL = 'https://api.palabra.ai';

export interface PalabraTranslationServiceConfig {
  auth: PalabraAuth;
  sourceLanguage: SourceLangCode;
  targetLanguage: TargetLangCode;
  apiBaseUrl?: string;
  intent?: string;
  onTranscription?: (data: TranscriptionData) => void;
  onTranslation?: (data: TranslationData) => void;
  onConnectionStateChange?: (state: PalabraConnectionState) => void;
  onRemoteTrack?: (tracks: RemoteTrackInfo[]) => void;
  onError?: (error: Error) => void;
}

export class PalabraTranslationService extends EventEmitter {
  private apiClient: PalabraApiClient;
  private transport: PalabraLiveKitTransport | null = null;
  private session: SessionResponse | null = null;
  private sourceLanguage: SourceLangCode;
  private targetLanguage: TargetLangCode;
  private translationStatus: TranslationStatus = 'init';
  private connectionState: PalabraConnectionState = 'disconnected';

  // Callbacks
  private onTranscription?: (data: TranscriptionData) => void;
  private onTranslation?: (data: TranslationData) => void;
  private onConnectionStateChange?: (state: PalabraConnectionState) => void;
  private onRemoteTrack?: (tracks: RemoteTrackInfo[]) => void;
  private onError?: (error: Error) => void;

  constructor(config: PalabraTranslationServiceConfig) {
    super();

    this.apiClient = new PalabraApiClient(
      config.auth,
      config.apiBaseUrl || DEFAULT_API_BASE_URL,
      config.intent
    );

    this.sourceLanguage = config.sourceLanguage;
    this.targetLanguage = config.targetLanguage;
    this.onTranscription = config.onTranscription;
    this.onTranslation = config.onTranslation;
    this.onConnectionStateChange = config.onConnectionStateChange;
    this.onRemoteTrack = config.onRemoteTrack;
    this.onError = config.onError;
  }

  getStatus(): TranslationStatus {
    return this.translationStatus;
  }

  getConnectionState(): PalabraConnectionState {
    return this.connectionState;
  }

  getSession(): SessionResponse | null {
    return this.session;
  }

  setSourceLanguage(lang: SourceLangCode): void {
    this.sourceLanguage = lang;
    console.log('[PalabraService] Source language:', lang);
  }

  setTargetLanguage(lang: TargetLangCode): void {
    this.targetLanguage = lang;
    console.log('[PalabraService] Target language:', lang);
  }

  private getDetectableLanguages(): SourceLangCode[] {
    if (this.sourceLanguage === 'auto') {
      return [
        'en', 'uk', 'it', 'es', 'de', 'pt', 'tr', 'ar', 'ru', 'pl',
        'fr', 'id', 'zh', 'nl', 'ja', 'ko', 'fi', 'hu', 'el', 'cs',
        'da', 'he', 'hi',
      ];
    }
    return [this.sourceLanguage];
  }

  private createPipelineConfig(): PipelineConfig {
    return {
      input_stream: {
        content_type: 'audio',
        source: { type: 'webrtc' },
        target: { type: 'webrtc' },
      },
      output_stream: {
        content_type: 'audio',
        source: { type: 'webrtc' },
        target: { type: 'webrtc' },
      },
      pipeline: {
        preprocessing: {
          enable_vad: true,
          vad_threshold: 0.5,
          vad_left_padding: 0.3,
          vad_right_padding: 0.3,
          pre_vad_denoise: true,
          pre_vad_dsp: true,
          record_tracks: [],
        },
        transcription: {
          source_language: this.sourceLanguage,
          detectable_languages: this.getDetectableLanguages(),
          segment_confirmation_silence_threshold: 0.5,
          sentence_splitter: { enabled: true },
          verification: {
            auto_transcription_correction: false,
            transcription_correction_style: null,
          },
        },
        translations: [
          {
            target_language: this.targetLanguage,
            translate_partial_transcriptions: true,
            speech_generation: {
              voice_cloning: false,
              voice_id: '',
              voice_timbre_detection: {
                enabled: false,
                high_timbre_voices: ['alloy'],
                low_timbre_voices: ['echo'],
              },
            },
          },
        ],
        allowed_message_types: [
          'translated_transcription',
          'partial_translated_transcription',
          'partial_transcription',
          'validated_transcription',
        ],
      },
    };
  }

  /**
   * Start translation with audio track from microphone
   */
  async startTranslation(audioTrack?: MediaStreamTrack): Promise<boolean> {
    try {
      console.log('[PalabraService] Starting translation...');
      this.setConnectionState('connecting');

      // Create session via API
      const response = await this.apiClient.createStreamingSession();

      if (!response.data) {
        throw new Error('Failed to create session - no data returned');
      }

      this.session = response.data;
      console.log('[PalabraService] Session created:', {
        id: this.session.id,
        webrtcUrl: this.session.webrtc_url,
        roomName: this.session.webrtc_room_name,
      });

      // If audio track provided, connect with LiveKit
      if (audioTrack) {
        await this.connectWithAudio(audioTrack);
      } else {
        // API-only mode (for testing session creation)
        this.setConnectionState('connected');
        this.translationStatus = 'ongoing';
        this.emit(PalabraEventTypes.START_TRANSLATION);
      }

      console.log('[PalabraService] Translation started');
      return true;
    } catch (error) {
      console.error('[PalabraService] Failed to start:', error);
      this.setConnectionState('disconnected');
      this.translationStatus = 'stopped';
      this.handleError(error as Error);
      return false;
    }
  }

  /**
   * Connect to LiveKit room with audio track
   */
  private async connectWithAudio(audioTrack: MediaStreamTrack): Promise<void> {
    if (!this.session) {
      throw new Error('No session available');
    }

    // Create LiveKit transport
    this.transport = new PalabraLiveKitTransport({
      streamUrl: this.session.webrtc_url,
      accessToken: this.session.publisher,
      sourceLanguage: this.sourceLanguage,
      targetLanguage: this.targetLanguage,
      onTranscription: (data) => {
        this.onTranscription?.(data);
        this.emit(PalabraEventTypes.TRANSCRIPTION_RECEIVED, data);
      },
      onTranslation: (data) => {
        this.onTranslation?.(data);
        this.emit(PalabraEventTypes.TRANSLATION_RECEIVED, data);
      },
      onRemoteTrack: (tracks) => {
        this.onRemoteTrack?.(tracks);
        this.emit(PalabraEventTypes.REMOTE_TRACKS_UPDATE, tracks);
      },
      onConnectionStateChange: (state) => {
        this.handleLiveKitConnectionState(state);
      },
      onError: (error) => {
        this.handleError(error);
      },
    });

    // Connect to LiveKit room
    await this.transport.connect(audioTrack);

    // Send pipeline config
    const config = this.createPipelineConfig();
    await this.transport.setTask(config);

    this.translationStatus = 'ongoing';
    this.emit(PalabraEventTypes.START_TRANSLATION);
  }

  /**
   * Stop translation and cleanup
   */
  async stopTranslation(): Promise<void> {
    try {
      console.log('[PalabraService] Stopping translation...');

      // Disconnect LiveKit
      if (this.transport) {
        await this.transport.disconnect();
        this.transport = null;
      }

      // Delete session
      if (this.session) {
        await this.apiClient.deleteStreamingSession(this.session.id);
        this.session = null;
      }

      this.setConnectionState('disconnected');
      this.translationStatus = 'stopped';
      this.emit(PalabraEventTypes.STOP_TRANSLATION);

      console.log('[PalabraService] Translation stopped');
    } catch (error) {
      console.error('[PalabraService] Stop error:', error);
      this.handleError(error as Error);
    }
  }

  /**
   * Pause translation (keeps session alive)
   */
  async pauseTranslation(): Promise<void> {
    if (this.translationStatus !== 'ongoing') {
      return;
    }

    if (this.transport) {
      await this.transport.pauseTask();
    }

    this.translationStatus = 'paused';
    console.log('[PalabraService] Translation paused');
  }

  /**
   * Resume paused translation
   */
  async resumeTranslation(): Promise<void> {
    if (this.translationStatus !== 'paused') {
      return;
    }

    if (this.transport) {
      const config = this.createPipelineConfig();
      await this.transport.setTask(config);
    }

    this.translationStatus = 'ongoing';
    console.log('[PalabraService] Translation resumed');
  }

  /**
   * Cleanup all resources
   */
  async cleanup(): Promise<void> {
    await this.stopTranslation();
    this.removeAllListeners();
  }

  /**
   * Check if translation is active
   */
  isActive(): boolean {
    return this.translationStatus === 'ongoing' || this.translationStatus === 'paused';
  }

  /**
   * Get remote audio tracks (translated speech)
   */
  getRemoteTracks(): RemoteTrackInfo[] {
    return this.transport?.getRemoteTracks() || [];
  }

  // Private helpers

  private handleLiveKitConnectionState(state: ConnectionState): void {
    let palabraState: PalabraConnectionState;

    switch (state) {
      case ConnectionState.Connected:
        palabraState = 'connected';
        break;
      case ConnectionState.Connecting:
        palabraState = 'connecting';
        break;
      case ConnectionState.Reconnecting:
        palabraState = 'reconnecting';
        break;
      default:
        palabraState = 'disconnected';
    }

    this.setConnectionState(palabraState);
  }

  private setConnectionState(state: PalabraConnectionState): void {
    this.connectionState = state;
    this.emit(PalabraEventTypes.CONNECTION_STATE_CHANGED, state);
    this.onConnectionStateChange?.(state);
  }

  private handleError(error: Error): void {
    this.emit(PalabraEventTypes.ERROR_RECEIVED, {
      code: 'PALABRA_ERROR',
      message: error.message,
    });
    this.onError?.(error);
  }
}

/**
 * Factory function to create PalabraTranslationService with env credentials
 */
export function createPalabraService(
  sourceLanguage: SourceLangCode,
  targetLanguage: TargetLangCode,
  callbacks?: {
    onTranscription?: (data: TranscriptionData) => void;
    onTranslation?: (data: TranslationData) => void;
    onConnectionStateChange?: (state: PalabraConnectionState) => void;
    onRemoteTrack?: (tracks: RemoteTrackInfo[]) => void;
    onError?: (error: Error) => void;
  }
): PalabraTranslationService {
  const clientId = process.env.PALABRA_CLIENT_ID;
  const clientSecret = process.env.PALABRA_CLIENT_SECRET;
  const apiBaseUrl = process.env.PALABRA_API_BASE_URL || DEFAULT_API_BASE_URL;

  if (!clientId || !clientSecret) {
    throw new Error(
      'PALABRA_CLIENT_ID and PALABRA_CLIENT_SECRET environment variables are required'
    );
  }

  return new PalabraTranslationService({
    auth: { clientId, clientSecret },
    sourceLanguage,
    targetLanguage,
    apiBaseUrl,
    ...callbacks,
  });
}
