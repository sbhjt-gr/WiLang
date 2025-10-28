import { useExpoSpeechSTT } from './useExpoSpeechSTT';
import type { WhisperLanguage } from '../services/whisper/ModelPreferences';
import type { ExpoSpeechMode } from '../services/SubtitlePreferences';

type UseSubtitleEngineOptions = {
  enabled: boolean;
  locale: string;
  mode: ExpoSpeechMode;
  detect: boolean;
};

const useSubtitleEngine = (options: UseSubtitleEngineOptions) => {
  return useExpoSpeechSTT({
    enabled: options.enabled,
    lang: options.locale,
    mode: options.mode,
    detect: options.detect,
  });
};

export default useSubtitleEngine;
