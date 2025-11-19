import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Switch, StatusBar, Text } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../types/navigation';
import { useTheme } from '../theme';

type ThemeSettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ThemeSettingsScreen'>;
type ThemeSettingsScreenRouteProp = RouteProp<RootStackParamList, 'ThemeSettingsScreen'>;

interface Props {
  navigation: ThemeSettingsScreenNavigationProp;
  route: ThemeSettingsScreenRouteProp;
}

const PITCH_BLACK_KEY = '@whisperlang_pitch_black';

type ThemeOption = 'system' | 'light' | 'dark';

interface ThemeItem {
  value: ThemeOption;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}

const themeOptions: ThemeItem[] = [
  {
    value: 'system',
    label: 'System Default',
    icon: 'phone-portrait-outline',
    description: 'Follow device settings',
  },
  {
    value: 'light',
    label: 'Light',
    icon: 'sunny-outline',
    description: 'Light appearance',
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: 'moon-outline',
    description: 'Dark appearance',
  },
];

export default function ThemeSettingsScreen({ navigation, route }: Props) {
  const { colors, theme, setTheme, usePitchBlack, setUsePitchBlack } = useTheme();
  const [isPitchBlackEnabled, setIsPitchBlackEnabled] = useState(false);

  useEffect(() => {
    loadPitchBlackPreference();
  }, []);

  const loadPitchBlackPreference = async () => {
    try {
      const saved = await AsyncStorage.getItem(PITCH_BLACK_KEY);
      setIsPitchBlackEnabled(saved === 'true');
    } catch (error) {
      console.error('pitch_black_load_error', error);
    }
  };

  const handleThemeSelect = (selectedTheme: ThemeOption) => {
    setTheme(selectedTheme);
  };

  const handlePitchBlackToggle = async (value: boolean) => {
    try {
      await AsyncStorage.setItem(PITCH_BLACK_KEY, value.toString());
      setIsPitchBlackEnabled(value);
      if (setUsePitchBlack) {
        setUsePitchBlack(value);
      }
    } catch (error) {
      console.error('pitch_black_save_error', error);
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#8b5cf6" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={[styles.header, { backgroundColor: '#8b5cf6' }]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Theme</Text>
            <View style={styles.headerRight} />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Choose how WiLang looks on your device
          </Text>

          <View style={styles.themeList}>
            {themeOptions.map((option) => {
              const isSelected = theme === option.value;

              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.themeCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    isSelected && styles.themeCardSelected,
                  ]}
                  onPress={() => handleThemeSelect(option.value)}
                >
                  <View style={styles.themeCardContent}>
                    <View style={[styles.themeIcon, { backgroundColor: isSelected ? 'rgba(139, 92, 246, 0.15)' : colors.background }]}>
                      <Ionicons
                        name={option.icon}
                        size={24}
                        color={isSelected ? '#8b5cf6' : colors.textSecondary}
                      />
                    </View>
                    <View style={styles.themeInfo}>
                      <Text style={[styles.themeLabel, { color: colors.text }]}>
                        {option.label}
                      </Text>
                      <Text style={[styles.themeDescription, { color: colors.textSecondary }]}>
                        {option.description}
                      </Text>
                    </View>
                    {isSelected && (
                      <View style={styles.checkmark}>
                        <Ionicons name="checkmark-circle" size={24} color="#8b5cf6" />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Dark Mode Options</Text>

          <View style={[styles.optionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.optionContent}>
              <View style={styles.optionLeft}>
                <View style={[styles.optionIcon, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                  <Ionicons name="moon" size={24} color="#8b5cf6" />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={[styles.optionLabel, { color: colors.text }]}>
                    Pitch Black Theme
                  </Text>
                  <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                    Use true black for dark mode (OLED friendly)
                  </Text>
                </View>
              </View>
              <Switch
                value={isPitchBlackEnabled}
                onValueChange={handlePitchBlackToggle}
                trackColor={{ false: colors.border, true: '#8b5cf6' }}
                thumbColor={isPitchBlackEnabled ? '#ffffff' : '#f4f3f4'}
                ios_backgroundColor={colors.border}
              />
            </View>
          </View>
        </View>
      </ScrollView>
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
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
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
  scrollContent: {
    padding: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  themeList: {
    gap: 12,
  },
  themeCard: {
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
  },
  themeCardSelected: {
    borderColor: '#8b5cf6',
  },
  themeCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  themeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  themeInfo: {
    flex: 1,
  },
  themeLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  themeDescription: {
    fontSize: 14,
  },
  checkmark: {
    marginLeft: 12,
  },
  infoSection: {
    marginTop: 8,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  optionCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionInfo: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 14,
  },
});
