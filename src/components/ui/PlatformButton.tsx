import React from 'react';
import { ActivityIndicator, Platform, StyleProp, StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Button as ComposeButton, ButtonElementColors } from '@expo/ui/jetpack-compose';

export type PlatformButtonVariant = 'primary' | 'secondary';

interface PlatformButtonProps {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: PlatformButtonVariant;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const VARIANT_COLORS: Record<PlatformButtonVariant, ButtonElementColors> = {
  primary: {
    containerColor: '#5560f6',
    contentColor: '#f8f9ff',
    disabledContainerColor: '#343b99',
    disabledContentColor: '#c6c9f5'
  },
  secondary: {
    containerColor: '#141726',
    contentColor: '#f4f5f9',
    disabledContainerColor: '#10121c',
    disabledContentColor: '#7a7f9e'
  }
};

const VARIANT_TEXT_STYLES: Record<PlatformButtonVariant, TextStyle> = {
  primary: {
    color: '#f8f9ff'
  },
  secondary: {
    color: '#f4f5f9'
  }
};

export function PlatformButton({
  title,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  style,
  textStyle
}: PlatformButtonProps) {
  const isDisabled = disabled || loading;

  if (Platform.OS === 'android') {
    const elementColors = VARIANT_COLORS[variant];
    const buttonText = loading ? 'Please wait…' : title;

    return (
      <View style={[styles.composeWrapper, style]}>
        <ComposeButton
          onPress={onPress}
          disabled={isDisabled}
          elementColors={elementColors}
          style={[styles.composeButton, variant === 'secondary' && styles.composeSecondaryButton]}
        >
          {buttonText}
        </ComposeButton>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.nativeButton,
        variant === 'secondary' ? styles.nativeSecondaryButton : styles.nativePrimaryButton,
        isDisabled && styles.nativeDisabledButton,
        style
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={VARIANT_TEXT_STYLES[variant].color} />
      ) : (
        <Text style={[styles.nativeButtonText, VARIANT_TEXT_STYLES[variant], textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  composeWrapper: {
    width: '100%'
  },
  composeButton: {
    width: '100%',
    borderRadius: 12
  },
  composeSecondaryButton: {
    borderWidth: 1,
    borderColor: '#1f2337'
  },
  nativeButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center'
  },
  nativePrimaryButton: {
    backgroundColor: '#5560f6'
  },
  nativeSecondaryButton: {
    backgroundColor: '#141726',
    borderWidth: 1,
    borderColor: '#1f2337'
  },
  nativeDisabledButton: {
    opacity: 0.6
  },
  nativeButtonText: {
    fontSize: 16,
    fontWeight: '600'
  }
});
