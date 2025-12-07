/**
 * Palabra AI Translation Service Types
 * Adapted from @palabra-ai/translator SDK for React Native
 */

// ============================================================================
// Authentication Types
// ============================================================================

export interface ClientCredentialsAuth {
  clientId: string;
  clientSecret: string;
}

export interface UserTokenAuth {
  userToken: string;
}

export type PalabraAuth = ClientCredentialsAuth | UserTokenAuth;

// ============================================================================
// Language Types
// ============================================================================

export type SourceLangCode =
  | 'auto'
  | 'ar'
  | 'zh'
  | 'cs'
  | 'da'
  | 'nl'
  | 'en'
  | 'fi'
  | 'fr'
  | 'de'
  | 'el'
  | 'he'
  | 'hi'
  | 'hu'
  | 'id'
  | 'it'
  | 'ja'
  | 'ko'
  | 'ms'
  | 'no'
  | 'pl'
  | 'pt'
  | 'ro'
  | 'ru'
  | 'sk'
  | 'es'
  | 'sv'
  | 'th'
  | 'tr'
  | 'uk'
  | 'vi';

export type TargetLangCode =
  | 'ar-sa'
  | 'zh'
  | 'cs'
  | 'da'
  | 'nl'
  | 'en-us'
  | 'en-gb'
  | 'fi'
  | 'fr'
  | 'de'
  | 'el'
  | 'he'
  | 'hi'
  | 'hu'
  | 'id'
  | 'it'
  | 'ja'
  | 'ko'
  | 'ms'
  | 'no'
  | 'pl'
  | 'pt-br'
  | 'pt-pt'
  | 'ro'
  | 'ru'
  | 'sk'
  | 'es'
  | 'sv'
  | 'th'
  | 'tr'
  | 'uk'
  | 'vi';

export interface LanguageInfo {
  code: string;
  label: string;
  flag: string;
}

// ============================================================================
// API Types
// ============================================================================

export interface ApiResponse<T> {
  data?: T;
  ok: boolean;
  errors?: {
    detail: string;
    error_code: number;
    instance: string;
    status: number;
    title: string;
    type: string;
  }[];
}

export interface SessionResponse {
  id: string;
  publisher: string;
  subscriber: string[];
  webrtc_room_name: string;
  webrtc_url: string;
  ws_url: string;
}

export interface CreateSessionPayload {
  data: {
    publisher_count: number;
    subscriber_count: number;
    publisher_can_subscribe: boolean;
    intent?: string;
  };
}

export interface SessionListResponse {
  sessions:
    | {
        id: string;
        created_at: string;
        updated_at: string;
        expires_at: string;
      }[]
    | null;
}

// ============================================================================
// Pipeline Config Types
// ============================================================================

export interface StreamConfigBase {
  content_type: 'audio';
}

export interface StreamConfigWebRtc extends StreamConfigBase {
  source?: {
    type: 'webrtc';
  };
  target?: {
    type: 'webrtc';
  };
}

export type StreamConfig = StreamConfigWebRtc;

export interface PreprocessingConfig {
  enable_vad: boolean;
  vad_threshold: number;
  vad_left_padding: number;
  vad_right_padding: number;
  pre_vad_denoise: boolean;
  pre_vad_dsp: boolean;
  record_tracks: string[];
}

export interface SentenceSplitterConfig {
  enabled: boolean;
}

export interface VerificationConfig {
  auto_transcription_correction: boolean;
  transcription_correction_style: string | null;
}

export interface TranscriptionConfig {
  source_language: SourceLangCode;
  detectable_languages: SourceLangCode[];
  segment_confirmation_silence_threshold: number;
  sentence_splitter: SentenceSplitterConfig;
  verification: VerificationConfig;
}

export interface VoiceTimbreDetectionConfig {
  enabled: boolean;
  high_timbre_voices: string[];
  low_timbre_voices: string[];
}

export interface SpeechGenerationConfig {
  voice_cloning: boolean;
  voice_id: string;
  voice_timbre_detection: VoiceTimbreDetectionConfig;
}

export interface TranslationConfig {
  target_language: TargetLangCode;
  translate_partial_transcriptions: boolean;
  speech_generation: SpeechGenerationConfig;
}

