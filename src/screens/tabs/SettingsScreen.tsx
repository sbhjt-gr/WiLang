import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert, Modal, Text } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/navigation';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../config/firebase';
import { useTheme } from '../../theme';
import { SubtitlePreferences, type SubtitleLang } from '../../services/SubtitlePreferences';
import { TranslationPreferences } from '../../services/TranslationPreferences';
import { getTranslationOptionLabel } from '../../constants/translation';
import { useFocusEffect } from '@react-navigation/native';
import TranslationDemoModal from '../../components/TranslationDemoModal';
import PalabraTranslationDemoModal from '../../components/PalabraTranslationDemoModal';

type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'HomeScreen'>;

interface Props {
  navigation: SettingsScreenNavigationProp;
}

export default function SettingsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [lang, setLang] = useState<SubtitleLang>('auto');
  const [langOpen, setLangOpen] = useState(false);
  const [translationEnabled, setTranslationEnabled] = useState(false);
  const [translationTarget, setTranslationTarget] = useState('en');
  const [demoOpen, setDemoOpen] = useState(false);
  const [palabraDemoOpen, setPalabraDemoOpen] = useState(false);

  const langOpts = useMemo<Array<{ id: SubtitleLang; label: string }>>(
    () => [
      { id: 'auto', label: 'Automatic' },
      { id: 'en', label: 'English (US)' },
      { id: 'es', label: 'Spanish' },
      { id: 'fr', label: 'French' },
      { id: 'hi', label: 'Hindi' },
      { id: 'de', label: 'German' },
      { id: 'pt', label: 'Portuguese' },
      { id: 'bn', label: 'Bengali' },
      { id: 'sv', label: 'Swedish' },
      { id: 'ja', label: 'Japanese' },
      { id: 'ko', label: 'Korean' },
    ],
    [],
  );

  const langLabel = useMemo(() => {
    const match = langOpts.find(item => item.id === lang);
    return match ? match.label : 'Automatic';
  }, [lang, langOpts]);

  const translationLabel = useMemo(() => {
    if (!translationEnabled) {
      return 'Off';
    }
    return `To ${getTranslationOptionLabel(translationTarget)}`;
  }, [translationEnabled, translationTarget]);

  useEffect(() => {
    let active = true;
    SubtitlePreferences.getExpoLanguage().then(value => {
      if (active) {
        setLang(value);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async () => {
        try {
          const [isEnabled, target] = await Promise.all([
            TranslationPreferences.isEnabled(),
            TranslationPreferences.getTarget(),
          ]);
          if (active) {
            setTranslationEnabled(isEnabled);
            setTranslationTarget(target);
          }
        } catch (error) {}
      };
      load();
      return () => {
        active = false;
      };
    }, []),
  );

  const onLang = useCallback(async (value: SubtitleLang) => {
    setLang(value);
    setLangOpen(false);
    await SubtitlePreferences.setExpoLanguage(value);
  }, []);

  const LogOut = async (): Promise<void> => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Sign Out", 
          style: "destructive",
          onPress: async () => {
            try {
              await auth.signOut();
              navigation.replace("LoginScreen");
            } catch (error) {
              Alert.alert("Error", "Failed to sign out. Please try again.");
            }
          }
        }
      ]
    );
  };

  const settingsOptions = useMemo(() => ([
    {
      id: 'subtitles',
      title: 'Subtitles',
      subtitle: langLabel,
      icon: 'text-outline' as const,
      color: '#8b5cf6',
      onPress: () => setLangOpen(true),
    },
    {
      id: 'theme',
      title: 'Theme',
      subtitle: 'Appearance and display settings',
      icon: 'color-palette-outline' as const,
      color: '#8b5cf6',
      onPress: () => navigation.navigate('ThemeSettingsScreen'),
    },
    {
      id: 'translation',
      title: 'Translation',
      subtitle: translationLabel,
      icon: 'globe-outline' as const,
      color: '#8b5cf6',
      onPress: () => navigation.navigate('TranslationSettingsScreen'),
    },
    {
      id: 'realtime-demo',
      title: 'Speech Translation Demo',
      subtitle: 'Replicate SeamlessM4T preview',
      icon: 'mic-outline' as const,
      color: '#8b5cf6',
      onPress: () => setDemoOpen(true),
    },
    {
      id: 'palabra-demo',
      title: 'Palabra AI Demo',
      subtitle: 'Real-time speech-to-speech translation',
      icon: 'language-outline' as const,
      color: '#8b5cf6',
      onPress: () => setPalabraDemoOpen(true),
    },
    {
      id: 'notifications',
      title: 'Notifications',
      subtitle: 'Manage call notifications',
      icon: 'notifications-outline' as const,
      color: '#8b5cf6',
      onPress: () => {},
    },
    {
      id: 'av',
      title: 'Audio & Video',
      subtitle: 'Camera and microphone settings',
      icon: 'videocam-outline' as const,
      color: '#8b5cf6',
      onPress: () => {},
    },
    {
      id: 'privacy',
      title: 'Privacy',
      subtitle: 'Privacy and security settings',
      icon: 'shield-outline' as const,
      color: '#8b5cf6',
      onPress: () => {},
    },
    {
      id: 'about',
      title: 'About',
      subtitle: 'App version and information',
      icon: 'information-circle-outline' as const,
      color: '#8b5cf6',
      onPress: () => {},
    },
  ]), [langLabel, navigation, translationLabel]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileSection}>
          <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
            <View style={[styles.avatarContainer, { backgroundColor: 'transparent', borderColor: '#8b5cf6', borderWidth: 2 }]}>
              <Text style={[styles.avatarText, { color: '#8b5cf6' }]}>U</Text>
            </View>
            <Text style={[styles.userName, { color: colors.text }]}>User Name</Text>
            <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{auth.currentUser?.email || 'user@example.com'}</Text>
          </View>
        </View>

        <View style={styles.settingsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Settings</Text>

          {settingsOptions.map((option, index) => (
            <View
              key={option.id}
              style={[styles.settingCard, { backgroundColor: colors.surface }]}
            >
              <TouchableOpacity
                style={styles.settingItem}
                onPress={option.onPress}
              >
                <View style={styles.settingLeft}>
                  <View style={styles.settingIcon}>
                    <Ionicons name={option.icon} size={20} color={option.color} />
                  </View>
                  <View style={styles.settingText}>
                    <Text style={[styles.settingTitle, { color: colors.text }]}>{option.title}</Text>
                    <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>{option.subtitle}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.logoutSection}>
          <TouchableOpacity style={[styles.logoutCard, { backgroundColor: colors.surface, borderColor: '#dc2626', borderWidth: 1 }]} onPress={LogOut}>
            <Ionicons name="log-out-outline" size={20} color="#dc2626" />
            <Text style={[styles.logoutText, { color: '#dc2626' }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

  <TranslationDemoModal visible={demoOpen} onClose={() => setDemoOpen(false)} />

  <PalabraTranslationDemoModal visible={palabraDemoOpen} onClose={() => setPalabraDemoOpen(false)} />

  <Modal transparent visible={langOpen} animationType="fade">
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setLangOpen(false)} />
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>Subtitle Language</Text>
            {langOpts.map(item => (
              <TouchableOpacity
                key={item.id}
                style={styles.modalItem}
                onPress={() => onLang(item.id)}
              >
                <Text style={[styles.modalItemText, { color: colors.text }]}>{item.label}</Text>
                {lang === item.id ? <Ionicons name="checkmark" size={18} color="#8b5cf6" /> : null}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.modalClose, { backgroundColor: '#8b5cf6' }]} onPress={() => setLangOpen(false)}>
              <Text style={styles.modalCloseText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  profileSection: {
    marginBottom: 24,
  },
  profileCard: {
    borderRadius: 20,
    alignItems: 'center',
    padding: 32,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
  },
  settingsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  settingCard: {
    borderRadius: 16,
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 12,
  },
  logoutSection: {
    marginTop: 20,
  },
  logoutCard: {
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  modalItemText: {
    fontSize: 16,
    flex: 1,
    marginRight: 12,
  },
  modalClose: {
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 16,
  },
  modalCloseText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
