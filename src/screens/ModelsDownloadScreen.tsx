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

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Subtitle Settings</Text>
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
            <Text style={[styles.infoText, { color: colors.text }]}>
              Using Expo Speech Recognition powered by platform services (Apple/Google).
            </Text>
          </View>
        </View>

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
          <Text style={[styles.modeDescription, { color: colors.textSecondary }]}>
            Cloud sends audio to Apple or Google. On Device stays local when supported. Auto chooses automatically.
          </Text>
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
                  expoLanguage === lang.code && styles.languageCardActive
                ]}
                onPress={() => handleSelectLanguage(lang.code)}
              >
                <Text style={styles.languageFlag}>{lang.flag}</Text>
                <Text style={[
                  styles.languageName,
                  { color: colors.text },
                  expoLanguage === lang.code && styles.languageNameActive
                ]}>
                  {lang.name}
                </Text>
                {expoLanguage === lang.code && (
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
