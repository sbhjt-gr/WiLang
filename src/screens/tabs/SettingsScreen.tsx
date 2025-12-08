import React, { useCallback, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert, Text } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/navigation';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../config/firebase';
import { useTheme } from '../../theme';
import { TranslationPreferences } from '../../services/TranslationPreferences';
import { CallTranslationPrefs } from '../../services/call-translation-prefs';
import { getTranslationOptionLabel } from '../../constants/translation';
import { getSourceLabel, getTargetLabel } from '../../constants/palabra-langs';
import { useFocusEffect } from '@react-navigation/native';
import type { SourceLangCode, TargetLangCode } from '../../services/palabra/types';
import { UserProfileService } from '../../services/UserProfileService';

type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'HomeScreen'>;

interface Props {
  navigation: SettingsScreenNavigationProp;
}

export default function SettingsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [translationEnabled, setTranslationEnabled] = useState(false);
  const [translationTarget, setTranslationTarget] = useState('en');
  const [callTransSource, setCallTransSource] = useState<SourceLangCode>('auto');
  const [callTransTarget, setCallTransTarget] = useState<TargetLangCode>('en-us');
  const [displayName, setDisplayName] = useState('User');

  const translationLabel = useMemo(() => {
    if (!translationEnabled) {
      return 'Off';
    }
    return `To ${getTranslationOptionLabel(translationTarget)}`;
  }, [translationEnabled, translationTarget]);

  const callTransLabel = useMemo(() => {
    return `${getSourceLabel(callTransSource)} → ${getTargetLabel(callTransTarget)}`;
  }, [callTransSource, callTransTarget]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async () => {
        try {
          const [isEnabled, target, callPrefs] = await Promise.all([
            TranslationPreferences.isEnabled(),
            TranslationPreferences.getTarget(),
            CallTranslationPrefs.getAll(),
          ]);
          if (active) {
            setTranslationEnabled(isEnabled);
            setTranslationTarget(target);
            setCallTransSource(callPrefs.source);
            setCallTransTarget(callPrefs.target);
          }
        } catch (error) {}
        
        if (auth.currentUser?.uid) {
          try {
            const profile = await UserProfileService.getUserProfile(auth.currentUser.uid);
            if (active && profile) {
              setDisplayName(profile.displayName);
            }
          } catch (error) {}
        }
      };
      load();
      return () => {
        active = false;
      };
    }, []),
  );

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
      id: 'theme',
      title: 'Theme',
      subtitle: 'Appearance and display settings',
      icon: 'color-palette-outline' as const,
      color: '#8b5cf6',
      onPress: () => navigation.navigate('ThemeSettingsScreen'),
    },
    {
      id: 'translation',
      title: 'Local Translation',
      subtitle: translationLabel,
      icon: 'globe-outline' as const,
      color: '#8b5cf6',
      onPress: () => navigation.navigate('TranslationSettingsScreen'),
    },
    {
      id: 'call-translation',
      title: 'Cloud Translation',
      subtitle: callTransLabel,
      icon: 'call-outline' as const,
      color: '#8b5cf6',
      onPress: () => navigation.navigate('CallTranslationSettings'),
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
  ]), [callTransLabel, navigation, translationLabel]);

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
              <Text style={[styles.avatarText, { color: '#8b5cf6' }]}>{displayName[0].toUpperCase()}</Text>
            </View>
            <Text style={[styles.userName, { color: colors.text }]}>{displayName}</Text>
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
});
