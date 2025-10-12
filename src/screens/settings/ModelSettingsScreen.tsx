import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '@rneui/themed';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import RNFS from 'react-native-fs';
import { RootStackParamList } from '../../types/navigation';
import { clearManualModel, clearManualVad, getCachedModelSettings, setManualModel, setManualVad, subscribeModelSettings, type ModelSettings } from '../../services/ModelSettings';
import { getCachedSpeechSettings, setSpeechEngine, subscribeSpeechSettings, type SpeechEngine, type SpeechRecognitionSettings } from '../../services/SpeechRecognitionSettings';
import { initWhisper, initWhisperVad } from 'whisper.rn';
import type { WhisperContext, WhisperVadContext, RealtimeTranscribeEvent } from 'whisper.rn';
type RealtimeTranscriberCtor = typeof import('whisper.rn/realtime-transcription').RealtimeTranscriber;
type AudioPcmStreamAdapterCtor = typeof import('whisper.rn/realtime-transcription/adapters/AudioPcmStreamAdapter').AudioPcmStreamAdapter;

const { RealtimeTranscriber } = require('whisper.rn/lib/commonjs/realtime-transcription') as {
  RealtimeTranscriber: RealtimeTranscriberCtor;
};

const { AudioPcmStreamAdapter } = require('whisper.rn/lib/commonjs/realtime-transcription/adapters/AudioPcmStreamAdapter') as {
  AudioPcmStreamAdapter: AudioPcmStreamAdapterCtor;
};

const STORAGE_DIR_URI = `${FileSystem.documentDirectory ?? ''}whisperlang/models`;

type NavigationProp = StackNavigationProp<RootStackParamList, 'ModelSettings'>;
type Props = {
  navigation: NavigationProp;
};

