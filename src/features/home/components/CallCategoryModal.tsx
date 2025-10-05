import React from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface CallCategoryModalProps {
  visible: boolean;
  onClose: () => void;
}

const categories = [
  'Live Calls',
  'Pinned Teams',
  'Language Pods',
  'Customer Support',
  'Healthcare Interpreters',
  'Community Events',
  'One on One',
  'Workshops',
  'Town Halls',
  'Training'
];

export function CallCategoryModal({ visible, onClose }: CallCategoryModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
          <ScrollView
            style={[styles.content, { paddingTop: insets.top }]}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
            showsVerticalScrollIndicator={false}
          >
            {categories.map(item => (
              <Pressable key={item} style={styles.categoryItem} onPress={onClose}>
                <Text style={styles.categoryText}>{item}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 20 }]}>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={26} color="#000" />
            </Pressable>
          </View>
        </BlurView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  content: {
    flex: 1
  },
  scrollContent: {
    paddingHorizontal: 24
  },
  categoryItem: {
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)'
  },
  categoryText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 18,
    fontWeight: '500'
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center'
  },
  closeButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center'
  }
});