export type AddTranslationArgs = Partial<Omit<TranslationConfig, 'target_language'>> &
  Pick<TranslationConfig, 'target_language'>;

export type AllowedMessageTypes =
  | string
  | 'translated_transcription'
  | 'partial_translated_transcription'
  | 'partial_transcription'
  | 'validated_transcription';

export interface PipelineConfig {
  input_stream: StreamConfig;
  output_stream: StreamConfig;
  pipeline: {
    preprocessing: PreprocessingConfig;
    transcription: TranscriptionConfig;
    translations: TranslationConfig[];
    allowed_message_types: AllowedMessageTypes[];
  };
}

// ============================================================================
// Event Types
// ============================================================================

export const PalabraEventTypes = {
  REMOTE_TRACKS_UPDATE: 'remoteTracksUpdate',
  ROOM_CONNECTED: 'roomConnected',
  ROOM_DISCONNECTED: 'roomDisconnected',
  CONNECTION_STATE_CHANGED: 'connectionStateChanged',
  DATA_RECEIVED: 'dataReceived',
  START_TRANSLATION: 'startTranslation',
  STOP_TRANSLATION: 'stopTranslation',
  TRANSCRIPTION_RECEIVED: 'transcriptionReceived',
  TRANSLATION_RECEIVED: 'translationReceived',
  PARTIAL_TRANSLATED_TRANSCRIPTION_RECEIVED: 'partialTranslatedTranscriptionReceived',
  PARTIAL_TRANSCRIPTION_RECEIVED: 'partialTranscriptionReceived',
  PIPELINE_TIMINGS_RECEIVED: 'pipelineTimingsReceived',
  ERROR_RECEIVED: 'errorReceived',
  ORIGINAL_TRACK_VOLUME_CHANGED: 'originalTrackVolumeChanged',
} as const;

export type PalabraEventType = (typeof PalabraEventTypes)[keyof typeof PalabraEventTypes];

export interface RemoteTrackInfo {
  trackId: string;
  language: string;
  participant: string;
}

export interface TranscriptionData {
  text: string;
  language: SourceLangCode;
  isFinal: boolean;
  timestamp?: number;
}

export interface TranslationData {
  text: string;
  sourceLanguage: SourceLangCode;
  targetLanguage: TargetLangCode;
  isFinal: boolean;
  timestamp?: number;
}

export interface DataReceivedEvent {
  messageType: AllowedMessageTypes;
  data?: unknown;
  participant?: string;
}

export interface PipelineTimingsData {
  transcriptionLatency?: number;
  translationLatency?: number;
  totalLatency?: number;
}

export interface ErrorData {
  code: string;
  message: string;
  details?: unknown;
}

// ============================================================================
// Client Config Types
// ============================================================================

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting';

export type TranslationStatus = 'init' | 'ongoing' | 'paused' | 'stopped';

export interface PalabraClientConfig {
  auth: PalabraAuth;
  translateFrom: SourceLangCode;
  translateTo: TargetLangCode;
  apiBaseUrl?: string;
  intent?: string;
}

// ============================================================================
// Language Data
// ============================================================================

