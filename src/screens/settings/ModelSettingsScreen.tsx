import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '@rneui/themed';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import RNFS from 'react-native-fs';
import { RootStackParamList } from '../../types/navigation';
import { clearManualModel, clearManualVad, getCachedModelSettings, setManualModel, setManualVad, subscribeModelSettings, type ModelSettings } from '../../services/ModelSettings';

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
  const [modelFileSize, setModelFileSize] = useState<string>('');
  const [vadFileSize, setVadFileSize] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

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
});
