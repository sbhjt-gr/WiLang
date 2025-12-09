import AsyncStorage from '@react-native-async-storage/async-storage';

const CALL_KEY = 'pending_incoming_call';

export interface StoredCallData {
  callId: string;
  callerName: string;
  callerPhone?: string;
  callerId?: string;
  callerSocketId?: string;
  meetingId?: string;
  meetingToken?: string;
  timestamp: number;
}

export async function storeIncomingCall(data: Omit<StoredCallData, 'timestamp'>): Promise<void> {
  try {
    const stored: StoredCallData = { ...data, timestamp: Date.now() };
    await AsyncStorage.setItem(CALL_KEY, JSON.stringify(stored));
    console.log('call_stored');
  } catch (err) {
    console.log('call_store_error', err);
  }
}

export async function getIncomingCall(): Promise<StoredCallData | null> {
  try {
    const raw = await AsyncStorage.getItem(CALL_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as StoredCallData;
    const expired = Date.now() - data.timestamp > 60000;
    if (expired) {
      await clearIncomingCall();
      return null;
    }
    return data;
  } catch (err) {
    console.log('call_get_error', err);
    return null;
  }
}

export async function clearIncomingCall(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CALL_KEY);
    console.log('call_cleared');
  } catch (err) {
    console.log('call_clear_error', err);
  }
}
