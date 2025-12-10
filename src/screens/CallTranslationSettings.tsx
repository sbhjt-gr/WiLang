import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  StatusBar,
  TextInput,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { CallTranslationPrefs } from '../services/call-translation-prefs';
import { SOURCE_LANGS, TARGET_LANGS, getSourceLabel, getTargetLabel } from '../constants/palabra-langs';
import type { SourceLangCode, TargetLangCode } from '../services/palabra/types';
import GlassModal from '../components/GlassModal';

export default function CallTranslationSettings() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [enabled, setEnabled] = useState(false);
  const [source, setSource] = useState<SourceLangCode>('auto');
  const [target, setTarget] = useState<TargetLangCode>('en-us');
  const [showSource, setShowSource] = useState(false);
  const [showTarget, setShowTarget] = useState(false);
  const [search, setSearch] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [geminiKey, setGeminiKey] = useState('');

  const filteredSource = useMemo(() => {
    if (!search.trim()) return SOURCE_LANGS;
    return SOURCE_LANGS.filter(l => l.label.toLowerCase().includes(search.toLowerCase()));
  }, [search]);

  const filteredTarget = useMemo(() => {
    if (!search.trim()) return TARGET_LANGS;
    return TARGET_LANGS.filter(l => l.label.toLowerCase().includes(search.toLowerCase()));
  }, [search]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const prefs = await CallTranslationPrefs.getAll();
      if (active) {
        setEnabled(prefs.enabled);
        setSource(prefs.source);
        setTarget(prefs.target);
        setClientId(prefs.clientId);
        setClientSecret(prefs.clientSecret);
        setGeminiKey(prefs.geminiKey);
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
    setSearch('');
    await CallTranslationPrefs.setSource(code as SourceLangCode);
  }, []);

  const handleTargetSelect = useCallback(async (code: string) => {
    setTarget(code as TargetLangCode);
    setShowTarget(false);
    setSearch('');
    await CallTranslationPrefs.setTarget(code as TargetLangCode);
  }, []);

  const handleClientIdChange = useCallback(async (val: string) => {
    setClientId(val);
    await CallTranslationPrefs.setClientId(val.trim());
  }, []);

  const handleClientSecretChange = useCallback(async (val: string) => {
    setClientSecret(val);
    await CallTranslationPrefs.setClientSecret(val.trim());
  }, []);

  const handleGeminiKeyChange = useCallback(async (val: string) => {
    setGeminiKey(val);
    await CallTranslationPrefs.setGeminiKey(val.trim());
  }, []);

  const handleCloseSource = useCallback(() => {
    setShowSource(false);
    setSearch('');
  }, []);

  const handleCloseTarget = useCallback(() => {
    setShowTarget(false);
    setSearch('');
  }, []);

  const renderLangItem = useCallback(({ item, isSelected, onSelect }: { item: { id: string; label: string }; isSelected: boolean; onSelect: (id: string) => void }) => (
    <TouchableOpacity
      style={[styles.langItem, isSelected && styles.langItemSelected]}
      onPress={() => onSelect(item.id)}
      activeOpacity={0.7}
    >
      <Text style={[styles.langText, { color: colors.text }, isSelected && styles.langTextSelected]}>
        {item.label}
      </Text>
      {isSelected && <Ionicons name="checkmark" size={20} color="#8b5cf6" />}
    </TouchableOpacity>
  ), [colors.text]);

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

            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Palabra API Configuration
            </Text>

            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <View style={styles.inputRow}>
                <View style={styles.inputLabel}>
                  <Ionicons name="key-outline" size={20} color="#8b5cf6" />
                  <Text style={[styles.inputLabelText, { color: colors.text }]}>Client ID</Text>
                </View>
                <TextInput
                  style={[styles.credInput, { color: colors.text, borderColor: colors.border }]}
                  placeholder="Enter Palabra Client ID"
                  placeholderTextColor={colors.textSecondary}
                  value={clientId}
                  onChangeText={handleClientIdChange}
                  autoCorrect={false}
                  autoCapitalize="none"
                />
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.inputRow}>
                <View style={styles.inputLabel}>
                  <Ionicons name="lock-closed-outline" size={20} color="#8b5cf6" />
                  <Text style={[styles.inputLabelText, { color: colors.text }]}>Client Secret</Text>
                </View>
                <TextInput
                  style={[styles.credInput, { color: colors.text, borderColor: colors.border }]}
                  placeholder="Enter Palabra Client Secret"
                  placeholderTextColor={colors.textSecondary}
                  value={clientSecret}
                  onChangeText={handleClientSecretChange}
                  autoCorrect={false}
                  autoCapitalize="none"
                  secureTextEntry
                />
              </View>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Gemini API Configuration
            </Text>

            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <View style={styles.inputRow}>
                <View style={styles.inputLabel}>
                  <Ionicons name="sparkles-outline" size={20} color="#8b5cf6" />
                  <Text style={[styles.inputLabelText, { color: colors.text }]}>API Key</Text>
                </View>
                <TextInput
                  style={[styles.credInput, { color: colors.text, borderColor: colors.border }]}
                  placeholder="Enter Gemini API Key"
                  placeholderTextColor={colors.textSecondary}
                  value={geminiKey}
                  onChangeText={handleGeminiKeyChange}
                  autoCorrect={false}
                  autoCapitalize="none"
                  secureTextEntry
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>

      <GlassModal
        isVisible={showSource}
        onClose={handleCloseSource}
        title="Your Language"
        subtitle="Select the language you speak"
        icon="mic-outline"
        height={500}
      >
        <View style={[styles.searchRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search languages..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <FlatList
          data={filteredSource}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => renderLangItem({ item, isSelected: item.id === source, onSelect: handleSourceSelect })}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.langList}
        />
      </GlassModal>

      <GlassModal
        isVisible={showTarget}
        onClose={handleCloseTarget}
        title="Translate To"
        subtitle="Select the output language"
        icon="ear-outline"
        height={500}
      >
        <View style={[styles.searchRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search languages..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <FlatList
          data={filteredTarget}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => renderLangItem({ item, isSelected: item.id === target, onSelect: handleTargetSelect })}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.langList}
        />
      </GlassModal>
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  langList: {
    paddingBottom: 20,
  },
  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  langItemSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 8,
    marginHorizontal: -4,
    paddingHorizontal: 8,
  },
  langText: {
    fontSize: 16,
  },
  langTextSelected: {
    color: '#8b5cf6',
    fontWeight: '600',
  },
  inputRow: {
    padding: 16,
    gap: 10,
  },
  inputLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  inputLabelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  credInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
});
