import * as FileSystem from 'expo-file-system';
import {
  WhisperModel,
  ModelDownloadProgress,
  ModelDownloadJob,
  ModelDownloadMap,
  ModelDownloadCallbacks,
} from './types';

const LOG_TAG = 'WhisperModelDownloader';

export const WHISPER_MODELS: Record<string, WhisperModel> = {
  small: {
    name: 'small',
    fileName: 'ggml-small-q5_1.bin',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small-q5_1.bin',
    size: 190 * 1024 * 1024,
    description: 'Small model (190 MB) - Good balance of speed and accuracy'
  },
  medium: {
    name: 'medium',
    fileName: 'ggml-medium-q5_0.bin',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium-q5_0.bin',
    size: 539 * 1024 * 1024,
    description: 'Medium model (539 MB) - Higher accuracy, slower'
  },
  vad: {
    name: 'vad',
    fileName: 'ggml-silero-v5.1.2.bin',
    url: 'https://huggingface.co/ggml-org/whisper-vad/resolve/main/ggml-silero-v5.1.2.bin',
    size: 885 * 1024,
    description: 'Voice Activity Detection (885 KB) - Required for all models'
  },
};

export class WhisperModelDownloader {
  private activeDownloads: ModelDownloadMap;
  private eventCallbacks: ModelDownloadCallbacks = {};

