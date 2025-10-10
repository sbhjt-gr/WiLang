import React, { useEffect, useMemo, useRef } from 'react';
import {
  KeyboardTypeOptions,
  Platform,
  ReturnKeyTypeOptions,
  StyleProp,
  StyleSheet,
  TextInput as NativeTextInput,
  TextStyle
} from 'react-native';
import {
  TextInput as ComposeTextInput,
  TextInputRef as ComposeTextInputRef
} from '@expo/ui/jetpack-compose';
import type { TextInputProps as ComposeTextInputProps } from '@expo/ui/jetpack-compose';

interface PlatformTextInputProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
  onSubmitEditing?: () => void;
  returnKeyType?: ReturnKeyTypeOptions;
}

type ComposeKeyboardType = NonNullable<ComposeTextInputProps['keyboardType']>;

const composeKeyboardMap: Partial<Record<KeyboardTypeOptions, ComposeKeyboardType>> = {
  default: 'default',
  'email-address': 'email-address',
  numeric: 'numeric',
  'phone-pad': 'phone-pad',
  'number-pad': 'numeric',
  'decimal-pad': 'decimal-pad',
  url: 'url',
  twitter: 'default',
  'web-search': 'default',
  'ascii-capable': 'ascii-capable',
  'numbers-and-punctuation': 'numeric',
  'name-phone-pad': 'phone-pad',
  'visible-password': 'default'
};

export function PlatformTextInput({
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoCorrect = false,
  multiline,
  numberOfLines,
  style,
  onSubmitEditing,
  returnKeyType
}: PlatformTextInputProps) {
  const useCompose = Platform.OS === 'android' && !secureTextEntry;
  const composeRef = useRef<ComposeTextInputRef | null>(null);
  const lastSyncedValue = useRef<string>(value);

  useEffect(() => {
    if (useCompose && value !== lastSyncedValue.current) {
      composeRef.current?.setText(value);
      lastSyncedValue.current = value;
    }
  }, [useCompose, value]);

  const handleComposeChange = useMemo(() => {
    if (!useCompose) {
      return undefined;
    }
    return (text: string) => {
      lastSyncedValue.current = text;
      onChangeText(text);
    };
  }, [useCompose, onChangeText]);

  if (useCompose) {
    const composeKeyboardType: ComposeKeyboardType = composeKeyboardMap[keyboardType] ?? 'default';

    return (
      <ComposeTextInput
        ref={composeRef}
        defaultValue={value}
        onChangeText={handleComposeChange!}
        keyboardType={composeKeyboardType}
        autoCapitalize={autoCapitalize}
        autocorrection={autoCorrect}
        multiline={multiline}
        numberOfLines={numberOfLines}
        style={[styles.composeInput, style]}
      />
    );
  }

  return (
    <NativeTextInput
      style={[styles.nativeInput, style]}
      placeholder={placeholder}
      placeholderTextColor="#8e93a9"
      value={value}
      onChangeText={text => {
        lastSyncedValue.current = text;
        onChangeText(text);
      }}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      autoCorrect={autoCorrect}
      multiline={multiline}
      numberOfLines={numberOfLines}
      onSubmitEditing={onSubmitEditing}
      returnKeyType={returnKeyType}
    />
  );
}

const styles = StyleSheet.create({
  composeInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2337',
    backgroundColor: '#111320',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#f4f5f9'
  },
  nativeInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2337',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#f4f5f9',
    backgroundColor: '#111320'
  }
});
