import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { CallTranslationPrefs } from '../services/call-translation-prefs';
import { getSourceLabel, getTargetLabel } from '../constants/palabra-langs';
import type { SourceLangCode, TargetLangCode } from '../services/palabra/types';
import LanguageSelector from '../components/language-selector';

export default function CallTranslationSettings() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [enabled, setEnabled] = useState(false);
  const [source, setSource] = useState<SourceLangCode>('auto');
  const [target, setTarget] = useState<TargetLangCode>('en-us');
  const [showSource, setShowSource] = useState(false);
  const [showTarget, setShowTarget] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const prefs = await CallTranslationPrefs.getAll();
      if (active) {
        setEnabled(prefs.enabled);
        setSource(prefs.source);
        setTarget(prefs.target);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const handleToggle = useCallback(async (val: boolean) => {
    setEnabled(val);
    await CallTranslationPrefs.setEnabled(val);
  }, []);

  const handleSourceSelect = useCallback(async (code: string) => {
    setSource(code as SourceLangCode);
    setShowSource(false);
    await CallTranslationPrefs.setSource(code as SourceLangCode);
  }, []);

  const handleTargetSelect = useCallback(async (code: string) => {
    setTarget(code as TargetLangCode);
    setShowTarget(false);
    await CallTranslationPrefs.setTarget(code as TargetLangCode);
  }, []);

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#8b5cf6" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Call Translation</Text>
            <View style={styles.headerRight} />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="language" size={24} color="#8b5cf6" />
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: colors.text }]}>
                  Enable Translation
                </Text>
                <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
                  Translate your speech in real-time during calls
                </Text>
              </View>
            </View>
            <Switch
              value={enabled}
              onValueChange={handleToggle}
              trackColor={{ false: colors.border, true: '#8b5cf6' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Language Settings
        </Text>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <TouchableOpacity style={styles.row} onPress={() => setShowSource(true)}>
            <View style={styles.rowLeft}>
              <Ionicons name="mic-outline" size={24} color="#8b5cf6" />
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: colors.text }]}>
                  Your Language
                </Text>
                <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
                  The language you speak
                </Text>
              </View>
            </View>
            <View style={styles.rowRight}>
              <Text style={[styles.rowValue, { color: '#8b5cf6' }]}>
                {getSourceLabel(source)}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </View>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={styles.row} onPress={() => setShowTarget(true)}>
            <View style={styles.rowLeft}>
              <Ionicons name="ear-outline" size={24} color="#8b5cf6" />
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: colors.text }]}>
                  Translate To
                </Text>
                <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
                  Language for translation output
                </Text>
              </View>
            </View>
            <View style={styles.rowRight}>
              <Text style={[styles.rowValue, { color: '#8b5cf6' }]}>
                {getTargetLabel(target)}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={[styles.infoCard, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
          <Ionicons name="information-circle" size={20} color="#8b5cf6" />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            During a video call, tap the translation button to start translating your speech. 
            Your words will be transcribed and translated in real-time.
          </Text>
        </View>
          </ScrollView>

          <LanguageSelector
            visible={showSource}
            mode="source"
            currentCode={source}
            onSelect={handleSourceSelect}
            onClose={() => setShowSource(false)}
          />
          <LanguageSelector
            visible={showTarget}
            mode="target"
            currentCode={target}
            onSelect={handleTargetSelect}
            onClose={() => setShowTarget(false)}
          />
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#8b5cf6',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#8b5cf6',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  card: {
    borderRadius: 16,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  rowSub: {
    fontSize: 13,
    marginTop: 2,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
