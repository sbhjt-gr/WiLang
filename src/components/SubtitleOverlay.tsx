import { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

type SubtitleOverlayProps = {
  text: string;
  translatedText?: string | null;
  language?: string | null;
  targetLanguage?: string | null;
  confidence?: number | null;
  visible: boolean;
  status?: string | null;
  showBothLanguages?: boolean;
};

const toCode = (value?: string | null) => {
  if (!value) {
    return null;
  }
  return value.toUpperCase();
};

const SubtitleOverlay = ({
	text,
	translatedText,
	language,
	targetLanguage,
	confidence,
	visible,
	status,
	showBothLanguages,
}: SubtitleOverlayProps) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const mainText = translatedText && translatedText.length > 0 ? translatedText : text;
  const showSecondary = Boolean(showBothLanguages && translatedText && text && translatedText !== text);
  const secondaryText = showSecondary ? text : null;
  const hasText = Boolean(mainText) || Boolean(status) || Boolean(secondaryText);

  const meta = useMemo(() => {
    const parts: string[] = [];
    const sourceCode = toCode(language);
    const targetCode = toCode(targetLanguage);
    if (sourceCode && targetCode) {
      parts.push(`${sourceCode}>${targetCode}`);
    } else if (sourceCode) {
      parts.push(sourceCode);
    } else if (targetCode) {
      parts.push(`>${targetCode}`);
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
      {mainText ? <Text style={styles.text}>{mainText}</Text> : null}
      {secondaryText ? <Text style={styles.secondary}>{secondaryText}</Text> : null}
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
  secondary: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 6,
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
