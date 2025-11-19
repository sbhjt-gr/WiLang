import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface EncryptionIndicatorProps {
  isEncrypted: boolean;
  securityCode?: string;
  onPress?: () => void;
}

export const EncryptionIndicator: React.FC<EncryptionIndicatorProps> = ({
  isEncrypted,
  securityCode,
  onPress
}) => {
  if (!isEncrypted) {
    return null;
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <MaterialIcons
        name="lock"
        color="#4CAF50"
        size={16}
      />
      <Text style={styles.text}>End-to-End Encrypted</Text>
      {securityCode && (
        <View style={styles.codeContainer}>
          <Text style={styles.codeText}>{securityCode}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  text: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },
  codeContainer: {
    marginLeft: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderRadius: 4,
  },
  codeText: {
    color: '#4CAF50',
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
});
