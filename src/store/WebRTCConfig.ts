import {
  SIGNALING_SERVER_URL,
  FALLBACK_SERVER_URLS,
  WEBRTC_TIMEOUT,
  WEBRTC_RECONNECTION_ATTEMPTS,
  WEBRTC_RECONNECTION_DELAY,
  STUN_SERVERS,
  NODE_ENV
} from '@env';

export const getServerURL = () => {
  const url = SIGNALING_SERVER_URL || 'https://whisperlang-render.onrender.com';
  return url;
};

export const getServerURLs = () => {
  const fallbackUrls = FALLBACK_SERVER_URLS || 'https://whisperlang-render.onrender.com';
  const urls = fallbackUrls.split(',').map(url => url.trim());
  return urls;
};

export const getStunServers = () => {
  if (STUN_SERVERS) {
    return STUN_SERVERS.split(',').map(url => url.trim());
  }
  return [
    'stun:stun1.l.google.com:19302',
    'stun:stun2.l.google.com:19302',
  ];
};

export const SERVER_URL = getServerURL();
export const SERVER_URLS = getServerURLs();

export const ICE_SERVERS = {
  iceServers: [
    {
      urls: getStunServers(),
    },
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
        'stun:stun3.l.google.com:19302',
        'stun:stun4.l.google.com:19302',
      ],
    },
  ],
  iceCandidatePoolSize: 10,
};

export const WEBRTC_CONFIG = {
  timeout: parseInt(WEBRTC_TIMEOUT || '10000'),
  reconnectionAttempts: parseInt(WEBRTC_RECONNECTION_ATTEMPTS || '3'),
  reconnectionDelay: parseInt(WEBRTC_RECONNECTION_DELAY || '2000'),
  environment: NODE_ENV || 'development'
};
