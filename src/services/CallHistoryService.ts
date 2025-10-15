import { collection, addDoc, query, orderBy, limit, getDocs, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../config/firebase';
import * as SQLite from 'expo-sqlite';

export interface CallHistoryEntry {
  id?: string;
  userId: string;
  contactId?: string;
  contactName: string;
  contactPhone?: string;
  type: 'outgoing' | 'incoming' | 'missed';
  duration: number;
  timestamp: number;
  status: 'completed' | 'missed' | 'declined' | 'failed';
  meetingId?: string;
  encrypted?: boolean;
}

class CallHistoryService {
  private db: SQLite.SQLiteDatabase | null = null;

  async initializeDatabase() {
    if (this.db) return this.db;

    try {
      this.db = await SQLite.openDatabaseAsync('call_history.db');

      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS call_history (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          contactId TEXT,
          contactName TEXT NOT NULL,
          contactPhone TEXT,
          type TEXT NOT NULL,
          duration INTEGER NOT NULL,
          timestamp INTEGER NOT NULL,
          status TEXT NOT NULL,
          meetingId TEXT,
          encrypted INTEGER DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_userId ON call_history(userId);
        CREATE INDEX IF NOT EXISTS idx_timestamp ON call_history(timestamp DESC);
      `);

      return this.db;
    } catch (error) {
      console.log('db_init_failed', error);
      throw error;
    }
  }

  async addCallToHistory(entry: CallHistoryEntry): Promise<string> {
    try {
      const firestoreData = {
        userId: entry.userId,
        contactId: entry.contactId || null,
        contactName: entry.contactName,
        contactPhone: entry.contactPhone || null,
        type: entry.type,
        duration: entry.duration,
        timestamp: serverTimestamp(),
        status: entry.status,
        meetingId: entry.meetingId || null,
        encrypted: entry.encrypted || false,
      };

      const docRef = await addDoc(
        collection(firestore, 'users', entry.userId, 'callHistory'),
        firestoreData
      );
      const callId = docRef.id;

      await this.cacheCallLocally({ ...entry, id: callId });

      console.log('call_history_saved', callId);
      return callId;
    } catch (error) {
      console.log('save_call_history_failed', error);
      
      try {
        const tempId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await this.cacheCallLocally({ ...entry, id: tempId });
        return tempId;
      } catch (cacheError) {
        console.log('cache_call_failed', cacheError);
        throw error;
      }
    }
  }

  private async cacheCallLocally(entry: CallHistoryEntry): Promise<void> {
    const db = await this.initializeDatabase();
    if (!db || !entry.id) return;

    try {
      await db.runAsync(
        `INSERT OR REPLACE INTO call_history 
        (id, userId, contactId, contactName, contactPhone, type, duration, timestamp, status, meetingId, encrypted) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          entry.id,
          entry.userId,
          entry.contactId || null,
          entry.contactName,
          entry.contactPhone || null,
          entry.type,
          entry.duration,
          entry.timestamp,
          entry.status,
          entry.meetingId || null,
          entry.encrypted ? 1 : 0,
        ]
      );
    } catch (error) {
      console.log('cache_call_locally_failed', error);
    }
  }

  async getCallHistory(userId: string, limitCount: number = 50): Promise<CallHistoryEntry[]> {
    try {
      const cachedCalls = await this.getCachedHistory(userId, limitCount);

      try {
        const q = query(
          collection(firestore, 'users', userId, 'callHistory'),
          orderBy('timestamp', 'desc'),
          limit(limitCount)
        );

        const snapshot = await getDocs(q);
        const calls: CallHistoryEntry[] = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            userId: data.userId,
            contactId: data.contactId,
            contactName: data.contactName,
            contactPhone: data.contactPhone,
            type: data.type,
            duration: data.duration,
            timestamp: data.timestamp?.toMillis() || Date.now(),
            status: data.status,
            meetingId: data.meetingId,
            encrypted: data.encrypted || false,
          };
        });

        await this.syncCacheWithFirestore(calls);

        return calls;
      } catch (firestoreError) {
        console.log('firestore_fetch_failed', firestoreError);
        return cachedCalls;
      }
    } catch (error) {
      console.log('get_call_history_failed', error);
      return [];
    }
  }

  private async getCachedHistory(userId: string, limitCount: number): Promise<CallHistoryEntry[]> {
    const db = await this.initializeDatabase();
    if (!db) return [];

    try {
      const result = await db.getAllAsync<{
        id: string;
        userId: string;
        contactId: string | null;
        contactName: string;
        contactPhone: string | null;
        type: string;
        duration: number;
        timestamp: number;
        status: string;
        meetingId: string | null;
        encrypted: number;
      }>(
        'SELECT * FROM call_history WHERE userId = ? ORDER BY timestamp DESC LIMIT ?',
        [userId, limitCount]
      );

      return result.map(row => ({
        id: row.id,
        userId: row.userId,
        contactId: row.contactId || undefined,
        contactName: row.contactName,
        contactPhone: row.contactPhone || undefined,
        type: row.type as 'outgoing' | 'incoming' | 'missed',
        duration: row.duration,
        timestamp: row.timestamp,
        status: row.status as 'completed' | 'missed' | 'declined' | 'failed',
        meetingId: row.meetingId || undefined,
        encrypted: row.encrypted === 1,
      }));
    } catch (error) {
      console.log('get_cached_history_failed', error);
      return [];
    }
  }

  private async syncCacheWithFirestore(calls: CallHistoryEntry[]): Promise<void> {
    for (const call of calls) {
      try {
        await this.cacheCallLocally(call);
      } catch (error) {
        console.log('sync_cache_failed', call.id);
      }
    }
  }

  async getCallStats(userId: string): Promise<{
    totalCalls: number;
    totalDuration: number;
    missedCalls: number;
    completedCalls: number;
  }> {
    const db = await this.initializeDatabase();
    if (!db) {
      return { totalCalls: 0, totalDuration: 0, missedCalls: 0, completedCalls: 0 };
    }

    try {
      const result = await db.getFirstAsync<{
        totalCalls: number;
        totalDuration: number;
        missedCalls: number;
        completedCalls: number;
      }>(
        `SELECT 
          COUNT(*) as totalCalls,
          SUM(duration) as totalDuration,
          SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) as missedCalls,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedCalls
        FROM call_history 
        WHERE userId = ?`,
        [userId]
      );

      return result || { totalCalls: 0, totalDuration: 0, missedCalls: 0, completedCalls: 0 };
    } catch (error) {
      console.log('get_call_stats_failed', error);
      return { totalCalls: 0, totalDuration: 0, missedCalls: 0, completedCalls: 0 };
    }
  }

  async clearCache(): Promise<void> {
    const db = await this.initializeDatabase();
    if (!db) return;

    try {
      await db.runAsync('DELETE FROM call_history');
      console.log('cache_cleared');
    } catch (error) {
      console.log('clear_cache_failed', error);
    }
  }
}

export const callHistoryService = new CallHistoryService();
