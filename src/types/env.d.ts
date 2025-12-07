declare module '@env' {
  export const SIGNALING_SERVER_URL: string;
  export const FALLBACK_SERVER_URLS: string;
  export const NODE_ENV: string;
  export const WEBRTC_TIMEOUT: string;
  export const WEBRTC_RECONNECTION_ATTEMPTS: string;
  export const WEBRTC_RECONNECTION_DELAY: string;
  export const STUN_SERVERS: string;
  export const AZURE_SPEECH_KEY: string;
  export const AZURE_SPEECH_REGION: string;
  export const AZURE_SPEECH_ENABLED: string;
  export const REPLICATE_API_TOKEN: string;
  export const REPLICATE_MODEL_PATH: string;
  export const REPLICATE_MODEL_VERSION: string;
  export const REPLICATE_POLL_INTERVAL_MS: string;
  export const REPLICATE_PREDICTION_TIMEOUT_MS: string;

  // Palabra AI - Real-time speech-to-speech translation
  export const PALABRA_CLIENT_ID: string;
  export const PALABRA_CLIENT_SECRET: string;
  export const PALABRA_API_BASE_URL: string;
}
