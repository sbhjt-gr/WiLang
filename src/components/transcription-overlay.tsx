import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface Props {
  sourceText?: string | null;
  translatedText?: string | null;
  visible: boolean;
}

const TranscriptionOverlay: React.FC<Props> = ({
  sourceText,
  translatedText,
  visible,
}) => {
  if (!visible || (!sourceText && !translatedText)) {
    return null;
  }

  return (
    <View style={styles.container}>
      {sourceText && (
        <View style={styles.bubble}>
          <Text style={styles.sourceText}>{sourceText}</Text>
        </View>
      )}
      {translatedText && (
        <View style={[styles.bubble, styles.translatedBubble]}>
          <Text style={styles.translatedText}>{translatedText}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    alignItems: 'center',
    gap: 8,
  },
  bubble: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    maxWidth: '90%',
  },
  translatedBubble: {
    backgroundColor: 'rgba(139, 92, 246, 0.85)',
  },
  sourceText: {
    fontSize: 14,
    color: '#d1d5db',
    textAlign: 'center',
  },
  translatedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
});

export default TranscriptionOverlay;
