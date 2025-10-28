import { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

type SubtitleOverlayProps = {
  text: string;
  language?: string | null;
  confidence?: number | null;
  visible: boolean;
  status?: string | null;
};

const SubtitleOverlay = ({ text, language, confidence, visible, status }: SubtitleOverlayProps) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const hasText = Boolean(text) || Boolean(status);

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

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible && hasText ? 1 : 0,
      duration: 160,
      useNativeDriver: true,
    }).start();
  }, [hasText, opacity, visible]);

  if (!hasText) {
    return null;
  }

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
