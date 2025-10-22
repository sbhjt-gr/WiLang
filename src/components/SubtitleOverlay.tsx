import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

export type SubtitleEntry = {
  text: string;
  isFinal: boolean;
  timestamp: number;
  peerId?: string;
  username?: string;
};

type Props = {
  subtitles: SubtitleEntry[];
  position?: 'top' | 'bottom';
  maxVisible?: number;
};

export function SubtitleOverlay({subtitles, position = 'bottom', maxVisible = 3}: Props) {
  if (!subtitles.length) {
    return null;
  }

  const displayItems = subtitles.slice(-maxVisible);

  return (
    <View style={[styles.container, position === 'top' ? styles.top : styles.bottom]} pointerEvents="none">
      <View style={styles.panel}>
        {displayItems.map((entry, index) => {
          const key = `${entry.timestamp}-${index}`;
          return (
            <Text key={key} style={[styles.text, entry.isFinal ? styles.finalText : styles.partialText]}>
              {entry.username ? `${entry.username}: ` : ''}
              {entry.text}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 12,
  },
  top: {
    top: 120,
  },
  bottom: {
    bottom: 120,
  },
  panel: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 8,
  },
  text: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  finalText: {
    opacity: 1,
  },
  partialText: {
    opacity: 0.7,
    fontStyle: 'italic',
  },
});
