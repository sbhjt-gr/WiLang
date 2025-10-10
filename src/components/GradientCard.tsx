import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientCardProps {
  children: React.ReactNode;
  colors?: [string, string, ...string[]];
  style?: ViewStyle;
  onPress?: () => void;
  glassmorphism?: boolean;
}

const GradientCard: React.FC<GradientCardProps> = ({
  children,
  colors = ['#8b5cf6', '#ec4899'],
  style,
  onPress,
  glassmorphism = false
}) => {
  const Container = onPress ? TouchableOpacity : View;

  if (glassmorphism) {
    return (
      <Container style={[styles.container, style]} onPress={onPress}>
        <View style={styles.glassmorphContainer}>
          <LinearGradient
            colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
            style={styles.glassmorphGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {children}
          </LinearGradient>
        </View>
      </Container>
    );
  }

  return (
    <Container style={[styles.container, style]} onPress={onPress}>
      <LinearGradient
        colors={colors}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {children}
      </LinearGradient>
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradient: {
    padding: 16,
  },
  glassmorphContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  glassmorphGradient: {
    padding: 16,
  },
});

export default GradientCard;