export interface WhisperModel {
  name: string;
  fileName: string;
  url: string;
  size: number;
  description: string;
}

export interface ModelDownloadProgress {
  bytesDownloaded: number;
  bytesTotal: number;
  progress: number;
  speed: string;
  eta: string;
  rawSpeed: number;
  rawEta: number;
}

export interface ModelDownloadJob {
  model: WhisperModel;
  downloadId: string;
  state: {
    isDownloading: boolean;
    progress?: ModelDownloadProgress;
    isCancelling?: boolean;
  };
  lastBytesWritten: number;
  lastUpdateTime: number;
  resumable?: any;
}

export type ModelDownloadMap = Map<string, ModelDownloadJob>;

export interface ModelDownloadCallbacks {
  onStart?: (modelName: string, downloadId: string) => void;
  onProgress?: (modelName: string, progress: ModelDownloadProgress) => void;
  onComplete?: (modelName: string) => void;
  onError?: (modelName: string, error: Error) => void;
  onCancelled?: (modelName: string) => void;
}
