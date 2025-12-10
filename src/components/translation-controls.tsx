import React from 'react';
import {
  TouchableOpacity,
  ActivityIndicator,
  Text,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativePalabraState } from '../services/native-palabra';

interface Props {
  state: NativePalabraState;
  enabled: boolean;
  onToggle: () => void;
  style?: StyleProp<ViewStyle>;
  activeStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}

const TranslationControls: React.FC<Props> = ({
  state,
  enabled,
  onToggle,
  style,
  activeStyle,
  labelStyle,
}) => {
  const isConnecting = state === 'connecting';

  return (
    <TouchableOpacity
      style={[style, enabled && activeStyle]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      {isConnecting ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Ionicons
          name={enabled ? 'language' : 'language-outline'}
          size={22}
          color="#fff"
        />
      )}
      {labelStyle && <Text style={labelStyle}>Translate</Text>}
    </TouchableOpacity>
  );
};

export default TranslationControls;
