import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import {
  whisperModelDownloader,
  WHISPER_MODELS,
} from '../services/whisper/WhisperModelDownloader';
import { ModelDownloadProgress } from '../services/whisper/types';
import { ModelPreferences, WhisperModelVariant } from '../services/whisper/ModelPreferences';

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

interface ModelCardProps {
  modelName: string;
  isDownloaded: boolean;
  isDownloading: boolean;
  isLoading: boolean;
  isSelected: boolean;
  downloadProgress?: ModelDownloadProgress;
  onDownload: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onSelect: () => void;
}

const ModelCard: React.FC<ModelCardProps> = ({
  modelName,
  isDownloaded,
  isDownloading,
  isLoading,
  isSelected,
  downloadProgress,
  onDownload,
  onCancel,
  onDelete,
  onSelect,
}) => {
  const { colors } = useTheme();
  const model = WHISPER_MODELS[modelName];

  if (!model) return null;

  const isWhisperModel = modelName !== 'vad';

  return (
    <View style={[styles.modelCard, { backgroundColor: colors.surface }]}>
      <TouchableOpacity
        style={styles.modelItem}
        onPress={isWhisperModel && isDownloaded && !isSelected ? onSelect : undefined}
        disabled={!isWhisperModel || !isDownloaded || isSelected || isDownloading}
        activeOpacity={isWhisperModel && isDownloaded && !isSelected ? 0.7 : 1}
      >
        <View style={styles.modelLeft}>
          <View style={[styles.modelIconContainer, { backgroundColor: isDownloaded ? 'rgba(139, 92, 246, 0.1)' : 'rgba(156, 163, 175, 0.1)' }]}>
            <Ionicons 
              name={isDownloaded ? "checkmark-circle" : "cloud-download-outline"} 
              size={24} 
              color={isDownloaded ? "#8b5cf6" : "#9ca3af"} 
            />
          </View>
          <View style={styles.modelTextContainer}>
            <View style={styles.modelTitleRow}>
              <Text style={[styles.modelName, { color: colors.text }]}>
                {model.name.charAt(0).toUpperCase() + model.name.slice(1)}
              </Text>
              {isSelected && isWhisperModel && (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeText}>Active</Text>
                </View>
              )}
            </View>
            <Text style={[styles.modelDescription, { color: colors.textSecondary }]}>
              {model.description}
            </Text>
            {isDownloading && downloadProgress && (
              <View style={styles.progressSection}>
                <View style={styles.progressTextRow}>
                  <Text style={[styles.progressPercent, { color: colors.text }]}>
                    {`${Math.floor(downloadProgress.progress)}%`}
                  </Text>
                  <Text style={[styles.progressSpeed, { color: colors.textSecondary }]}>
                    {downloadProgress.speed}
                  </Text>
                </View>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${downloadProgress.progress}%`, backgroundColor: '#8b5cf6' }
                    ]}
                  />
                </View>
              </View>
            )}
          </View>
        </View>
        <View style={styles.modelRight}>
          {isDownloading && downloadProgress ? (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={onCancel}
            >
              <Ionicons name="close-circle" size={28} color="#dc2626" />
            </TouchableOpacity>
          ) : isDownloaded ? (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={onDelete}
            >
              <Ionicons name="trash-outline" size={22} color="#dc2626" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={onDownload}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#8b5cf6" />
              ) : (
                <Ionicons name="download-outline" size={22} color="#8b5cf6" />
              )}
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default function ModelsDownloadScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [modelStates, setModelStates] = useState<Record<string, {
    isDownloaded: boolean;
    isDownloading: boolean;
    isLoading: boolean;
    progress?: ModelDownloadProgress;
  }>>({});
  const [loading, setLoading] = useState(true);
  const [preferredModel, setPreferredModel] = useState<WhisperModelVariant>('small');

  const checkModels = async () => {
    const states: Record<string, any> = {};
    for (const modelName of Object.keys(WHISPER_MODELS)) {
      const exists = await whisperModelDownloader.checkModelExists(modelName);
      states[modelName] = {
        isDownloaded: exists,
        isDownloading: false,
        isLoading: false,
      };
    }
    setModelStates(states);
    setLoading(false);
  };

  useEffect(() => {
    checkModels();
    
    ModelPreferences.getPreferredModel().then(setPreferredModel);

    whisperModelDownloader.setEventCallbacks({
      onStart: (modelName) => {
        setModelStates(prev => ({
          ...prev,
          [modelName]: {
            ...prev[modelName],
            isDownloading: true,
            isLoading: false,
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
              isSelected={modelName === preferredModel}
              downloadProgress={modelStates[modelName]?.progress}
              onDownload={() => handleDownload(modelName)}
              onCancel={() => handleCancel(modelName)}
              onDelete={() => handleDelete(modelName)}
              onSelect={() => handleSelectModel(modelName)}
            />
          ))}
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
});
