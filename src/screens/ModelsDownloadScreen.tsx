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
      <View style={styles.modelHeader}>
        <View style={styles.modelInfo}>
          <View style={styles.modelTitleRow}>
            <Text style={[styles.modelName, { color: colors.text }]}>
              {model.name.charAt(0).toUpperCase() + model.name.slice(1)} Model
            </Text>
            {isSelected && isWhisperModel && (
              <View style={styles.selectedBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#8b5cf6" />
                <Text style={styles.selectedText}>Active</Text>
              </View>
            )}
          </View>
          <Text style={[styles.modelDescription, { color: colors.textSecondary }]}>
            {model.description}
          </Text>
        </View>
        <View style={styles.modelActions}>
          {isDownloading && downloadProgress ? (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#dc2626' }]}
              onPress={onCancel}
            >
              <Ionicons name="close" size={20} color="#ffffff" />
            </TouchableOpacity>
          ) : isDownloaded ? (
            <View style={styles.actionRow}>
              {isWhisperModel && !isSelected && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#8b5cf6', marginRight: 8 }]}
                  onPress={onSelect}
                >
                  <Ionicons name="checkmark" size={20} color="#ffffff" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#dc2626' }]}
                onPress={onDelete}
              >
                <Ionicons name="trash-outline" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#8b5cf6' }]}
              onPress={onDownload}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons name="download-outline" size={20} color="#ffffff" />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isDownloading && downloadProgress ? (
        <View style={styles.progressContainer}>
          <View style={styles.progressInfo}>
            <Text style={[styles.progressText, { color: colors.text }]}>
              {`${Math.floor(downloadProgress.progress)}%`}
            </Text>
            <Text style={[styles.progressDetails, { color: colors.textSecondary }]}>
              {`${formatBytes(downloadProgress.bytesDownloaded)} / ${formatBytes(downloadProgress.bytesTotal)}`}
            </Text>
          </View>
          <View style={styles.speedInfo}>
            <Text style={[styles.speedText, { color: colors.textSecondary }]}>
              {downloadProgress.speed}
            </Text>
            <Text style={[styles.etaText, { color: colors.textSecondary }]}>
              {downloadProgress.eta}
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
      ) : isDownloaded ? (
        <View style={[styles.statusBadge, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
          <Ionicons name="checkmark-circle" size={16} color="#10b981" />
          <Text style={[styles.statusText, { color: '#10b981' }]}>Downloaded</Text>
        </View>
      ) : (
        <View style={[styles.statusBadge, { backgroundColor: 'rgba(156, 163, 175, 0.1)' }]}>
          <Ionicons name="cloud-download-outline" size={16} color="#9ca3af" />
          <Text style={[styles.statusText, { color: '#9ca3af' }]}>
            {formatBytes(model.size)}
          </Text>
        </View>
      )}
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

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#8b5cf6" />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Download models to enable real-time subtitle transcription during video calls.
            The VAD model is required for all subtitle features.
          </Text>
        </View>

        {Object.keys(WHISPER_MODELS).map((modelName) => (
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
    padding: 16,
  },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  modelCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  modelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modelInfo: {
    flex: 1,
  },
  modelName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  modelDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  modelActions: {
    marginLeft: 12,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    gap: 8,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressDetails: {
    fontSize: 14,
  },
  speedInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  speedText: {
    fontSize: 12,
  },
  etaText: {
    fontSize: 12,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  selectedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