  constructor() {
    this.activeDownloads = new Map();
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  private formatSpeed(bytesPerSecond: number): string {
    if (bytesPerSecond === 0) return '0 B/s';
    return `${this.formatFileSize(bytesPerSecond)}/s`;
  }

  private calculateEta(
    bytesTransferred: number,
    totalBytes: number,
    speedBps: number,
  ): string {
    if (speedBps === 0 || bytesTransferred >= totalBytes) {
      return '0 sec';
    }

    const remainingBytes = totalBytes - bytesTransferred;
    const etaSeconds = remainingBytes / speedBps;

    if (etaSeconds < 60) {
      return `${Math.round(etaSeconds)} sec`;
    } else if (etaSeconds < 3600) {
      return `${Math.round(etaSeconds / 60)} min`;
    } else {
      return `${Math.round(etaSeconds / 3600)} hr`;
    }
  }

  setEventCallbacks(callbacks: ModelDownloadCallbacks): void {
    this.eventCallbacks = callbacks;
  }

  isDownloadActive(modelName: string): boolean {
    const download = this.activeDownloads.get(modelName);
    return download ? download.state.isDownloading : false;
  }

  getDownloadProgress(modelName: string): number {
    const download = this.activeDownloads.get(modelName);
    return download?.state.progress?.progress || 0;
  }

  private getModelPath(modelName: string): string {
    const model = WHISPER_MODELS[modelName];
    if (!model) {
      throw new Error(`Unknown model: ${modelName}`);
    }
    const baseDir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
    if (!baseDir) {
      throw new Error('No writable directory available');
    }
    return `${baseDir.replace(/\/$/, '')}/whisper/${model.fileName}`;
  }

  async checkModelExists(modelName: string): Promise<boolean> {
    const model = WHISPER_MODELS[modelName];
    if (!model) {
      return false;
    }

    const path = this.getModelPath(modelName);
    const info = await FileSystem.getInfoAsync(path);

    if (!info.exists) {
      return false;
    }

    if (model.size > 0 && (info.size || 0) < model.size * 0.95) {
      return false;
    }

    return true;
  }

  async startDownload(modelName: string): Promise<string> {
    if (this.isDownloadActive(modelName)) {
      const existingJob = this.activeDownloads.get(modelName);
      return existingJob?.downloadId || '';
    }

    const alreadyExists = await this.checkModelExists(modelName);
    if (alreadyExists) {
      throw new Error(`Model ${modelName} already exists`);
    }

    const model = WHISPER_MODELS[modelName];
    if (!model) {
      throw new Error(`Unknown model: ${modelName}`);
    }

    const destinationPath = this.getModelPath(modelName);
    const directoryPath = destinationPath.substring(0, destinationPath.lastIndexOf('/'));

    try {
      const fileInfo = await FileSystem.getInfoAsync(destinationPath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(destinationPath);
      }
    } catch (err) {
    }

    try {
      await FileSystem.makeDirectoryAsync(directoryPath, { intermediates: true });
    } catch (err) {
    }

    const downloadId = Date.now().toString();

    const downloadJob: ModelDownloadJob = {
      model,
      downloadId,
      state: {
        isDownloading: true,
        progress: {
          bytesDownloaded: 0,
          bytesTotal: 0,
          progress: 0,
          speed: '0 B/s',
          eta: 'calculating',
          rawSpeed: 0,
          rawEta: 0,
        },
      },
      lastBytesWritten: 0,
      lastUpdateTime: Date.now(),
    };

    this.activeDownloads.set(modelName, downloadJob);

    const resumable = FileSystem.createDownloadResumable(
      model.url,
      destinationPath,
      {},
      (downloadProgress) => {
        if (!this.activeDownloads.has(modelName)) {
          return;
        }

        const job = this.activeDownloads.get(modelName)!;

        if (job.state.isCancelling) {
          return;
        }

        const currentTimestamp = Date.now();
        const timeDelta = (currentTimestamp - job.lastUpdateTime) / 1000 || 1;
        const bytesDelta = downloadProgress.totalBytesWritten - job.lastBytesWritten;
        const speedBps = bytesDelta / timeDelta;

        const progressPercent = downloadProgress.totalBytesExpectedToWrite > 0
          ? Math.min((downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100, 100)
          : 0;

        const speedFormatted = this.formatSpeed(speedBps);
        const etaFormatted = this.calculateEta(
          downloadProgress.totalBytesWritten,
          downloadProgress.totalBytesExpectedToWrite,
          speedBps,
        );

        const progress: ModelDownloadProgress = {
          bytesDownloaded: downloadProgress.totalBytesWritten,
          bytesTotal: downloadProgress.totalBytesExpectedToWrite,
          progress: progressPercent,
          speed: speedFormatted,
          eta: etaFormatted,
          rawSpeed: speedBps,
          rawEta: downloadProgress.totalBytesExpectedToWrite - downloadProgress.totalBytesWritten > 0
            ? (downloadProgress.totalBytesExpectedToWrite - downloadProgress.totalBytesWritten) / speedBps
            : 0,
        };

        job.state.progress = progress;
        job.lastBytesWritten = downloadProgress.totalBytesWritten;
        job.lastUpdateTime = currentTimestamp;

        this.eventCallbacks.onProgress?.(modelName, progress);
      },
    );

    downloadJob.resumable = resumable;

    this.eventCallbacks.onStart?.(modelName, downloadId);

    try {
      await resumable.downloadAsync();

      const job = this.activeDownloads.get(modelName);
      if (job && job.state.progress) {
        job.state.isDownloading = false;
        job.state.progress.progress = 100;
        job.state.progress.speed = '0 B/s';
        job.state.progress.eta = '0 sec';

        this.eventCallbacks.onComplete?.(modelName);
        this.activeDownloads.delete(modelName);
      }
    } catch (error) {
      const job = this.activeDownloads.get(modelName);

      if (job) {
        job.state.isDownloading = false;
        job.state.progress = undefined;

        if (job.state.isCancelling) {
          this.eventCallbacks.onCancelled?.(modelName);
        } else {
          this.eventCallbacks.onError?.(modelName, error as Error);
        }

        this.activeDownloads.delete(modelName);
      }

      throw error;
    }

    return downloadId;
  }

  async cancelDownload(modelName: string): Promise<void> {
    const job = this.activeDownloads.get(modelName);
    if (!job) {
      return;
    }

    job.state.isCancelling = true;

    try {
      if (job.resumable) {
        await job.resumable.pauseAsync();
      }

      this.eventCallbacks.onCancelled?.(modelName);
      this.activeDownloads.delete(modelName);
    } catch (error) {
      this.activeDownloads.delete(modelName);
      throw error;
    }
  }

  async deleteModel(modelName: string): Promise<void> {
    const path = this.getModelPath(modelName);
    try {
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists) {
        await FileSystem.deleteAsync(path);
      }
    } catch (error) {
      throw error;
    }
  }

  async getModelSize(modelName: string): Promise<number> {
    const path = this.getModelPath(modelName);
    try {
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists) {
        return info.size || 0;
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  getActiveDownloadCount(): number {
    return this.activeDownloads.size;
  }
}

export const whisperModelDownloader = new WhisperModelDownloader();
