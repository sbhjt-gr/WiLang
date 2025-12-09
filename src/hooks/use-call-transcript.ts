/**
 * useCallTranscript Hook
 * Manages background transcript collection during calls
 */

import { useRef, useEffect, useCallback } from 'react';
import { callTranscriptService } from '../services/call-transcript';
import { callNotesStorage } from '../services/call-notes-storage';
import { CallType, CallParticipant } from '../types/call-summary';

interface UseCallTranscriptParams {
  callType: CallType;
  sourceLang: string;
  targetLang: string;
  participants?: CallParticipant[];
  meetingId?: string;
  enabled?: boolean;
}

interface UseCallTranscriptReturn {
  sessionId: string | null;
  addTranscript: (params: {
    speaker: 'local' | 'remote';
    speakerName?: string;
    sourceText: string;
    translatedText?: string;
    isFinal?: boolean;
  }) => void;
  updateParticipant: (participant: CallParticipant) => void;
  endSessionAndSave: () => Promise<string | null>;
  getTranscriptCount: () => number;
}

export function useCallTranscript({
  callType,
  sourceLang,
  targetLang,
  participants = [],
  meetingId,
  enabled = true,
}: UseCallTranscriptParams): UseCallTranscriptReturn {
  const sessionIdRef = useRef<string | null>(null);
  const hasStartedRef = useRef(false);

  // Start session on mount
  useEffect(() => {
    if (!enabled || hasStartedRef.current) return;

    hasStartedRef.current = true;
    sessionIdRef.current = callTranscriptService.startSession({
      type: callType,
      sourceLang,
      targetLang,
      participants,
      meetingId,
    });

    console.log('[useCallTranscript] Session started:', sessionIdRef.current);

    return () => {
      // Don't automatically end on unmount - let the component decide when to save
    };
  }, [enabled, callType, sourceLang, targetLang, meetingId]);

  // Update participants when they change
  useEffect(() => {
    if (!sessionIdRef.current) return;

    for (const participant of participants) {
      callTranscriptService.updateParticipant(participant);
    }
  }, [participants]);

  const addTranscript = useCallback((params: {
    speaker: 'local' | 'remote';
    speakerName?: string;
    sourceText: string;
    translatedText?: string;
    isFinal?: boolean;
  }) => {
    if (!sessionIdRef.current || !params.sourceText?.trim()) return;

    callTranscriptService.addTranscript({
      speaker: params.speaker,
      speakerName: params.speakerName,
      sourceText: params.sourceText,
      translatedText: params.translatedText,
      sourceLang,
      targetLang,
      isFinal: params.isFinal ?? true,
    });
  }, [sourceLang, targetLang]);

  const updateParticipant = useCallback((participant: CallParticipant) => {
    callTranscriptService.updateParticipant(participant);
  }, []);

  const endSessionAndSave = useCallback(async (): Promise<string | null> => {
    if (!sessionIdRef.current) {
      console.log('[useCallTranscript] No active session to end');
      return null;
    }

    const session = callTranscriptService.endSession();
    sessionIdRef.current = null;
    hasStartedRef.current = false;

    if (!session) {
      console.log('[useCallTranscript] Session ended without data');
      return null;
    }

    const transcriptCount = session.transcripts.filter(t => t.isFinal).length;
    console.log('[useCallTranscript] Session ended with', transcriptCount, 'transcripts');

    // Only save if we have meaningful transcripts
    if (transcriptCount < 2) {
      console.log('[useCallTranscript] Too few transcripts to save');
      return null;
    }

    try {
      console.log('[useCallTranscript] Processing session for AI summary...');
      const noteId = await callNotesStorage.processAndSaveSession(session);
      console.log('[useCallTranscript] Saved note:', noteId);
      return noteId;
    } catch (error) {
      console.error('[useCallTranscript] Failed to save session:', error);
      return null;
    }
  }, []);

  const getTranscriptCount = useCallback((): number => {
    return callTranscriptService.getTranscriptCount();
  }, []);

  return {
    sessionId: sessionIdRef.current,
    addTranscript,
    updateParticipant,
    endSessionAndSave,
    getTranscriptCount,
  };
}

export default useCallTranscript;
