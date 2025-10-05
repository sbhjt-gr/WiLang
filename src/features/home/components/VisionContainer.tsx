import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';

interface VisionContainerProps {
  children: React.ReactNode;
  style?: any;
}

export function VisionContainer({ children, style }: VisionContainerProps) {
  return <View style={[styles.container, style]}>{children}</View>;
}

interface HoverableViewProps {
  children: React.ReactNode;
  style?: any;
  onPress?: () => void;
}

export function HoverableView({ children, style, onPress }: HoverableViewProps) {
  return (
    <Pressable style={style} onPress={onPress}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  }
});
