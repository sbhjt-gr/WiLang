declare module '@env' {
  export const SIGNALING_SERVER_URL: string;
  export const FALLBACK_SERVER_URLS: string;
  export const NODE_ENV: string;
  export const WEBRTC_TIMEOUT: string;
  export const WEBRTC_RECONNECTION_ATTEMPTS: string;
  export const WEBRTC_RECONNECTION_DELAY: string;
  export const STUN_SERVERS: string;

  // Palabra AI - Real-time speech-to-speech translation
  export const PALABRA_API_BASE_URL: string;
}
