import { useEffect } from 'react';
import useWhisperSTT from './useWhisperSTT';
import useExpoSpeechSTT from './useExpoSpeechSTT';
import type { WhisperModelVariant, WhisperLanguage } from '../services/whisper/ModelPreferences';
import type { ExpoSpeechMode, SubtitleEngine } from '../services/SubtitlePreferences';

type WhisperVadPreset =
  | 'default'
  | 'sensitive'
  | 'very-sensitive'
  | 'conservative'
  | 'very-conservative'
  | 'continuous'
  | 'meeting'
  | 'noisy';

type UseSubtitleEngineOptions = {
  engine: SubtitleEngine;
  enabled: boolean;
  whisper: {
    model: WhisperModelVariant;
    vadPreset: WhisperVadPreset;
    language: WhisperLanguage;
    allowedLanguages: string[];
  };
  expo: {
    locale: string;
    mode: ExpoSpeechMode;
    detect: boolean;
  };
};

const useSubtitleEngine = (options: UseSubtitleEngineOptions) => {
  const whisper = useWhisperSTT({
    enabled: options.engine === 'whisper' && options.enabled,
    modelVariant: options.whisper.model,
    vadPreset: options.whisper.vadPreset,
    language: options.whisper.language,
    allowedLanguages: options.whisper.allowedLanguages,
  });

  const expo = useExpoSpeechSTT({
    enabled: options.engine === 'expo' && options.enabled,
    lang: options.expo.locale,
    mode: options.expo.mode,
    detect: options.expo.detect,
  });

  const whisperStop = whisper.stop;
  const expoStop = expo.stop;

  useEffect(() => {
    if (options.engine === 'whisper') {
      expoStop().catch(() => {});
    } else {
      whisperStop().catch(() => {});
    }
  }, [expoStop, options.engine, whisperStop]);

  return options.engine === 'whisper' ? whisper : expo;
};

export default useSubtitleEngine;
