import { requireNativeModule } from 'expo';

type RemoteAudioRecorderModule = {
  startRecording: (streamId: string, trackId: string, outputPath: string) => Promise<string>;
  stopRecording: (trackId: string) => Promise<void>;
  isRecording: (trackId: string) => boolean;
};

const RemoteAudioRecorderModule = requireNativeModule<RemoteAudioRecorderModule>('RemoteAudioRecorder');

export const RemoteAudioRecorder = {
  startRecording: (streamId: string, trackId: string, outputPath: string) => {
    return RemoteAudioRecorderModule.startRecording(streamId, trackId, outputPath);
  },
  stopRecording: (trackId: string) => {
    return RemoteAudioRecorderModule.stopRecording(trackId);
  },
  isRecording: (trackId: string) => {
    return RemoteAudioRecorderModule.isRecording(trackId);
  },
};

