import { NativeEventEmitter, NativeModules, EmitterSubscription } from 'react-native';
import { CallTranslationPrefs } from './call-translation-prefs';
import type { SourceLangCode, TargetLangCode } from './palabra/types';
import { PALABRA_API_BASE_URL } from '@env';

const { WebRTCModule } = NativeModules;
const nativeEmitter = new NativeEventEmitter(WebRTCModule);

export type NativePalabraState = 'idle' | 'connecting' | 'connected' | 'error';

export interface NativePalabraConfig {
  sourceLang: SourceLangCode;
  targetLang: TargetLangCode;
}

export interface NativePalabraTranscription {
  text: string;
  lang: string;
  isFinal: boolean;
}

interface NativePalabraCallbacks {
  onStateChange?: (state: NativePalabraState) => void;
  onTranscription?: (data: NativePalabraTranscription) => void;
  onError?: (error: string) => void;
}

class NativePalabra {
  private subscriptions: EmitterSubscription[] = [];
  private callbacks: NativePalabraCallbacks = {};
  private state: NativePalabraState = 'idle';
  private activeTrackId: string | null = null;

  getState(): NativePalabraState {
    return this.state;
  }

  async startWithTrack(
    track: MediaStreamTrack,
    config: NativePalabraConfig,
    callbacks: NativePalabraCallbacks
  ): Promise<boolean> {
    if (this.state === 'connecting' || this.state === 'connected') {
      console.log('native_palabra_already_active');
      return false;
    }

    const prefs = await CallTranslationPrefs.getAll();
    const clientId = prefs.clientId;
    const clientSecret = prefs.clientSecret;

    if (!clientId || !clientSecret) {
      console.log('palabra_not_configured');
      callbacks.onError?.('Palabra not configured');
      return false;
    }

    this.callbacks = callbacks;
    this.setupListeners();
    this.setState('connecting');

    try {
      const webrtcTrack = track as any;
      
      await webrtcTrack.startPalabraTranslation({
        clientId,
        clientSecret,
        sourceLang: config.sourceLang,
        targetLang: config.targetLang,
        apiUrl: PALABRA_API_BASE_URL || 'https://api.palabra.ai',
      });

      this.activeTrackId = webrtcTrack.id;
      return true;
    } catch (err) {
      console.log('native_palabra_start_err', err);
      this.setState('error');
      this.callbacks.onError?.(err instanceof Error ? err.message : 'Start failed');
      this.cleanup();
      return false;
    }
  }

  async stop(): Promise<void> {
    if (this.state === 'idle') {
      return;
    }

    try {
      await WebRTCModule.stopPalabraTranslation();
    } catch (err) {
      console.log('native_palabra_stop_err', err);
    }

    this.cleanup();
  }

  async updateLanguages(sourceLang: SourceLangCode, targetLang: TargetLangCode): Promise<void> {
    if (this.state !== 'connected' || !this.activeTrackId) {
      return;
    }
  }

  private setupListeners(): void {
    this.removeListeners();

    this.subscriptions.push(
      nativeEmitter.addListener('palabraConnectionState', (data: { state: string }) => {
        const state = this.mapConnectionState(data.state);
        this.setState(state);
      })
    );

    this.subscriptions.push(
      nativeEmitter.addListener('palabraTranscription', (data: NativePalabraTranscription) => {
        this.callbacks.onTranscription?.(data);
      })
    );

    this.subscriptions.push(
      nativeEmitter.addListener('palabraError', (data: { code: number; message: string }) => {
        console.log('native_palabra_error', data.message);
        this.setState('error');
        this.callbacks.onError?.(data.message);
      })
    );
  }

  private removeListeners(): void {
    this.subscriptions.forEach((sub) => sub.remove());
    this.subscriptions = [];
  }

  private cleanup(): void {
    this.removeListeners();
    this.callbacks = {};
    this.activeTrackId = null;
    this.setState('idle');
  }

  private setState(state: NativePalabraState): void {
    if (this.state !== state) {
      this.state = state;
      this.callbacks.onStateChange?.(state);
    }
  }

  private mapConnectionState(state: string): NativePalabraState {
    switch (state) {
      case 'connected':
        return 'connected';
      case 'connecting':
      case 'reconnecting':
        return 'connecting';
      case 'disconnected':
      case 'failed':
        return 'error';
      default:
        return 'idle';
    }
  }
}

export const nativePalabra = new NativePalabra();
export default nativePalabra;
