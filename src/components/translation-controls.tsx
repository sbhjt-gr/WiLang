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
}

const TranslationControls: React.FC<Props> = ({
  state,
  enabled,
  onToggle,
}) => {
  const isConnecting = state === 'connecting';

  return (
    <TouchableOpacity
      style={[styles.btn]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      {isConnecting ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Ionicons
          name={enabled ? 'language' : 'language-outline'}
          size={20}
          color="#fff"
        />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default TranslationControls;
