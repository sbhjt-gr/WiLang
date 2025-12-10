import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<void> | null = null;

export const initDatabase = async (): Promise<void> => {
  if (db) return;
  if (initPromise) return initPromise;

  initPromise = doInitDatabase();
  return initPromise;
};

const doInitDatabase = async (): Promise<void> => {
  try {
    db = await SQLite.openDatabaseAsync('wilang.db');
    
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS registered_contacts (
        phone TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        cached_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_registered_contacts_phone ON registered_contacts(phone);
      
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
      CREATE INDEX IF NOT EXISTS idx_call_history_userId ON call_history(userId);
      CREATE INDEX IF NOT EXISTS idx_call_history_timestamp ON call_history(timestamp DESC);
    `);
  } catch (error) {
    console.error('db_init_error', error);
    db = null;
    initPromise = null;
  }
};

export const getCachedRegisteredContacts = async (): Promise<Map<string, { userId: string; phone: string }> | null> => {
  try {
    if (!db) await initDatabase();
    if (!db) return null;

    const result = await db.getAllAsync<{ phone: string; user_id: string }>(
      'SELECT phone, user_id FROM registered_contacts'
    );

    if (!result || result.length === 0) return null;

    const contactsMap = new Map<string, { userId: string; phone: string }>();
    for (const row of result) {
      contactsMap.set(row.phone, { userId: row.user_id, phone: row.phone });
    }

    return contactsMap;
  } catch (error) {
    console.error('db_read_error', error);
    return null;
  }
};

export const setCachedRegisteredContacts = async (
  contactsMap: Map<string, { userId: string; phone: string }>
): Promise<void> => {
  try {
    if (!db) await initDatabase();
    if (!db) return;

    await db.execAsync('DELETE FROM registered_contacts');

    const timestamp = Date.now();
    
    for (const [phone, data] of contactsMap.entries()) {
      await db.runAsync(
        'INSERT OR REPLACE INTO registered_contacts (phone, user_id, cached_at) VALUES (?, ?, ?)',
        [phone, data.userId, timestamp]
      );
    }
  } catch (error) {
    console.error('db_write_error', error);
  }
};

export const clearCachedRegisteredContacts = async (): Promise<void> => {
  try {
    if (!db) await initDatabase();
    if (!db) return;

    await db.execAsync('DELETE FROM registered_contacts');
  } catch (error) {
    console.error('db_clear_error', error);
  }
};

export const clearAllUserData = async (): Promise<void> => {
  try {
    if (!db) await initDatabase();
    if (!db) return;

    await db.execAsync(`
      DELETE FROM registered_contacts;
      DELETE FROM call_history;
    `);
    console.log('all_user_data_cleared');
  } catch (error) {
    console.error('db_clear_all_error', error);
  }
};

export const getDatabase = (): SQLite.SQLiteDatabase | null => {
  return db;
};
