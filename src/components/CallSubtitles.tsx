import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

type Props = {
  text: string;
  status: 'idle' | 'preparing' | 'ready' | 'running' | 'error';
  error?: string | null;
};

export const CallSubtitles: React.FC<Props> = ({ text, status, error }) => {
  const isLoading = status === 'preparing';
  const isError = status === 'error' && error;
  const hasText = text.length > 0;
  if (!isLoading && !isError && !hasText) {
    return null;
  }
  const display = isError ? error ?? 'Transcription error' : isLoading ? 'Loading subtitles' : text;
  return (
    <View style={[styles.container, isError ? styles.errorContainer : undefined]}>
      {isLoading ? <ActivityIndicator size="small" color="#ffffff" style={styles.loader} /> : null}
      <Text style={[styles.text, isError ? styles.errorText : undefined]} numberOfLines={3}>{display}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 140,
    left: 20,
    right: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
  },
  errorContainer: {
    backgroundColor: 'rgba(255,71,87,0.85)',
  },
  text: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorText: {
    color: '#ffffff',
  },
  loader: {
    marginBottom: 8,
  },
});
