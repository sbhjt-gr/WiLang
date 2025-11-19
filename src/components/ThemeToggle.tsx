import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeMode } from '../theme';

interface ThemeOption {
  mode: ThemeMode;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}

const themeOptions: ThemeOption[] = [
  {
    mode: 'light',
    label: 'Light',
    icon: 'sunny-outline',
    description: 'Default light theme',
  },
  {
    mode: 'dark',
    label: 'Dark',
    icon: 'moon-outline',
    description: 'Dark mode for low light',
  },
  {
    mode: 'pitchBlack',
    label: 'Pitch Black',
    icon: 'moon',
    description: 'True black for OLED screens',
  },
];

export const ThemeToggle: React.FC = () => {
  const { theme, colors, setTheme } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>Theme</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Choose your preferred theme
      </Text>

      <View style={styles.optionsContainer}>
        {themeOptions.map((option) => {
          const isSelected = theme === option.mode;
          return (
            <TouchableOpacity
              key={option.mode}
              style={[
                styles.optionCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                isSelected && {
                  borderColor: colors.primary,
                  backgroundColor: colors.primaryLight,
                },
              ]}
              onPress={() => setTheme(option.mode)}
            >
              <View style={styles.optionContent}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: isSelected ? colors.primary : colors.primaryLight },
                  ]}
                >
                  <Ionicons
                    name={option.icon}
                    size={24}
                    color={isSelected ? colors.textInverse : colors.primary}
                  />
                </View>
                <View style={styles.textContainer}>
                  <Text style={[styles.optionLabel, { color: colors.text }]}>
                    {option.label}
                  </Text>
                  <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                    {option.description}
                  </Text>
                </View>
                {isSelected && (
                  <View style={[styles.checkmark, { backgroundColor: colors.primary }]}>
                    <Ionicons name="checkmark" size={16} color={colors.textInverse} />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 16,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 12,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
