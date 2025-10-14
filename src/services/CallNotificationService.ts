import { collection, addDoc, query, where, onSnapshot, updateDoc, doc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { firestore, auth } from '../config/firebase';

export interface CallNotification {
  id: string;
  callerId: string;
  callerName: string;
  callerPhone: string;
  recipientId: string;
  meetingId: string;
  status: 'ringing' | 'accepted' | 'declined' | 'missed';
  createdAt: Timestamp;
}

let unsubscribe: (() => void) | null = null;

export const sendCallNotification = async (
  recipientId: string,
  callerName: string,
  callerPhone: string,
  meetingId: string
): Promise<string | null> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;

    const callRef = await addDoc(collection(firestore, 'call_notifications'), {
      callerId: currentUser.uid,
      callerName,
      callerPhone,
      recipientId,
      meetingId,
      status: 'ringing',
      createdAt: serverTimestamp()
    });

    console.log('call_notification_sent', callRef.id);
    return callRef.id;
  } catch (error) {
    console.error('call_notification_error', error);
    return null;
  }
};

export const listenForIncomingCalls = (
  onIncomingCall: (call: CallNotification) => void
) => {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  if (unsubscribe) {
    unsubscribe();
  }

  const q = query(
    collection(firestore, 'call_notifications'),
    where('recipientId', '==', currentUser.uid),
    where('status', '==', 'ringing')
  );

  unsubscribe = onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const data = change.doc.data();
        const call: CallNotification = {
          id: change.doc.id,
          callerId: data.callerId,
          callerName: data.callerName,
          callerPhone: data.callerPhone,
          recipientId: data.recipientId,
          meetingId: data.meetingId,
          status: data.status,
          createdAt: data.createdAt
        };
        onIncomingCall(call);
      }
    });
  });
};

export const updateCallStatus = async (
  callId: string,
  status: 'accepted' | 'declined' | 'missed'
): Promise<void> => {
  try {
    const callRef = doc(firestore, 'call_notifications', callId);
    await updateDoc(callRef, { status });
    console.log('call_status_updated', { callId, status });
  } catch (error) {
    console.error('call_status_update_error', error);
  }
};

export const deleteCallNotification = async (callId: string): Promise<void> => {
  try {
    const callRef = doc(firestore, 'call_notifications', callId);
    await deleteDoc(callRef);
    console.log('call_notification_deleted', callId);
  } catch (error) {
    console.error('call_notification_delete_error', error);
  }
};

export const stopListeningForCalls = () => {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
};
