import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

interface Props {
  sourceText?: string | null;
  translatedText?: string | null;
  visible: boolean;
  isConnecting?: boolean;
}

const TranscriptionOverlay: React.FC<Props> = ({
  sourceText,
  translatedText,
  visible,
  isConnecting,
}) => {
  if (!visible) {
    return null;
  }

  const hasContent = sourceText || translatedText;

  if (!hasContent && isConnecting) {
    return (
      <View style={styles.container}>
        <View style={styles.bubble}>
          <ActivityIndicator size="small" color="#8b5cf6" />
          <Text style={styles.sourceText}>Connecting...</Text>
        </View>
      </View>
    );
  }

  if (!hasContent) {
    return (
      <View style={styles.container}>
        <View style={styles.bubble}>
          <Text style={styles.sourceText}>Listening...</Text>
        </View>
      </View>
    );
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
    bottom: 160,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
