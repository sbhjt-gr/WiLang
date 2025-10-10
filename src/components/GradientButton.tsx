import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  colors?: [string, string, ...string[]];
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: keyof typeof Ionicons.glyphMap;
  iconSize?: number;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
}

const GradientButton: React.FC<GradientButtonProps> = ({
  title,
  onPress,
  colors,
  style,
  textStyle,
  icon,
  iconSize = 20,
  disabled = false,
  variant = 'primary'
}) => {
  const getVariantColors = (): [string, string] => {
    switch (variant) {
      case 'primary':
        return ['#8b5cf6', '#ec4899'];
      case 'secondary':
        return ['#11998e', '#38ef7d'];
      case 'danger':
        return ['#ff6b6b', '#ee5a52'];
      case 'success':
        return ['#38ef7d', '#11998e'];
      default:
        return ['#8b5cf6', '#ec4899'];
    }
  };

  const buttonColors = colors || getVariantColors();
  const disabledColors: [string, string] = ['#cccccc', '#999999'];

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={disabled ? disabledColors : buttonColors}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={iconSize}
            color="#ffffff"
            style={styles.icon}
          />
        )}
        <Text style={[styles.text, textStyle]}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  text: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  icon: {
    marginRight: 8,
  },
});

export default GradientButton;