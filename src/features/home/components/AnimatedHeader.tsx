import React, { useState } from 'react';
import { Text, Pressable, View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { interpolate, useAnimatedStyle, type AnimatedStyleProp } from 'react-native-reanimated';
import { homeStyles } from '../styles';
import { CallCategoryModal } from './CallCategoryModal';

interface AnimatedHeaderProps {
  containerStyle: AnimatedStyleProp<any>;
  title: string;
  scrollDirection: Animated.SharedValue<number>;
  onSearch: () => void;
  onStartCall: () => void;
}

export function AnimatedHeader({ containerStyle, title, scrollDirection, onSearch, onStartCall }: AnimatedHeaderProps) {
  const [showCategories, setShowCategories] = useState(false);
  const insets = useSafeAreaInsets();

  const titleStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(scrollDirection.value, [0, 1], [1, 0.96], 'clamp')
      }
    ]
  }));

  const tabsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollDirection.value, [0, 0.5, 1], [1, 0.8, 0], 'clamp'),
    transform: [
      {
        translateY: interpolate(scrollDirection.value, [0, 1], [0, -32], 'clamp')
      }
    ],
    height: interpolate(scrollDirection.value, [0, 1], [44, 0], 'clamp')
  }));

  return (
    <>
      <Animated.View style={[homeStyles.header]}>
        <Animated.View style={[homeStyles.blurContainer, { paddingTop: insets.top }, containerStyle]}>
          <BlurView tint="systemThickMaterialDark" intensity={96} style={StyleSheet.absoluteFill} />
          <Animated.View style={[homeStyles.headerTitleContainer, titleStyle]}>
            <Text style={homeStyles.headerTitle}>{title}</Text>
            <View style={homeStyles.headerButtons}>
              <Pressable style={homeStyles.searchButton} onPress={onSearch}>
                <Ionicons name="search" size={24} color="#fff" />
              </Pressable>
              <Pressable style={homeStyles.searchButton} onPress={() => setShowCategories(true)}>
                <Ionicons name="sparkles" size={24} color="#fff" />
              </Pressable>
              <Pressable style={homeStyles.searchButton} onPress={onStartCall}>
                <Ionicons name="videocam" size={24} color="#fff" />
              </Pressable>
            </View>
          </Animated.View>
          <Animated.View style={[homeStyles.categoryTabs, tabsStyle]}>
            <Pressable style={homeStyles.categoryTab} onPress={() => setShowCategories(true)}>
              <Text style={homeStyles.categoryTabText}>Live</Text>
            </Pressable>
            <Pressable style={homeStyles.categoryTab} onPress={() => setShowCategories(true)}>
              <Text style={homeStyles.categoryTabText}>Teams</Text>
            </Pressable>
            <Pressable style={homeStyles.categoryTab} onPress={() => setShowCategories(true)}>
              <Text style={homeStyles.categoryTabText}>Languages</Text>
              <Ionicons name="chevron-down" size={16} color="#fff" />
            </Pressable>
          </Animated.View>
        </Animated.View>
      </Animated.View>
      <CallCategoryModal visible={showCategories} onClose={() => setShowCategories(false)} />
    </>
  );
}
