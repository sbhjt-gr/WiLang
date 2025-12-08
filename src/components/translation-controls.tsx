import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TranslationState } from '../services/video-call-translation';

interface Props {
  state: TranslationState;
  enabled: boolean;
  onToggle: () => void;
  onSettings: () => void;
  sourceLang?: string;
  targetLang?: string;
}

const TranslationControls: React.FC<Props> = ({
  state,
  enabled,
  onToggle,
  onSettings,
}) => {
  const isConnecting = state === 'connecting';

  return (
    <TouchableOpacity
      style={[styles.btn, enabled && styles.btnActive]}
      onPress={onToggle}
      onLongPress={onSettings}
      activeOpacity={0.7}
    >
      {isConnecting ? (
        <ActivityIndicator size="small" color={enabled ? '#fff' : '#8b5cf6'} />
      ) : (
        <Ionicons
          name={enabled ? 'language' : 'language-outline'}
          size={24}
          color={enabled ? '#fff' : '#8b5cf6'}
        />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnActive: {
    backgroundColor: '#8b5cf6',
  },
});

export default TranslationControls;
