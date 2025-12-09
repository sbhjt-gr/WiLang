/**
 * Type definitions for Call Notes / AI Summary feature
 */

export type CallType = 'video' | 'voice' | 'qr-translation';
export type TranscriptSpeaker = 'local' | 'remote';

export interface TranscriptEntry {
  id: string;
  timestamp: number;
  speaker: TranscriptSpeaker;
  speakerName?: string;
  sourceText: string;
  translatedText?: string;
  sourceLang: string;
  targetLang?: string;
  isFinal: boolean;
}

export interface CallParticipant {
  peerId: string;
  name: string;
  isLocal: boolean;
}

export interface CallSession {
  id: string;
  type: CallType;
  startTime: number;
  endTime?: number;
  participants: CallParticipant[];
  sourceLang: string;
  targetLang: string;
  transcripts: TranscriptEntry[];
  summary?: CallSummary;
  meetingId?: string;
}

export interface CallSummary {
  summary: string;
  keyPoints: string[];
  actionItems?: string[];
  topics?: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  languagesUsed: Array<{ source: string; target: string }>;
  wordCount: number;
  speakerStats?: Record<string, { wordCount: number; speakingTime: number }>;
  generatedAt: number;
}

export interface StoredCallNote {
  id: string;
  sessionId: string;
  callType: CallType;
  title: string;
  startTime: number;
  endTime: number;
  duration: number;
  participants: string[];
  summary: CallSummary;
  transcriptCount: number;
  hasFullTranscript: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CallNotePreview {
  id: string;
  title: string;
  callType: CallType;
  startTime: number;
  duration: number;
  participants: string[];
  summaryPreview: string;
  keyPointsCount: number;
}

export interface TranscriptCollectorConfig {
  captureInBackground: boolean;
  maxEntriesInMemory: number;
  autoFlushInterval: number;
}

export interface GeminiSummaryConfig {
  model: string;
  maxTokens: number;
  temperature: number;
}

export const DEFAULT_TRANSCRIPT_CONFIG: TranscriptCollectorConfig = {
  captureInBackground: true,
  maxEntriesInMemory: 1000,
  autoFlushInterval: 30000,
};

export const DEFAULT_GEMINI_CONFIG: GeminiSummaryConfig = {
  model: 'gemini-2.5-flash',
  maxTokens: 2048,
  temperature: 0.3,
};
