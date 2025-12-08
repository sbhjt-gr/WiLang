/**
 * Palabra AI Real-time Translation Demo Modal
 *
 * Live speech-to-speech translation demo using Palabra AI and LiveKit.
 * Features:
 * - Microphone capture and streaming
 * - Real-time transcription display
 * - Real-time translation display
 * - Translated audio playback
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { registerGlobals } from '@livekit/react-native';
import { mediaDevices, MediaStream } from '@livekit/react-native-webrtc';

import { useTheme } from '../theme';
import {
  PalabraTranslationService,
  SourceLangCode,
  TargetLangCode,
  ConnectionState,
  TranscriptionData,
  TranslationData,
} from '../services/palabra';
import { RemoteTrackInfo } from '../services/palabra/PalabraLiveKitTransport';
import {
  PALABRA_CLIENT_ID,
  PALABRA_CLIENT_SECRET,
  PALABRA_API_BASE_URL,
} from '@env';

// Register LiveKit globals on module load
registerGlobals();

const SOURCE_LANG_OPTIONS: Array<{ id: SourceLangCode; label: string; flag: string }> = [
  { id: 'auto', label: 'Auto Detect', flag: 'AUTO' },
  { id: 'ar', label: 'Arabic', flag: 'AR' },
  { id: 'be', label: 'Belarusian', flag: 'BE' },
  { id: 'bg', label: 'Bulgarian', flag: 'BG' },
  { id: 'ca', label: 'Catalan', flag: 'CA' },
  { id: 'cs', label: 'Czech', flag: 'CS' },
  { id: 'cy', label: 'Welsh', flag: 'CY' },
  { id: 'da', label: 'Danish', flag: 'DA' },
  { id: 'de', label: 'German', flag: 'DE' },
  { id: 'el', label: 'Greek', flag: 'EL' },
  { id: 'en', label: 'English', flag: 'EN' },
  { id: 'es', label: 'Spanish', flag: 'ES' },
  { id: 'et', label: 'Estonian', flag: 'ET' },
  { id: 'fi', label: 'Finnish', flag: 'FI' },
  { id: 'fr', label: 'French', flag: 'FR' },
  { id: 'gl', label: 'Galician', flag: 'GL' },
  { id: 'he', label: 'Hebrew', flag: 'HE' },
  { id: 'hi', label: 'Hindi', flag: 'HI' },
  { id: 'hr', label: 'Croatian', flag: 'HR' },
  { id: 'hu', label: 'Hungarian', flag: 'HU' },
  { id: 'id', label: 'Indonesian', flag: 'ID' },
  { id: 'it', label: 'Italian', flag: 'IT' },
  { id: 'ja', label: 'Japanese', flag: 'JA' },
  { id: 'ko', label: 'Korean', flag: 'KO' },
  { id: 'lt', label: 'Lithuanian', flag: 'LT' },
  { id: 'lv', label: 'Latvian', flag: 'LV' },
  { id: 'ms', label: 'Malay', flag: 'MS' },
  { id: 'nl', label: 'Dutch', flag: 'NL' },
  { id: 'no', label: 'Norwegian', flag: 'NO' },
  { id: 'pl', label: 'Polish', flag: 'PL' },
  { id: 'pt', label: 'Portuguese', flag: 'PT' },
  { id: 'ro', label: 'Romanian', flag: 'RO' },
  { id: 'ru', label: 'Russian', flag: 'RU' },
  { id: 'sk', label: 'Slovak', flag: 'SK' },
  { id: 'sl', label: 'Slovenian', flag: 'SL' },
  { id: 'sv', label: 'Swedish', flag: 'SV' },
  { id: 'sw', label: 'Swahili', flag: 'SW' },
  { id: 'ta', label: 'Tamil', flag: 'TA' },
  { id: 'th', label: 'Thai', flag: 'TH' },
  { id: 'tr', label: 'Turkish', flag: 'TR' },
  { id: 'uk', label: 'Ukrainian', flag: 'UK' },
  { id: 'ur', label: 'Urdu', flag: 'UR' },
  { id: 'vi', label: 'Vietnamese', flag: 'VI' },
  { id: 'zh', label: 'Chinese (Simplified)', flag: 'ZH' },
];

const TARGET_LANG_OPTIONS: Array<{ id: TargetLangCode; label: string; flag: string }> = [
  { id: 'ar-sa', label: 'Arabic', flag: 'AR' },
  { id: 'be', label: 'Belarusian', flag: 'BE' },
  { id: 'bg', label: 'Bulgarian', flag: 'BG' },
  { id: 'ca', label: 'Catalan', flag: 'CA' },
  { id: 'cs', label: 'Czech', flag: 'CS' },
  { id: 'cy', label: 'Welsh', flag: 'CY' },
  { id: 'da', label: 'Danish', flag: 'DA' },
  { id: 'de', label: 'German', flag: 'DE' },
  { id: 'el', label: 'Greek', flag: 'EL' },
  { id: 'en-us', label: 'English (US)', flag: 'US' },
  { id: 'en-gb', label: 'English (UK)', flag: 'GB' },
  { id: 'es', label: 'Spanish', flag: 'ES' },
  { id: 'es-mx', label: 'Spanish (Mexico)', flag: 'MX' },
  { id: 'et', label: 'Estonian', flag: 'ET' },
  { id: 'fi', label: 'Finnish', flag: 'FI' },
  { id: 'fr', label: 'French', flag: 'FR' },
  { id: 'fr-ca', label: 'French (Canada)', flag: 'CA' },
  { id: 'gl', label: 'Galician', flag: 'GL' },
  { id: 'he', label: 'Hebrew', flag: 'HE' },
  { id: 'hi', label: 'Hindi', flag: 'HI' },
  { id: 'hr', label: 'Croatian', flag: 'HR' },
  { id: 'hu', label: 'Hungarian', flag: 'HU' },
  { id: 'id', label: 'Indonesian', flag: 'ID' },
  { id: 'it', label: 'Italian', flag: 'IT' },
  { id: 'ja', label: 'Japanese', flag: 'JA' },
  { id: 'ko', label: 'Korean', flag: 'KO' },
  { id: 'lt', label: 'Lithuanian', flag: 'LT' },
  { id: 'lv', label: 'Latvian', flag: 'LV' },
  { id: 'ms', label: 'Malay', flag: 'MS' },
  { id: 'nl', label: 'Dutch', flag: 'NL' },
  { id: 'no', label: 'Norwegian', flag: 'NO' },
  { id: 'pl', label: 'Polish', flag: 'PL' },
  { id: 'pt-br', label: 'Portuguese (Brazil)', flag: 'BR' },
  { id: 'pt-pt', label: 'Portuguese', flag: 'PT' },
  { id: 'ro', label: 'Romanian', flag: 'RO' },
  { id: 'ru', label: 'Russian', flag: 'RU' },
  { id: 'sk', label: 'Slovak', flag: 'SK' },
  { id: 'sl', label: 'Slovenian', flag: 'SL' },
  { id: 'sv', label: 'Swedish', flag: 'SV' },
  { id: 'sw', label: 'Swahili', flag: 'SW' },
  { id: 'ta', label: 'Tamil', flag: 'TA' },
  { id: 'th', label: 'Thai', flag: 'TH' },
  { id: 'tr', label: 'Turkish', flag: 'TR' },
  { id: 'uk', label: 'Ukrainian', flag: 'UK' },
  { id: 'ur', label: 'Urdu', flag: 'UR' },
  { id: 'vi', label: 'Vietnamese', flag: 'VI' },
  { id: 'zh', label: 'Chinese (Simplified)', flag: 'ZH' },
  { id: 'zh-tw', label: 'Chinese (Traditional)', flag: 'TW' },
];

type Props = {
  visible: boolean;
  onClose: () => void;
};

export const PalabraTranslationDemoModal: React.FC<Props> = ({ visible, onClose }) => {
  const { colors } = useTheme();

  // State
  const [sourceLanguage, setSourceLanguage] = useState<SourceLangCode>('auto');
  const [targetLanguage, setTargetLanguage] = useState<TargetLangCode>('en-us');
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [statusMessage, setStatusMessage] = useState('Ready');
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [showTargetPicker, setShowTargetPicker] = useState(false);

  // Transcription/Translation state
  const [transcription, setTranscription] = useState('');
  const [partialTranscription, setPartialTranscription] = useState('');
  const [translation, setTranslation] = useState('');
  const [partialTranslation, setPartialTranslation] = useState('');

  // Refs
  const serviceRef = useRef<PalabraTranslationService | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const isPalabraConfigured = Boolean(PALABRA_CLIENT_ID && PALABRA_CLIENT_SECRET);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setError(null);
      setStatusMessage('Ready');
      setTranscription('');
      setPartialTranscription('');
      setTranslation('');
      setPartialTranslation('');
    }
  }, [visible]);

  const cleanup = useCallback(async () => {
    try {
      if (serviceRef.current) {
        await serviceRef.current.cleanup();
        serviceRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    } catch (err) {
      console.error('[PalabraDemo] Cleanup error:', err);
    }
  }, []);

  const handleTranscription = useCallback((data: TranscriptionData) => {
    if (data.isFinal) {
      setTranscription((prev) => (prev ? `${prev}\n${data.text}` : data.text));
      setPartialTranscription('');
    } else {
      setPartialTranscription(data.text);
    }
  }, []);

  const handleTranslation = useCallback((data: TranslationData) => {
    if (data.isFinal) {
      setTranslation((prev) => (prev ? `${prev}\n${data.text}` : data.text));
      setPartialTranslation('');
    } else {
      setPartialTranslation(data.text);
    }
  }, []);

  const handleRemoteTrack = useCallback((tracks: RemoteTrackInfo[]) => {
    console.log('[PalabraDemo] Remote tracks updated:', tracks.length);
    // Audio will be played automatically by LiveKit
  }, []);

  const handleConnectionStateChange = useCallback((state: ConnectionState) => {
    setConnectionState(state);
    switch (state) {
      case 'connecting':
        setStatusMessage('Connecting...');
        break;
      case 'connected':
        setStatusMessage('Connected - Speak now!');
        break;
      case 'reconnecting':
        setStatusMessage('Reconnecting...');
        break;
      case 'disconnected':
        setStatusMessage('Disconnected');
        setIsListening(false);
        break;
    }
  }, []);

  const handleError = useCallback((err: Error) => {
    console.error('[PalabraDemo] Error:', err);
    setError(err.message);
  }, []);

  const startListening = useCallback(async () => {
    setError(null);
    setIsConnecting(true);
    setTranscription('');
    setPartialTranscription('');
    setTranslation('');
    setPartialTranslation('');

    try {
      // Get microphone stream
      setStatusMessage('Accessing microphone...');
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      streamRef.current = stream as MediaStream;

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error('No audio track available');
      }

      // Create service
      const service = new PalabraTranslationService({
        auth: {
          clientId: PALABRA_CLIENT_ID,
          clientSecret: PALABRA_CLIENT_SECRET,
        },
        sourceLanguage,
        targetLanguage,
        apiBaseUrl: PALABRA_API_BASE_URL || 'https://api.palabra.ai',
        onTranscription: handleTranscription,
        onTranslation: handleTranslation,
        onConnectionStateChange: handleConnectionStateChange,
        onRemoteTrack: handleRemoteTrack,
        onError: handleError,
      });

      serviceRef.current = service;

      // Start translation with audio track (cast to standard MediaStreamTrack)
      setStatusMessage('Creating session...');
      const success = await service.startTranslation(audioTracks[0] as unknown as MediaStreamTrack);

      if (success) {
        const session = service.getSession();
        setSessionId(session?.id || null);
        setIsListening(true);
      } else {
        throw new Error('Failed to start translation');
      }
    } catch (err) {
      console.error('[PalabraDemo] Start error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start');
      setStatusMessage('Error');
      await cleanup();
    } finally {
      setIsConnecting(false);
    }
  }, [
    sourceLanguage,
    targetLanguage,
    handleTranscription,
    handleTranslation,
    handleConnectionStateChange,
    handleRemoteTrack,
    handleError,
    cleanup,
  ]);

  const stopListening = useCallback(async () => {
    setStatusMessage('Stopping...');
    await cleanup();
    setIsListening(false);
    setSessionId(null);
    setConnectionState('disconnected');
    setStatusMessage('Stopped');
  }, [cleanup]);

  const handleClose = useCallback(async () => {
    await cleanup();
    setIsListening(false);
    setSessionId(null);
    setConnectionState('disconnected');
    onClose();
  }, [cleanup, onClose]);

  const getStatusColor = (): string => {
    switch (connectionState) {
      case 'connected':
        return '#22c55e';
      case 'connecting':
      case 'reconnecting':
        return '#f59e0b';
      default:
        return colors.textSecondary;
    }
  };

  const renderLanguagePicker = (
    isSource: boolean,
    pickerVisible: boolean,
    closePicker: () => void
  ) => {
    const options = isSource ? SOURCE_LANG_OPTIONS : TARGET_LANG_OPTIONS;
    const currentValue = isSource ? sourceLanguage : targetLanguage;

    return (
      <Modal transparent visible={pickerVisible} animationType="fade">
        <View style={styles.pickerBackdrop}>
          <TouchableOpacity
            style={styles.pickerOverlay}
            activeOpacity={1}
            onPress={closePicker}
          />
          <View style={[styles.pickerCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.pickerTitle, { color: colors.text }]}>
              {isSource ? 'Source Language' : 'Target Language'}
            </Text>
            <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
              {options.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.pickerItem}
                  onPress={() => {
                    if (isSource) {
                      setSourceLanguage(item.id as SourceLangCode);
                    } else {
                      setTargetLanguage(item.id as TargetLangCode);
                    }
                    closePicker();
                  }}
                >
                  <Text style={styles.pickerFlag}>{item.flag}</Text>
                  <Text style={[styles.pickerItemText, { color: colors.text }]}>
                    {item.label}
                  </Text>
                  {currentValue === item.id && (
                    <Ionicons name="checkmark" size={18} color="#8b5cf6" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.pickerDone, { backgroundColor: '#8b5cf6' }]}
              onPress={closePicker}
            >
              <Text style={styles.pickerDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <Modal transparent visible={visible} animationType="slide">
      <View style={[styles.container, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={[styles.title, { color: colors.text }]}>
                Palabra AI Live
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Real-time Translation
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Status */}
            <View style={[styles.statusCard, { backgroundColor: colors.surface }]}>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
                <Text style={[styles.statusText, { color: getStatusColor() }]}>
                  {statusMessage}
                </Text>
                {isListening && (
                  <View style={styles.listeningIndicator}>
                    <Ionicons name="mic" size={16} color="#22c55e" />
                  </View>
                )}
              </View>
              {sessionId && (
                <Text style={[styles.sessionId, { color: colors.textSecondary }]}>
                  Session: {sessionId.substring(0, 8)}...
                </Text>
              )}
            </View>

            {/* Language Selection */}
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <View style={styles.langRow}>
                <TouchableOpacity
                  style={[styles.langButton, { borderColor: colors.border }]}
                  onPress={() => setShowSourcePicker(true)}
                  disabled={isListening}
                >
                  <Text style={styles.langFlag}>
                    {SOURCE_LANG_OPTIONS.find((l) => l.id === sourceLanguage)?.flag}
                  </Text>
                  <Text style={[styles.langText, { color: colors.text }]}>
                    {SOURCE_LANG_OPTIONS.find((l) => l.id === sourceLanguage)?.label}
                  </Text>
                </TouchableOpacity>

                <Ionicons name="arrow-forward" size={20} color="#8b5cf6" />

                <TouchableOpacity
                  style={[styles.langButton, { borderColor: colors.border }]}
                  onPress={() => setShowTargetPicker(true)}
                  disabled={isListening}
                >
                  <Text style={styles.langFlag}>
                    {TARGET_LANG_OPTIONS.find((l) => l.id === targetLanguage)?.flag}
                  </Text>
                  <Text style={[styles.langText, { color: colors.text }]}>
                    {TARGET_LANG_OPTIONS.find((l) => l.id === targetLanguage)?.label}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Transcription */}
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <View style={styles.cardHeader}>
                <Ionicons name="mic-outline" size={18} color="#8b5cf6" />
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  Original Speech
                </Text>
              </View>
              <View style={styles.textBox}>
                <Text style={[styles.transcriptText, { color: colors.text }]}>
                  {transcription || partialTranscription || 'Start speaking...'}
                </Text>
                {partialTranscription && transcription && (
                  <Text style={[styles.partialText, { color: colors.textSecondary }]}>
                    {partialTranscription}
                  </Text>
                )}
              </View>
            </View>

            {/* Translation */}
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <View style={styles.cardHeader}>
                <Ionicons name="language-outline" size={18} color="#8b5cf6" />
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  Translation
                </Text>
              </View>
              <View style={styles.textBox}>
                <Text style={[styles.translationText, { color: colors.text }]}>
                  {translation || partialTranslation || 'Translation will appear here...'}
                </Text>
                {partialTranslation && translation && (
                  <Text style={[styles.partialText, { color: colors.textSecondary }]}>
                    {partialTranslation}
                  </Text>
                )}
              </View>
            </View>

            {/* Error */}
            {error && (
              <View style={[styles.errorCard, { backgroundColor: '#fef2f2' }]}>
                <Ionicons name="alert-circle" size={20} color="#dc2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Config warning */}
            {!isPalabraConfigured && (
              <View style={[styles.infoCard, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="information-circle" size={20} color="#d97706" />
                <Text style={styles.infoText}>
                  Add PALABRA_CLIENT_ID and PALABRA_CLIENT_SECRET to .env file.
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Action Button */}
          <View style={styles.footer}>
            {isListening ? (
              <TouchableOpacity
                style={[styles.button, styles.stopButton]}
                onPress={stopListening}
              >
                <Ionicons name="stop-circle" size={24} color="#fff" />
                <Text style={styles.buttonText}>Stop</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.startButton,
                  (!isPalabraConfigured || isConnecting) && styles.buttonDisabled,
                ]}
                onPress={startListening}
                disabled={!isPalabraConfigured || isConnecting}
              >
                {isConnecting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="mic" size={24} color="#fff" />
                    <Text style={styles.buttonText}>Start Listening</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {renderLanguagePicker(true, showSourcePicker, () => setShowSourcePicker(false))}
      {renderLanguagePicker(false, showTargetPicker, () => setShowTargetPicker(false))}
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    minHeight: 400,
    paddingBottom: 34,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
    flexGrow: 1,
  },
  statusCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  listeningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionId: {
    fontSize: 11,
    marginTop: 6,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  langButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  langFlag: {
    fontSize: 20,
  },
  langText: {
    fontSize: 14,
    fontWeight: '500',
  },
  textBox: {
    minHeight: 80,
  },
  transcriptText: {
    fontSize: 16,
    lineHeight: 24,
  },
  translationText: {
    fontSize: 16,
    lineHeight: 24,
  },
  partialText: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 8,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    gap: 10,
  },
  errorText: {
    flex: 1,
    color: '#dc2626',
    fontSize: 14,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    gap: 10,
  },
  infoText: {
    flex: 1,
    color: '#92400e',
    fontSize: 14,
  },
  footer: {
    padding: 20,
    paddingTop: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 10,
  },
  startButton: {
    backgroundColor: '#8b5cf6',
  },
  stopButton: {
    backgroundColor: '#dc2626',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  // Picker styles
  pickerBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  pickerCard: {
    width: '85%',
    maxHeight: '70%',
    borderRadius: 20,
    padding: 20,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  pickerScroll: {
    maxHeight: 300,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 12,
  },
  pickerFlag: {
    fontSize: 24,
  },
  pickerItemText: {
    flex: 1,
    fontSize: 16,
  },
  pickerDone: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  pickerDoneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PalabraTranslationDemoModal;
