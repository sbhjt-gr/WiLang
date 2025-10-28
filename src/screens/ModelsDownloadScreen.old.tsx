import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { WhisperLanguage, SUPPORTED_LANGUAGES } from '../services/whisper/ModelPreferences';
import { SubtitlePreferences, type ExpoSpeechMode } from '../services/SubtitlePreferences';

export default function ModelsDownloadScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [expoLanguage, setExpoLanguage] = useState<WhisperLanguage>('auto');
  const [expoMode, setExpoMode] = useState<ExpoSpeechMode>('cloud');

  useEffect(() => {
    SubtitlePreferences.getExpoMode().then(setExpoMode);
    SubtitlePreferences.getExpoLanguage().then(setExpoLanguage);
  }, []);

  const handleSelectExpoMode = async (value: ExpoSpeechMode) => {
    setExpoMode(value);
    await SubtitlePreferences.setExpoMode(value);
  };

  const handleSelectLanguage = async (languageCode: WhisperLanguage) => {
    await SubtitlePreferences.setExpoLanguage(languageCode);
    setExpoLanguage(languageCode);
  };
          },
        }));
      },
      onProgress: (modelName, progress) => {
        setModelStates(prev => ({
          ...prev,
          [modelName]: {
            ...prev[modelName],
            isDownloading: true,
            progress,
          },
        }));
      },
      onComplete: (modelName) => {
        setModelStates(prev => ({
          ...prev,
          [modelName]: {
            isDownloaded: true,
            isDownloading: false,
            isLoading: false,
          },
        }));
      },
      onError: (modelName, error) => {
        setModelStates(prev => ({
          ...prev,
          [modelName]: {
            ...prev[modelName],
            isDownloading: false,
          },
        }));
      },
      onCancelled: (modelName) => {
        setModelStates(prev => ({
          ...prev,
          [modelName]: {
            ...prev[modelName],
            isDownloading: false,
            progress: undefined,
          },
        }));
      },
    });
  }, []);

  const handleSelectEngine = async (value: SubtitleEngine) => {
    setEngine(value);
    await SubtitlePreferences.setEngine(value);
  };

  const handleSelectExpoMode = async (value: ExpoSpeechMode) => {
    setExpoMode(value);
    await SubtitlePreferences.setExpoMode(value);
  };

  const handleDownload = async (modelName: string) => {
    setModelStates(prev => ({
      ...prev,
      [modelName]: {
        ...prev[modelName],
        isLoading: true,
      },
    }));

    try {
      await whisperModelDownloader.startDownload(modelName);
    } catch (error) {
      setModelStates(prev => ({
        ...prev,
        [modelName]: {
          ...prev[modelName],
          isLoading: false,
        },
      }));

      await checkModels();
    }
  };

  const handleCancel = async (modelName: string) => {
    try {
      await whisperModelDownloader.cancelDownload(modelName);
    } catch (error) {
    }
  };

  const handleDelete = async (modelName: string) => {
    try {
      await whisperModelDownloader.deleteModel(modelName);
      await checkModels();
    } catch (error) {
    }
  };

  const handleSelectModel = async (modelName: string) => {
    if (['tiny', 'base', 'small', 'medium', 'large-v3'].includes(modelName)) {
      await ModelPreferences.setPreferredModel(modelName as WhisperModelVariant);
      setPreferredModel(modelName as WhisperModelVariant);
    }
  };

  const handleSelectLanguage = async (languageCode: WhisperLanguage) => {
    if (engine === 'whisper') {
      await ModelPreferences.setPreferredLanguage(languageCode);
      setWhisperLanguage(languageCode);
    } else {
      await SubtitlePreferences.setExpoLanguage(languageCode);
      setExpoLanguage(languageCode);
    }
  };

  const selectedLanguage = useMemo(
    () => (engine === 'whisper' ? whisperLanguage : expoLanguage),
    [engine, expoLanguage, whisperLanguage],
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Subtitle Models</Text>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.engineSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Subtitle Engine</Text>
          <View style={styles.engineRow}>
            <TouchableOpacity
              style={[styles.engineOption, engine === 'expo' && styles.engineOptionActive, { backgroundColor: colors.surface }]}
              onPress={() => handleSelectEngine('expo')}
            >
              <Ionicons name="cloud-outline" size={20} color={engine === 'expo' ? '#8b5cf6' : colors.textSecondary} />
              <Text style={[styles.engineOptionText, { color: colors.text }]}>Expo Speech</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.engineOption, engine === 'whisper' && styles.engineOptionActive, { backgroundColor: colors.surface }]}
              onPress={() => handleSelectEngine('whisper')}
            >
              <Ionicons name="hardware-chip-outline" size={20} color={engine === 'whisper' ? '#8b5cf6' : colors.textSecondary} />
              <Text style={[styles.engineOptionText, { color: colors.text }]}>Whisper Offline</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.engineDescription, { color: colors.textSecondary }]}>Expo Speech uses platform services. Whisper runs fully on-device after download.</Text>
        </View>

        {engine === 'expo' && (
          <View style={styles.modeSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Processing Mode</Text>
            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[styles.modeOption, expoMode === 'cloud' && styles.modeOptionActive, { backgroundColor: colors.surface }]}
                onPress={() => handleSelectExpoMode('cloud')}
              >
                <Text style={[styles.modeOptionText, { color: colors.text }]}>Cloud</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeOption, expoMode === 'device' && styles.modeOptionActive, { backgroundColor: colors.surface }]}
                onPress={() => handleSelectExpoMode('device')}
              >
                <Text style={[styles.modeOptionText, { color: colors.text }]}>On Device</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeOption, expoMode === 'auto' && styles.modeOptionActive, { backgroundColor: colors.surface }]}
                onPress={() => handleSelectExpoMode('auto')}
              >
                <Text style={[styles.modeOptionText, { color: colors.text }]}>Auto</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.modeDescription, { color: colors.textSecondary }]}>Cloud sends audio to Apple or Google. On Device stays local when supported. Auto chooses automatically.</Text>
          </View>
        )}

        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color="#8b5cf6" />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Download models to enable real-time subtitle transcription during video calls.
              The VAD model detects speech activity, while Whisper models perform the transcription.
            </Text>
          </View>
        </View>

        <View style={styles.modelsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>VAD Model</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Required for voice activity detection
          </Text>
          
          <ModelCard
            key="vad"
            modelName="vad"
            isDownloaded={modelStates['vad']?.isDownloaded || false}
            isDownloading={modelStates['vad']?.isDownloading || false}
            isLoading={modelStates['vad']?.isLoading || false}
            isSelected={false}
            selectable={false}
            downloadProgress={modelStates['vad']?.progress}
            onDownload={() => handleDownload('vad')}
            onCancel={() => handleCancel('vad')}
            onDelete={() => handleDelete('vad')}
            onSelect={() => {}}
          />
        </View>

        <View style={styles.modelsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Whisper Models</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Choose and download a transcription model. Tap to set as active.
          </Text>
          
          {Object.keys(WHISPER_MODELS).filter(name => name !== 'vad').map((modelName) => (
            <ModelCard
              key={modelName}
              modelName={modelName}
              isDownloaded={modelStates[modelName]?.isDownloaded || false}
              isDownloading={modelStates[modelName]?.isDownloading || false}
              isLoading={modelStates[modelName]?.isLoading || false}
              isSelected={engine === 'whisper' && modelName === preferredModel}
              selectable={engine === 'whisper'}
              downloadProgress={modelStates[modelName]?.progress}
              onDownload={() => handleDownload(modelName)}
              onCancel={() => handleCancel(modelName)}
              onDelete={() => handleDelete(modelName)}
              onSelect={() => handleSelectModel(modelName)}
            />
          ))}
        </View>

        <View style={styles.modelsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Detection Language</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Select the language for speech recognition. Auto-detect works for all supported languages.
          </Text>
          
          <View style={styles.languageGrid}>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageCard,
                  { backgroundColor: colors.surface },
                  selectedLanguage === lang.code && styles.languageCardActive
                ]}
                onPress={() => handleSelectLanguage(lang.code)}
              >
                <Text style={styles.languageFlag}>{lang.flag}</Text>
                <Text style={[
                  styles.languageName,
                  { color: colors.text },
                  selectedLanguage === lang.code && styles.languageNameActive
                ]}>
                  {lang.name}
                </Text>
                {selectedLanguage === lang.code && (
                  <View style={styles.languageCheck}>
                    <Ionicons name="checkmark-circle" size={20} color="#8b5cf6" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  engineSection: {
    marginBottom: 32,
  },
  engineRow: {
    flexDirection: 'row',
    gap: 12,
  },
  engineOption: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  engineOptionActive: {
    borderColor: '#8b5cf6',
  },
  engineOptionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  engineDescription: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 18,
  },
  modeSection: {
    marginBottom: 32,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modeOption: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modeOptionActive: {
    borderColor: '#8b5cf6',
  },
  modeOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modeDescription: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 18,
  },
  infoSection: {
    marginBottom: 24,
  },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  modelsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  modelCard: {
    borderRadius: 16,
    marginBottom: 12,
  },
  modelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  modelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modelIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modelTextContainer: {
    flex: 1,
  },
  modelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  modelName: {
    fontSize: 16,
    fontWeight: '600',
  },
  activeBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  activeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8b5cf6',
    letterSpacing: 0.5,
  },
  modelDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  progressSection: {
    marginTop: 12,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressSpeed: {
    fontSize: 12,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  modelRight: {
    marginLeft: 12,
  },
  iconButton: {
    padding: 4,
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  languageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: '47%',
    gap: 8,
  },
  languageCardActive: {
    borderColor: '#8b5cf6',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  languageFlag: {
    fontSize: 24,
  },
  languageName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  languageNameActive: {
    fontWeight: '600',
    color: '#8b5cf6',
  },
  languageCheck: {
    marginLeft: 'auto',
  },
});