export const sourceLanguages: LanguageInfo[] = [
  { code: 'auto', label: 'Auto Detect', flag: '🌐' },
  { code: 'ar', label: 'Arabic', flag: '🇸🇦' },
  { code: 'zh', label: 'Chinese', flag: '🇨🇳' },
  { code: 'cs', label: 'Czech', flag: '🇨🇿' },
  { code: 'da', label: 'Danish', flag: '🇩🇰' },
  { code: 'nl', label: 'Dutch', flag: '🇳🇱' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fi', label: 'Finnish', flag: '🇫🇮' },
  { code: 'fr', label: 'French', flag: '🇫🇷' },
  { code: 'de', label: 'German', flag: '🇩🇪' },
  { code: 'el', label: 'Greek', flag: '🇬🇷' },
  { code: 'he', label: 'Hebrew', flag: '🇮🇱' },
  { code: 'hi', label: 'Hindi', flag: '🇮🇳' },
  { code: 'hu', label: 'Hungarian', flag: '🇭🇺' },
  { code: 'id', label: 'Indonesian', flag: '🇮🇩' },
  { code: 'it', label: 'Italian', flag: '🇮🇹' },
  { code: 'ja', label: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', label: 'Korean', flag: '🇰🇷' },
  { code: 'ms', label: 'Malay', flag: '🇲🇾' },
  { code: 'no', label: 'Norwegian', flag: '🇳🇴' },
  { code: 'pl', label: 'Polish', flag: '🇵🇱' },
  { code: 'pt', label: 'Portuguese', flag: '🇵🇹' },
  { code: 'ro', label: 'Romanian', flag: '🇷🇴' },
  { code: 'ru', label: 'Russian', flag: '🇷🇺' },
  { code: 'sk', label: 'Slovak', flag: '🇸🇰' },
  { code: 'es', label: 'Spanish', flag: '🇪🇸' },
  { code: 'sv', label: 'Swedish', flag: '🇸🇪' },
  { code: 'th', label: 'Thai', flag: '🇹🇭' },
  { code: 'tr', label: 'Turkish', flag: '🇹🇷' },
  { code: 'uk', label: 'Ukrainian', flag: '🇺🇦' },
  { code: 'vi', label: 'Vietnamese', flag: '🇻🇳' },
];

export const targetLanguages: LanguageInfo[] = [
  { code: 'ar-sa', label: 'Arabic (Saudi)', flag: '🇸🇦' },
  { code: 'zh', label: 'Chinese', flag: '🇨🇳' },
  { code: 'cs', label: 'Czech', flag: '🇨🇿' },
  { code: 'da', label: 'Danish', flag: '🇩🇰' },
  { code: 'nl', label: 'Dutch', flag: '🇳🇱' },
  { code: 'en-us', label: 'English (US)', flag: '🇺🇸' },
  { code: 'en-gb', label: 'English (UK)', flag: '🇬🇧' },
  { code: 'fi', label: 'Finnish', flag: '🇫🇮' },
  { code: 'fr', label: 'French', flag: '🇫🇷' },
  { code: 'de', label: 'German', flag: '🇩🇪' },
  { code: 'el', label: 'Greek', flag: '🇬🇷' },
  { code: 'he', label: 'Hebrew', flag: '🇮🇱' },
  { code: 'hi', label: 'Hindi', flag: '🇮🇳' },
  { code: 'hu', label: 'Hungarian', flag: '🇭🇺' },
  { code: 'id', label: 'Indonesian', flag: '🇮🇩' },
  { code: 'it', label: 'Italian', flag: '🇮🇹' },
  { code: 'ja', label: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', label: 'Korean', flag: '🇰🇷' },
  { code: 'ms', label: 'Malay', flag: '🇲🇾' },
  { code: 'no', label: 'Norwegian', flag: '🇳🇴' },
  { code: 'pl', label: 'Polish', flag: '🇵🇱' },
  { code: 'pt-br', label: 'Portuguese (Brazil)', flag: '🇧🇷' },
  { code: 'pt-pt', label: 'Portuguese (Portugal)', flag: '🇵🇹' },
  { code: 'ro', label: 'Romanian', flag: '🇷🇴' },
  { code: 'ru', label: 'Russian', flag: '🇷🇺' },
  { code: 'sk', label: 'Slovak', flag: '🇸🇰' },
  { code: 'es', label: 'Spanish', flag: '🇪🇸' },
  { code: 'sv', label: 'Swedish', flag: '🇸🇪' },
  { code: 'th', label: 'Thai', flag: '🇹🇭' },
  { code: 'tr', label: 'Turkish', flag: '🇹🇷' },
  { code: 'uk', label: 'Ukrainian', flag: '🇺🇦' },
  { code: 'vi', label: 'Vietnamese', flag: '🇻🇳' },
];

// Helper functions
export function getSourceLanguageLabel(code: SourceLangCode): string {
  return sourceLanguages.find((l) => l.code === code)?.label || code;
}

export function getTargetLanguageLabel(code: TargetLangCode): string {
  return targetLanguages.find((l) => l.code === code)?.label || code;
}

export function getSourceLanguageFlag(code: SourceLangCode): string {
  return sourceLanguages.find((l) => l.code === code)?.flag || '🏳️';
}

export function getTargetLanguageFlag(code: TargetLangCode): string {
  return targetLanguages.find((l) => l.code === code)?.flag || '🏳️';
}
