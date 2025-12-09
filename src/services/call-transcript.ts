/**
 * Call Transcript Collector Service
 * Collects and manages transcripts during calls for AI summarization
 */

import { EventEmitter } from 'events';
import {
  TranscriptEntry,
  CallSession,
  CallParticipant,
  CallType,
  DEFAULT_TRANSCRIPT_CONFIG,
  TranscriptCollectorConfig,
} from '../types/call-summary';

type TranscriptEventType = 'transcript' | 'sessionStart' | 'sessionEnd' | 'error';

class CallTranscriptService extends EventEmitter {
  private static instance: CallTranscriptService;
  private currentSession: CallSession | null = null;
  private config: TranscriptCollectorConfig = DEFAULT_TRANSCRIPT_CONFIG;
  private transcriptBuffer: TranscriptEntry[] = [];
  private entryIdCounter = 0;

  private constructor() {
    super();
  }

  static getInstance(): CallTranscriptService {
    if (!CallTranscriptService.instance) {
      CallTranscriptService.instance = new CallTranscriptService();
    }
    return CallTranscriptService.instance;
  }

  setConfig(config: Partial<TranscriptCollectorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): TranscriptCollectorConfig {
    return { ...this.config };
  }

  startSession(params: {
    type: CallType;
    sourceLang: string;
    targetLang: string;
    participants?: CallParticipant[];
    meetingId?: string;
  }): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.currentSession = {
      id: sessionId,
      type: params.type,
      startTime: Date.now(),
      participants: params.participants || [],
      sourceLang: params.sourceLang,
      targetLang: params.targetLang,
      transcripts: [],
      meetingId: params.meetingId,
    };

    this.transcriptBuffer = [];
    this.entryIdCounter = 0;

    console.log('[TranscriptService] Session started:', sessionId);
    this.emit('sessionStart', { sessionId, session: this.currentSession });

    return sessionId;
  }

  endSession(): CallSession | null {
    if (!this.currentSession) {
      console.warn('[TranscriptService] No active session to end');
      return null;
    }

    this.currentSession.endTime = Date.now();
    this.currentSession.transcripts = [...this.transcriptBuffer];

    const completedSession = { ...this.currentSession };
    
    console.log('[TranscriptService] Session ended:', completedSession.id, 
      'Transcripts:', completedSession.transcripts.length);
    
    this.emit('sessionEnd', { session: completedSession });

    this.currentSession = null;
    this.transcriptBuffer = [];

    return completedSession;
  }

  addTranscript(params: {
    speaker: 'local' | 'remote';
    speakerName?: string;
    sourceText: string;
    translatedText?: string;
    sourceLang?: string;
    targetLang?: string;
    isFinal?: boolean;
  }): void {
    if (!this.currentSession && !this.config.captureInBackground) {
      return;
    }

    const entry: TranscriptEntry = {
      id: `entry_${++this.entryIdCounter}`,
      timestamp: Date.now(),
      speaker: params.speaker,
      speakerName: params.speakerName,
      sourceText: params.sourceText,
      translatedText: params.translatedText,
      sourceLang: params.sourceLang || this.currentSession?.sourceLang || 'auto',
      targetLang: params.targetLang || this.currentSession?.targetLang,
      isFinal: params.isFinal ?? true,
    };

    // If not final, update the last entry if same speaker
    if (!entry.isFinal && this.transcriptBuffer.length > 0) {
      const lastEntry = this.transcriptBuffer[this.transcriptBuffer.length - 1];
      if (lastEntry.speaker === entry.speaker && !lastEntry.isFinal) {
        this.transcriptBuffer[this.transcriptBuffer.length - 1] = entry;
        this.emit('transcript', { entry, isUpdate: true });
        return;
      }
    }

    this.transcriptBuffer.push(entry);

    // Enforce memory limit
    if (this.transcriptBuffer.length > this.config.maxEntriesInMemory) {
      this.transcriptBuffer = this.transcriptBuffer.slice(-this.config.maxEntriesInMemory);
    }

    this.emit('transcript', { entry, isUpdate: false });
  }

  updateParticipant(participant: CallParticipant): void {
    if (!this.currentSession) return;

    const existingIndex = this.currentSession.participants.findIndex(
      p => p.peerId === participant.peerId
    );

    if (existingIndex >= 0) {
      this.currentSession.participants[existingIndex] = participant;
    } else {
      this.currentSession.participants.push(participant);
    }
  }

  removeParticipant(peerId: string): void {
    if (!this.currentSession) return;
    this.currentSession.participants = this.currentSession.participants.filter(
      p => p.peerId !== peerId
    );
  }

  getCurrentSession(): CallSession | null {
    if (!this.currentSession) return null;
    return {
      ...this.currentSession,
      transcripts: [...this.transcriptBuffer],
    };
  }

  getTranscripts(): TranscriptEntry[] {
    return [...this.transcriptBuffer];
  }

  getTranscriptCount(): number {
    return this.transcriptBuffer.length;
  }

  hasActiveSession(): boolean {
    return this.currentSession !== null;
  }

  getSessionDuration(): number {
    if (!this.currentSession) return 0;
    return Date.now() - this.currentSession.startTime;
  }

  getFormattedTranscript(): string {
    return this.transcriptBuffer
      .filter(t => t.isFinal)
      .map(t => {
        const speaker = t.speakerName || (t.speaker === 'local' ? 'You' : 'Remote');
        const text = t.translatedText || t.sourceText;
        return `[${speaker}]: ${text}`;
      })
      .join('\n');
  }

  getTranscriptForSummary(): string {
    const finalTranscripts = this.transcriptBuffer.filter(t => t.isFinal);
    
    if (finalTranscripts.length === 0) {
      return '';
    }

    const lines: string[] = [];
    let currentSpeaker = '';

    for (const t of finalTranscripts) {
      const speaker = t.speakerName || (t.speaker === 'local' ? 'Speaker A' : 'Speaker B');
      const text = t.sourceText;
      const translation = t.translatedText;

      if (speaker !== currentSpeaker) {
        currentSpeaker = speaker;
        lines.push(`\n${speaker}:`);
      }

      if (translation && translation !== text) {
        lines.push(`  "${text}" (translated: "${translation}")`);
      } else {
        lines.push(`  "${text}"`);
      }
    }

    return lines.join('\n').trim();
  }

  clearBuffer(): void {
    this.transcriptBuffer = [];
    this.entryIdCounter = 0;
  }

  reset(): void {
    this.currentSession = null;
    this.transcriptBuffer = [];
    this.entryIdCounter = 0;
  }
}

export const callTranscriptService = CallTranscriptService.getInstance();
export default callTranscriptService;
