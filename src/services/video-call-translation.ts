import { EventEmitter } from 'events';
import { mediaDevices, MediaStream } from '@livekit/react-native-webrtc';
import {
  PalabraTranslationService,
  PalabraTranslationServiceConfig,
} from './palabra/PalabraTranslationService';
import { RemoteTrackInfo } from './palabra/PalabraLiveKitTransport';
import {
  SourceLangCode,
  TargetLangCode,
  TranscriptionData,
  TranslationData,
  ConnectionState,
} from './palabra/types';
import { CallTranslationPrefs } from './call-translation-prefs';
import { PALABRA_API_BASE_URL } from '@env';

export type TranslationState = 'idle' | 'connecting' | 'active' | 'error';

export interface VideoCallTranslationEvents {
  stateChange: (state: TranslationState) => void;
  transcription: (data: TranscriptionData) => void;
  translation: (data: TranslationData) => void;
  remoteTrack: (tracks: RemoteTrackInfo[]) => void;
  error: (error: Error) => void;
}

export class VideoCallTranslation extends EventEmitter {
  private service: PalabraTranslationService | null = null;
  private state: TranslationState = 'idle';
  private sourceLang: SourceLangCode = 'auto';
  private targetLang: TargetLangCode = 'en-us';
  private trackRef: MediaStreamTrack | null = null;
  private localStream: MediaStream | null = null;

  constructor() {
    super();
  }

  getState(): TranslationState {
    return this.state;
  }

  getSourceLang(): SourceLangCode {
    return this.sourceLang;
  }

  getTargetLang(): TargetLangCode {
    return this.targetLang;
  }

  private setState(state: TranslationState): void {
    this.state = state;
    this.emit('stateChange', state);
  }

  async loadPrefs(): Promise<void> {
    const prefs = await CallTranslationPrefs.getAll();
    this.sourceLang = prefs.source;
    this.targetLang = prefs.target;
  }

  setLanguages(source: SourceLangCode, target: TargetLangCode): void {
    this.sourceLang = source;
    this.targetLang = target;
    CallTranslationPrefs.setSource(source);
    CallTranslationPrefs.setTarget(target);

    if (this.service) {
      this.service.setSourceLanguage(source);
      this.service.setTargetLanguage(target);
    }
  }

  async startWithTrack(audioTrack: MediaStreamTrack): Promise<boolean> {
    if (this.state === 'active' || this.state === 'connecting') {
      console.log('translation_already_active');
      return false;
    }

    const prefs = await CallTranslationPrefs.getAll();
    const clientId = prefs.clientId;
    const clientSecret = prefs.clientSecret;

    if (!clientId || !clientSecret) {
      console.log('translation_not_configured');
      this.emit('error', new Error('Palabra not configured'));
      return false;
    }

    this.setState('connecting');
    this.trackRef = audioTrack;

    try {
      const config: PalabraTranslationServiceConfig = {
        auth: {
          clientId,
          clientSecret,
        },
        sourceLanguage: this.sourceLang,
        targetLanguage: this.targetLang,
        apiBaseUrl: PALABRA_API_BASE_URL || 'https://api.palabra.ai',
        onTranscription: (data) => this.emit('transcription', data),
        onTranslation: (data) => this.emit('translation', data),
        onRemoteTrack: (tracks) => this.emit('remoteTrack', tracks),
        onConnectionStateChange: (state) => this.handleConnectionState(state),
        onError: (err) => {
          this.setState('error');
          this.emit('error', err);
        },
      };

      this.service = new PalabraTranslationService(config);
      const success = await this.service.startTranslation(audioTrack);

      if (success) {
        this.setState('active');
        return true;
      } else {
        this.cleanup();
        this.setState('error');
        return false;
      }
    } catch (err) {
      console.log('translation_start_err', err);
      this.cleanup();
      this.setState('error');
      this.emit('error', err instanceof Error ? err : new Error('Start failed'));
      return false;
    }
  }

  private cleanup(): void {
    this.trackRef = null;
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
  }

  async startWithLocalMic(): Promise<boolean> {
    if (this.state === 'active' || this.state === 'connecting') {
      console.log('translation_already_active');
      return false;
    }

    try {
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      this.localStream = stream as MediaStream;

      const audioTracks = this.localStream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error('No audio track');
      }

      const audioTrack = audioTracks[0] as unknown as MediaStreamTrack;
      return this.startWithTrack(audioTrack);
    } catch (err) {
      console.log('mic_access_err', err);
      this.setState('error');
      this.emit('error', err instanceof Error ? err : new Error('Mic access failed'));
      return false;
    }
  }

  async stop(): Promise<void> {
    if (this.service) {
      await this.service.cleanup();
      this.service = null;
    }
    this.cleanup();
    this.setState('idle');
  }

  private handleConnectionState(state: ConnectionState): void {
    switch (state) {
      case 'connected':
        this.setState('active');
        break;
      case 'connecting':
      case 'reconnecting':
        if (this.state !== 'active') {
          this.setState('connecting');
        }
        break;
      case 'disconnected':
        break;
    }
  }

  getRemoteTracks(): RemoteTrackInfo[] {
    return this.service?.getRemoteTracks() || [];
  }

  async isConfigured(): Promise<boolean> {
    const prefs = await CallTranslationPrefs.getAll();
    return Boolean(prefs.clientId && prefs.clientSecret);
  }
}

export const videoCallTranslation = new VideoCallTranslation();
export default videoCallTranslation;

