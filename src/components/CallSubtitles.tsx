import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

type Props = {
  text: string;
  status: 'idle' | 'preparing' | 'ready' | 'running' | 'error';
  error?: string | null;
  isPartial?: boolean;
};

export const CallSubtitles: React.FC<Props> = ({ text, status, error, isPartial = false }) => {
  const isLoading = status === 'preparing';
  const isError = status === 'error' && error;
  const hasText = text.length > 0;
  if (!isLoading && !isError && !hasText) {
    return null;
  }
  const display = isError ? error ?? 'Transcription error' : isLoading ? 'Loading subtitles' : text;
  return (
    <View style={[styles.container, isError ? styles.errorContainer : undefined, isPartial ? styles.partialContainer : undefined]}>
      {isLoading ? <ActivityIndicator size="small" color="#ffffff" style={styles.loader} /> : null}
      {isPartial && !isLoading ? (
        <View style={styles.streamingIndicator}>
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotDelay1]} />
          <View style={[styles.dot, styles.dotDelay2]} />
        </View>
      ) : null}
      <Text style={[styles.text, isError ? styles.errorText : undefined, isPartial ? styles.partialText : undefined]} numberOfLines={3}>{display}</Text>
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
  partialContainer: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 2,
    borderColor: 'rgba(100,200,255,0.5)',
  },
  partialText: {
    opacity: 0.8,
    fontStyle: 'italic',
  },
  streamingIndicator: {
    flexDirection: 'row',
    gap: 4,
    marginRight: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
    opacity: 0.6,
  },
  dotDelay1: {
    opacity: 0.4,
  },
  dotDelay2: {
    opacity: 0.2,
  },
});
