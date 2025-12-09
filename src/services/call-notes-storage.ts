/**
 * Call Notes Storage Service
 * Persists call summaries and transcripts to local database and optionally cloud
 */

import * as SQLite from 'expo-sqlite';
import { getDatabase, initDatabase } from '../utils/database';
import {
  CallSession,
  CallSummary,
  StoredCallNote,
  CallNotePreview,
  CallType,
} from '../types/call-summary';
import { geminiSummaryService } from './gemini-summary';

class CallNotesStorageService {
  private static instance: CallNotesStorageService;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): CallNotesStorageService {
    if (!CallNotesStorageService.instance) {
      CallNotesStorageService.instance = new CallNotesStorageService();
    }
    return CallNotesStorageService.instance;
  }

  private async getDb(): Promise<SQLite.SQLiteDatabase | null> {
    if (!this.initialized) {
      await this.initialize();
    }
    let db = getDatabase();
    if (!db) {
      await initDatabase();
      db = getDatabase();
    }
    return db;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    let db = getDatabase();
    if (!db) {
      await initDatabase();
      db = getDatabase();
    }

    if (!db) {
      console.error('[CallNotesStorage] Database not available');
      return;
    }

    try {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS call_notes (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          call_type TEXT NOT NULL,
          title TEXT NOT NULL,
          start_time INTEGER NOT NULL,
          end_time INTEGER NOT NULL,
          duration INTEGER NOT NULL,
          participants TEXT NOT NULL,
          summary TEXT NOT NULL,
          key_points TEXT NOT NULL,
          action_items TEXT,
          topics TEXT,
          sentiment TEXT,
          languages_used TEXT NOT NULL,
          word_count INTEGER DEFAULT 0,
          speaker_stats TEXT,
          transcript_count INTEGER DEFAULT 0,
          has_full_transcript INTEGER DEFAULT 0,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_call_notes_start_time ON call_notes(start_time DESC);
        CREATE INDEX IF NOT EXISTS idx_call_notes_call_type ON call_notes(call_type);

        CREATE TABLE IF NOT EXISTS call_transcripts (
          id TEXT PRIMARY KEY,
          note_id TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          speaker TEXT NOT NULL,
          speaker_name TEXT,
          source_text TEXT NOT NULL,
          translated_text TEXT,
          source_lang TEXT NOT NULL,
          target_lang TEXT,
          is_final INTEGER DEFAULT 1,
          FOREIGN KEY (note_id) REFERENCES call_notes(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_call_transcripts_note_id ON call_transcripts(note_id);
      `);

      this.initialized = true;
      console.log('[CallNotesStorage] Tables initialized');
    } catch (error) {
      console.error('[CallNotesStorage] Init failed:', error);
      this.initPromise = null;
    }
  }

  async saveCallNote(
    session: CallSession,
    summary: CallSummary,
    saveTranscripts: boolean = true
  ): Promise<string | null> {
    await this.initialize();
    const db = await this.getDb();
    if (!db) return null;

    const noteId = `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    const duration = (session.endTime || now) - session.startTime;

    // Generate title from summary or participants
    const title = this.generateTitle(session, summary);
    const participants = session.participants.map(p => p.name).filter(Boolean);

    try {
      await db.runAsync(
        `INSERT INTO call_notes (
          id, session_id, call_type, title, start_time, end_time, duration,
          participants, summary, key_points, action_items, topics, sentiment,
          languages_used, word_count, speaker_stats, transcript_count,
          has_full_transcript, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          noteId,
          session.id,
          session.type,
          title,
          session.startTime,
          session.endTime || now,
          duration,
          JSON.stringify(participants),
          summary.summary,
          JSON.stringify(summary.keyPoints),
          summary.actionItems ? JSON.stringify(summary.actionItems) : null,
          summary.topics ? JSON.stringify(summary.topics) : null,
          summary.sentiment || null,
          JSON.stringify(summary.languagesUsed),
          summary.wordCount,
          summary.speakerStats ? JSON.stringify(summary.speakerStats) : null,
          session.transcripts.length,
          saveTranscripts ? 1 : 0,
          now,
          now,
        ]
      );

      // Save transcripts if enabled
      if (saveTranscripts && session.transcripts.length > 0) {
        await this.saveTranscripts(db, noteId, session.transcripts);
      }

      console.log('[CallNotesStorage] Saved note:', noteId);
      return noteId;
    } catch (error) {
      console.error('[CallNotesStorage] Save failed:', error);
      return null;
    }
  }

  private async saveTranscripts(
    db: SQLite.SQLiteDatabase,
    noteId: string,
    transcripts: CallSession['transcripts']
  ): Promise<void> {
    const finalTranscripts = transcripts.filter(t => t.isFinal);
    
    for (let i = 0; i < finalTranscripts.length; i++) {
      const t = finalTranscripts[i];
      const transcriptId = `${noteId}_t_${i}_${Date.now()}`;
      await db.runAsync(
        `INSERT OR REPLACE INTO call_transcripts (
          id, note_id, timestamp, speaker, speaker_name, source_text,
          translated_text, source_lang, target_lang, is_final
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          transcriptId,
          noteId,
          t.timestamp,
          t.speaker,
          t.speakerName || null,
          t.sourceText,
          t.translatedText || null,
          t.sourceLang,
          t.targetLang || null,
          t.isFinal ? 1 : 0,
        ]
      );
    }
  }

  private generateTitle(session: CallSession, summary: CallSummary): string {
    // Try to extract a meaningful title
    if (summary.topics && summary.topics.length > 0) {
      return summary.topics[0];
    }

    const participants = session.participants.filter(p => !p.isLocal);
    if (participants.length > 0) {
      const names = participants.map(p => p.name).join(', ');
      return `Call with ${names}`;
    }

    const typeLabel = session.type === 'video' 
      ? 'Video Call' 
      : session.type === 'voice' 
        ? 'Voice Call' 
        : 'Translation Session';

    const date = new Date(session.startTime);
    return `${typeLabel} - ${date.toLocaleDateString()}`;
  }

  async getCallNotes(
    limit: number = 50,
    offset: number = 0,
    callType?: CallType
  ): Promise<CallNotePreview[]> {
    await this.initialize();
    const db = await this.getDb();
    if (!db) return [];

    try {
      let query = `
        SELECT id, title, call_type, start_time, duration, participants, summary, key_points
        FROM call_notes
      `;
      const params: any[] = [];

      if (callType) {
        query += ' WHERE call_type = ?';
        params.push(callType);
      }

      query += ' ORDER BY start_time DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const rows = await db.getAllAsync<{
        id: string;
        title: string;
        call_type: string;
        start_time: number;
        duration: number;
        participants: string;
        summary: string;
        key_points: string;
      }>(query, params);

      return rows.map(row => ({
        id: row.id,
        title: row.title,
        callType: row.call_type as CallType,
        startTime: row.start_time,
        duration: row.duration,
        participants: JSON.parse(row.participants || '[]'),
        summaryPreview: row.summary.substring(0, 150) + (row.summary.length > 150 ? '...' : ''),
        keyPointsCount: JSON.parse(row.key_points || '[]').length,
      }));
    } catch (error) {
      console.error('[CallNotesStorage] Get notes failed:', error);
      return [];
    }
  }

  async getCallNote(noteId: string): Promise<StoredCallNote | null> {
    await this.initialize();
    const db = await this.getDb();
    if (!db) return null;

    try {
      const row = await db.getFirstAsync<{
        id: string;
        session_id: string;
        call_type: string;
        title: string;
        start_time: number;
        end_time: number;
        duration: number;
        participants: string;
        summary: string;
        key_points: string;
        action_items: string | null;
        topics: string | null;
        sentiment: string | null;
        languages_used: string;
        word_count: number;
        speaker_stats: string | null;
        transcript_count: number;
        has_full_transcript: number;
        created_at: number;
        updated_at: number;
      }>('SELECT * FROM call_notes WHERE id = ?', [noteId]);

      if (!row) return null;

      return {
        id: row.id,
        sessionId: row.session_id,
        callType: row.call_type as CallType,
        title: row.title,
        startTime: row.start_time,
        endTime: row.end_time,
        duration: row.duration,
        participants: JSON.parse(row.participants || '[]'),
        summary: {
          summary: row.summary,
          keyPoints: JSON.parse(row.key_points || '[]'),
          actionItems: row.action_items ? JSON.parse(row.action_items) : undefined,
          topics: row.topics ? JSON.parse(row.topics) : undefined,
          sentiment: row.sentiment as CallSummary['sentiment'],
          languagesUsed: JSON.parse(row.languages_used || '[]'),
          wordCount: row.word_count,
          speakerStats: row.speaker_stats ? JSON.parse(row.speaker_stats) : undefined,
          generatedAt: row.created_at,
        },
        transcriptCount: row.transcript_count,
        hasFullTranscript: row.has_full_transcript === 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      console.error('[CallNotesStorage] Get note failed:', error);
      return null;
    }
  }

  async getTranscripts(noteId: string): Promise<CallSession['transcripts']> {
    await this.initialize();
    const db = await this.getDb();
    if (!db) return [];

    try {
      const rows = await db.getAllAsync<{
        id: string;
        timestamp: number;
        speaker: string;
        speaker_name: string | null;
        source_text: string;
        translated_text: string | null;
        source_lang: string;
        target_lang: string | null;
        is_final: number;
      }>(
        'SELECT * FROM call_transcripts WHERE note_id = ? ORDER BY timestamp ASC',
        [noteId]
      );

      return rows.map(row => ({
        id: row.id,
        timestamp: row.timestamp,
        speaker: row.speaker as 'local' | 'remote',
        speakerName: row.speaker_name || undefined,
        sourceText: row.source_text,
        translatedText: row.translated_text || undefined,
        sourceLang: row.source_lang,
        targetLang: row.target_lang || undefined,
        isFinal: row.is_final === 1,
      }));
    } catch (error) {
      console.error('[CallNotesStorage] Get transcripts failed:', error);
      return [];
    }
  }

  async deleteCallNote(noteId: string): Promise<boolean> {
    await this.initialize();
    const db = await this.getDb();
    if (!db) return false;

    try {
      await db.runAsync('DELETE FROM call_transcripts WHERE note_id = ?', [noteId]);
      await db.runAsync('DELETE FROM call_notes WHERE id = ?', [noteId]);
      console.log('[CallNotesStorage] Deleted note:', noteId);
      return true;
    } catch (error) {
      console.error('[CallNotesStorage] Delete failed:', error);
      return false;
    }
  }

  async getNotesCount(callType?: CallType): Promise<number> {
    await this.initialize();
    const db = await this.getDb();
    if (!db) return 0;

    try {
      let query = 'SELECT COUNT(*) as count FROM call_notes';
      const params: any[] = [];

      if (callType) {
        query += ' WHERE call_type = ?';
        params.push(callType);
      }

      const result = await db.getFirstAsync<{ count: number }>(query, params);
      return result?.count || 0;
    } catch (error) {
      console.error('[CallNotesStorage] Count failed:', error);
      return 0;
    }
  }

  async processAndSaveSession(session: CallSession): Promise<string | null> {
    try {
      // Generate summary using Gemini
      const summary = await geminiSummaryService.generateSummary(session);
      
      // Save to storage
      return this.saveCallNote(session, summary, true);
    } catch (error) {
      console.error('[CallNotesStorage] Process session failed:', error);
      
      // Save with minimal summary if AI fails
      const fallbackSummary: CallSummary = {
        summary: 'Summary could not be generated.',
        keyPoints: ['AI summary unavailable'],
        languagesUsed: [{ source: session.sourceLang, target: session.targetLang }],
        wordCount: session.transcripts.filter(t => t.isFinal).length,
        generatedAt: Date.now(),
      };
      
      return this.saveCallNote(session, fallbackSummary, true);
    }
  }

  async clearAllNotes(): Promise<void> {
    await this.initialize();
    const db = await this.getDb();
    if (!db) return;

    try {
      await db.execAsync(`
        DELETE FROM call_transcripts;
        DELETE FROM call_notes;
      `);
      console.log('[CallNotesStorage] All notes cleared');
    } catch (error) {
      console.error('[CallNotesStorage] Clear failed:', error);
    }
  }
}

export const callNotesStorage = CallNotesStorageService.getInstance();
export default callNotesStorage;
