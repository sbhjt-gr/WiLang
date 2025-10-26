import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

type SubtitleOverlayProps = {
  text: string;
  language?: string | null;
  confidence?: number | null;
  visible: boolean;
  status?: string | null;
};

const SubtitleOverlay: React.FC<SubtitleOverlayProps> = ({ text, language, confidence, visible, status }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const hasContent = Boolean(text) || Boolean(status);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible && hasContent ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [hasContent, opacity, visible]);

  if (!hasContent) {
    return null;
  }

  const meta = useMemo(() => {
    const parts: string[] = [];
    if (language) {
      parts.push(language.toUpperCase());
    }
    if (typeof confidence === 'number') {
      parts.push(`${Math.round(confidence * 100)}%`);
    }
    if (status) {
      parts.push(status);
    }
    return parts.join(' • ');
  }, [confidence, language, status]);

  return (
  <Animated.View style={[styles.container, { opacity }]}> 
      {text ? <Text style={styles.text}>{text}</Text> : null}
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    backgroundColor: 'rgba(10,10,10,0.82)',
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 14,
    maxWidth: '90%',
  },
  text: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  meta: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    letterSpacing: 1,
  },
});

export default SubtitleOverlay;