const formatBytes = (bytes?: number | null) => {
  if (!bytes || Number.isNaN(bytes)) {
    return '';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function ModelSettingsScreen({ navigation }: Props) {
  const [settings, setSettings] = useState<ModelSettings>(getCachedModelSettings());
  const [speechSettings, setSpeechSettings] = useState<SpeechRecognitionSettings>(getCachedSpeechSettings());
  const [modelFileSize, setModelFileSize] = useState<string>('');
  const [vadFileSize, setVadFileSize] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string>('');
  const testContextRef = useRef<WhisperContext | null>(null);
  const testVadContextRef = useRef<WhisperVadContext | null>(null);
  const testTranscriberRef = useRef<InstanceType<RealtimeTranscriberCtor> | null>(null);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    const unsubscribe = subscribeModelSettings((next) => {
      setSettings(next);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeSpeechSettings((next) => {
      setSpeechSettings(next);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const loadSizes = async () => {
      if (settings.manualModelPath) {
        try {
          const stat = await RNFS.stat(settings.manualModelPath);
          setModelFileSize(formatBytes(Number(stat.size)));
        } catch {
          setModelFileSize('');
        }
      } else {
        setModelFileSize('');
      }
      if (settings.manualVadPath) {
        try {
          const stat = await RNFS.stat(settings.manualVadPath);
          setVadFileSize(formatBytes(Number(stat.size)));
        } catch {
          setVadFileSize('');
        }
      } else {
        setVadFileSize('');
      }
    };
    loadSizes();
  }, [settings.manualModelPath, settings.manualVadPath]);

  const handleImportModel = useCallback(async () => {
    if (isProcessing) {
      return;
    }
    try {
      setIsProcessing(true);
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: false,
        type: '*/*',
      });
      if (!result.assets || result.canceled) {
        return;
      }
      const asset = result.assets[0];
      if (!asset?.uri) {
        Alert.alert('Import failed', 'Unable to access selected file.');
        return;
      }
      if (settings.manualModelPath) {
        try {
          await RNFS.unlink(settings.manualModelPath);
        } catch {
        }
      }
      await FileSystem.makeDirectoryAsync(STORAGE_DIR_URI, { intermediates: true });
      const safeName = asset.name || `whisper-model-${Date.now()}.bin`;
      const destinationUri = `${STORAGE_DIR_URI}/${safeName}`;
      await FileSystem.deleteAsync(destinationUri, { idempotent: true });
      await FileSystem.copyAsync({ from: asset.uri, to: destinationUri });
      const normalizedPath = destinationUri.replace('file://', '');
      await setManualModel(normalizedPath, safeName);
      Alert.alert('Model imported', `${safeName} is ready for use.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      Alert.alert('Import failed', message);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, settings.manualModelPath]);

  const handleImportVad = useCallback(async () => {
    if (isProcessing) {
      return;
    }
    try {
      setIsProcessing(true);
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: false,
        type: '*/*',
      });
      if (!result.assets || result.canceled) {
        return;
      }
      const asset = result.assets[0];
      if (!asset?.uri) {
        Alert.alert('Import failed', 'Unable to access selected file.');
        return;
      }
      if (settings.manualVadPath) {
        try {
          await RNFS.unlink(settings.manualVadPath);
        } catch {
        }
      }
      await FileSystem.makeDirectoryAsync(STORAGE_DIR_URI, { intermediates: true });
      const safeName = asset.name || `whisper-vad-${Date.now()}.bin`;
      const destinationUri = `${STORAGE_DIR_URI}/${safeName}`;
      await FileSystem.deleteAsync(destinationUri, { idempotent: true });
      await FileSystem.copyAsync({ from: asset.uri, to: destinationUri });
      const normalizedPath = destinationUri.replace('file://', '');
      await setManualVad(normalizedPath, safeName);
      Alert.alert('Detector imported', `${safeName} is ready for use.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      Alert.alert('Import failed', message);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, settings.manualVadPath]);

  const handleRemoveModel = useCallback(async () => {
    if (isProcessing) {
      return;
    }
    const confirm = await new Promise<boolean>((resolve) => {
      Alert.alert(
        'Remove model',
        'This will delete the imported model. Realtime subtitles will be unavailable until you import another model.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Confirm', style: 'destructive', onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });
    if (!confirm) {
      return;
    }
    try {
      setIsProcessing(true);
      if (settings.manualModelPath) {
        try {
          await RNFS.unlink(settings.manualModelPath);
        } catch {
        }
      }
      await clearManualModel();
      Alert.alert('Model removed', 'Import a model file before using realtime subtitles.');
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, settings.manualModelPath]);

  const handleRemoveVad = useCallback(async () => {
    if (isProcessing) {
      return;
    }
    const confirm = await new Promise<boolean>((resolve) => {
      Alert.alert(
        'Remove detector',
        'This will delete the imported detector. Realtime subtitles will be unavailable until you import another detector.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Confirm', style: 'destructive', onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });
    if (!confirm) {
      return;
    }
    try {
      setIsProcessing(true);
      if (settings.manualVadPath) {
        try {
          await RNFS.unlink(settings.manualVadPath);
        } catch {
        }
      }
      await clearManualVad();
      Alert.alert('Detector removed', 'Import a detector file before using realtime subtitles.');
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, settings.manualVadPath]);

  const modelStatusLabel = useMemo(() => {
    if (settings.manualModelName) {
      return `Using ${settings.manualModelName}`;
    }
    return 'No model imported';
  }, [settings.manualModelName]);

  const vadStatusLabel = useMemo(() => {
    if (settings.manualVadName) {
      return `Using ${settings.manualVadName}`;
    }
    return 'No detector imported';
  }, [settings.manualVadName]);

  const handleTestSpeech = useCallback(async () => {
    if (isTesting || !settings.manualModelPath || !settings.manualVadPath) {
      return;
    }
    try {
      setIsTesting(true);
      setTestResult('');

      if (testContextRef.current) {
        try {
          await testContextRef.current.release();
        } catch {}
        testContextRef.current = null;
      }
      if (testVadContextRef.current) {
        try {
          await testVadContextRef.current.release();
        } catch {}
        testVadContextRef.current = null;
      }
      if (testTranscriberRef.current) {
        try {
          await testTranscriberRef.current.stop();
          await testTranscriberRef.current.release();
        } catch {}
        testTranscriberRef.current = null;
      }

      const modelUri = `file://${settings.manualModelPath}`;
      const vadUri = `file://${settings.manualVadPath}`;

      const ctx = await initWhisper({ filePath: modelUri });
      testContextRef.current = ctx;

      const vadCtx = await initWhisperVad({ filePath: vadUri, useGpu: true });
      testVadContextRef.current = vadCtx;

      const audioStream = new AudioPcmStreamAdapter();

      const transcriber = new RealtimeTranscriber(
        {
          whisperContext: ctx,
          vadContext: vadCtx,
          audioStream,
          fs: RNFS,
        },
        {
          audioSliceSec: 3,
          audioMinSec: 0.5,
          vadPreset: 'default',
          autoSliceOnSpeechEnd: true,
          autoSliceThreshold: 0.3,
          transcribeOptions: {
            language: 'en',
            translate: false,
          },
        },
        {
          onTranscribe: (event: RealtimeTranscribeEvent) => {
            if (event.type !== 'transcribe') {
              return;
            }
            const result = event.data?.result?.trim();
            if (result) {
              setTestResult((prev) => (prev ? `${prev}\n${result}` : result));
            }
          },
          onError: (message: string | Error) => {
            const msg = typeof message === 'string' ? message : message.message;
            Alert.alert('transcription_error', msg);
          },
        },
      );

      testTranscriberRef.current = transcriber;
      await transcriber.start();

      Alert.alert('test_started', 'Speak into the microphone. Transcription will appear below.');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      Alert.alert('test_failed', message);
      setTestResult('');
      setIsTesting(false);
    }
  }, [isTesting, settings.manualModelPath, settings.manualVadPath]);

  const handleStopTest = useCallback(async () => {
    try {
      if (testTranscriberRef.current) {
        await testTranscriberRef.current.stop();
        await testTranscriberRef.current.release();
        testTranscriberRef.current = null;
      }
      if (testContextRef.current) {
        await testContextRef.current.release();
        testContextRef.current = null;
      }
      if (testVadContextRef.current) {
        await testVadContextRef.current.release();
        testVadContextRef.current = null;
      }
    } catch {}
    setIsTesting(false);
  }, []);

  const handleToggleSpeechEngine = useCallback(async (engine: SpeechEngine) => {
    await setSpeechEngine(engine);
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Speech Model</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <Text style={styles.headerSubtitle}>Manage the speech-to-text model used for realtime subtitles.</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.engineCard}>
          <Text style={styles.engineTitle}>Speech engine</Text>
          <Text style={styles.engineSubtitle}>Choose which engine to use for real-time subtitles.</Text>
          <View style={styles.engineButtons}>
            <TouchableOpacity
              style={[styles.engineButton, speechSettings.engine === 'whisper' ? styles.engineButtonActive : undefined]}
              onPress={() => handleToggleSpeechEngine('whisper')}
            >
              <Ionicons
                name="hardware-chip-outline"
                size={20}
                color={speechSettings.engine === 'whisper' ? '#6366f1' : '#6b7280'}
              />
              <Text style={[styles.engineButtonText, speechSettings.engine === 'whisper' ? styles.engineButtonTextActive : undefined]}>
                whisper_local
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.engineButton, speechSettings.engine === 'native' ? styles.engineButtonActive : undefined]}
              onPress={() => handleToggleSpeechEngine('native')}
            >
              <Ionicons
                name="cloud-outline"
                size={20}
                color={speechSettings.engine === 'native' ? '#6366f1' : '#6b7280'}
              />
              <Text style={[styles.engineButtonText, speechSettings.engine === 'native' ? styles.engineButtonTextActive : undefined]}>
                native_cloud
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Current model</Text>
          <Text style={styles.cardSubtitle}>{modelStatusLabel}</Text>
          {settings.manualModelPath ? (
            <Text style={styles.cardMeta} numberOfLines={2}>
              {settings.manualModelPath}
              {modelFileSize ? ` • ${modelFileSize}` : ''}
            </Text>
          ) : (
            <Text style={styles.cardMeta} numberOfLines={2}>
              Import a Whisper model file before starting a call to use subtitles.
            </Text>
          )}
        </View>

        <TouchableOpacity style={styles.actionCard} onPress={handleImportModel} disabled={isProcessing}>
          <LinearGradient
            colors={['#22d3ee', '#6366f1']}
            style={styles.actionGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="cloud-upload-outline" size={20} color="#ffffff" />
            <Text style={styles.actionText}>{isProcessing ? 'Processing...' : 'Import model file'}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, !settings.manualModelPath ? styles.secondaryButtonDisabled : undefined]}
          onPress={handleRemoveModel}
          disabled={!settings.manualModelPath || isProcessing}
        >
          <Text style={styles.secondaryButtonText}>Remove model</Text>
        </TouchableOpacity>

        <View style={styles.testCard}>
          <View style={styles.testHeader}>
            <Ionicons name="mic-outline" size={24} color="#6366f1" />
            <Text style={styles.testTitle}>Test speech output</Text>
          </View>
          <Text style={styles.testSubtitle}>
            Transcribe a test audio file to verify the model works correctly.
          </Text>
          <View style={styles.testButtonRow}>
            <TouchableOpacity
              style={[styles.testButton, (!settings.manualModelPath || !settings.manualVadPath || isTesting) ? styles.testButtonDisabled : undefined]}
              onPress={handleTestSpeech}
              disabled={!settings.manualModelPath || !settings.manualVadPath || isTesting}
            >
              <Ionicons name="play-circle-outline" size={20} color="#6366f1" />
              <Text style={styles.testButtonText}>start_test</Text>
            </TouchableOpacity>
            {isTesting ? (
              <TouchableOpacity style={styles.stopButton} onPress={handleStopTest}>
                <Ionicons name="stop-circle-outline" size={20} color="#ef4444" />
                <Text style={styles.stopButtonText}>stop</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {testResult ? (
            <View style={styles.testResultCard}>
              <Text style={styles.testResultLabel}>output</Text>
              <Text style={styles.testResultText}>{testResult}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Current detector</Text>
          <Text style={styles.cardSubtitle}>{vadStatusLabel}</Text>
          {settings.manualVadPath ? (
            <Text style={styles.cardMeta} numberOfLines={2}>
              {settings.manualVadPath}
              {vadFileSize ? ` • ${vadFileSize}` : ''}
            </Text>
          ) : (
            <Text style={styles.cardMeta} numberOfLines={2}>
              Import a VAD detector file to enable realtime speech detection.
            </Text>
          )}
        </View>

        <TouchableOpacity style={styles.actionCard} onPress={handleImportVad} disabled={isProcessing}>
          <LinearGradient
            colors={['#14b8a6', '#6366f1']}
            style={styles.actionGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="cloud-upload-outline" size={20} color="#ffffff" />
            <Text style={styles.actionText}>{isProcessing ? 'Processing...' : 'Import detector file'}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, !settings.manualVadPath ? styles.secondaryButtonDisabled : undefined]}
          onPress={handleRemoveVad}
          disabled={!settings.manualVadPath || isProcessing}
        >
          <Text style={styles.secondaryButtonText}>Remove detector</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: 56,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerPlaceholder: {
    width: 40,
    height: 40,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
  },
  content: {
    padding: 24,
    gap: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 8,
  },
  cardMeta: {
    fontSize: 12,
    color: '#6b7280',
  },
  actionCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 12,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  secondaryButton: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonDisabled: {
    opacity: 0.5,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  testCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  testTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  testSubtitle: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 16,
  },
  testButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  testButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  testButtonDisabled: {
    opacity: 0.5,
  },
  testButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6366f1',
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  stopButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ef4444',
  },
  testResultCard: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  testResultLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  testResultText: {
    fontSize: 14,
    color: '#1f2937',
    lineHeight: 20,
  },
  engineCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  engineTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  engineSubtitle: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 16,
  },
  engineButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  engineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  engineButtonActive: {
    backgroundColor: '#eef2ff',
    borderColor: '#6366f1',
  },
  engineButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  engineButtonTextActive: {
    color: '#6366f1',
  },
});
