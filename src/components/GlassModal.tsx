import React, { ReactNode, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
} from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

const { width } = Dimensions.get('window');
const ANIMATION_DURATION = 250;

interface GlassModalProps {
  isVisible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: string;
  children: ReactNode;
  height?: number;
  showGradient?: boolean;
  headerActions?: ReactNode;
}

export default function GlassModal({
  isVisible,
  onClose,
  title,
  subtitle,
  icon = 'apps',
  children,
  height = 650,
  showGradient = true,
  headerActions,
}: GlassModalProps) {
  const { colors, isDark } = useTheme();
  const [modalVisible, setModalVisible] = useState(isVisible);
  const [animating, setAnimating] = useState(isVisible);

  useEffect(() => {
    if (isVisible) {
      setModalVisible(true);
      setAnimating(true);
    } else if (modalVisible) {
      setAnimating(false);
      const timer = setTimeout(() => {
        setModalVisible(false);
      }, ANIMATION_DURATION);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  const handleClose = () => {
    setAnimating(false);
    setTimeout(() => {
      setModalVisible(false);
      onClose();
    }, ANIMATION_DURATION);
  };

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <AnimatePresence>
        {animating && (
          <View style={styles.overlay} key="modal-overlay">
            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'timing', duration: ANIMATION_DURATION }}
              style={[
                styles.backdrop,
                {
                  backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)',
                }
              ]}
            >
              <TouchableOpacity
                style={styles.backdropTouchable}
                onPress={handleClose}
                activeOpacity={1}
              />
            </MotiView>

            <MotiView
              from={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'timing', duration: ANIMATION_DURATION }}
              style={[
                styles.bottomSheet,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  height: height,
                }
              ]}
            >
              {showGradient && (
                <LinearGradient
                  colors={['#8b5cf6' + '30', colors.surface + '80']}
                  style={styles.modalGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              )}

              <StatusBar style={isDark ? "light" : "dark"} />

              <View style={styles.header}>
                <View style={[styles.headerIcon, { backgroundColor: '#8b5cf6' + '20' }]}>
                  <Ionicons name={icon as any} size={24} color="#8b5cf6" />
                </View>
                <View style={styles.headerText}>
                  <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                  {subtitle && (
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                      {subtitle}
                    </Text>
                  )}
                </View>
                {headerActions ? headerActions : (
                  <View style={styles.glassCloseButton}>
                    <TouchableOpacity
                      style={[
                        styles.closeButton,
                        {
                          backgroundColor: isDark
                            ? 'rgba(40, 40, 40, 0.3)'
                            : 'rgba(255, 255, 255, 0.4)',
                          borderColor: isDark
                            ? 'rgba(255, 255, 255, 0.15)'
                            : 'rgba(255, 255, 255, 0.6)',
                        }
                      ]}
                      onPress={handleClose}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={styles.content}>
                {children}
              </View>
            </MotiView>
          </View>
        )}
      </AnimatePresence>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdropTouchable: {
    flex: 1,
  },
  bottomSheet: {
    width: width * 0.9,
    maxWidth: 400,
    borderRadius: 20,
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  modalGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    pointerEvents: 'none',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    gap: 12,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  glassCloseButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
});
