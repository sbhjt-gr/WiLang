import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, ScrollView, StyleSheet, Platform, TouchableOpacity, StatusBar, TextInput, Text, Image } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/navigation';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import GlassModal from '../../components/GlassModal';

type CallsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'HomeScreen'>;

interface Props {
  navigation: CallsScreenNavigationProp;
}

export default function CallsScreen({ navigation }: Props) {
  const [id, setID] = useState<string>('');
  const textInputRef = useRef<TextInput>(null);
  const { colors } = useTheme();
  const [modalConfig, setModalConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    icon: string;
  }>({
    visible: false,
    title: '',
    message: '',
    icon: 'information-circle',
  });

  const showModal = (title: string, message: string, icon: string = 'information-circle') => {
    setModalConfig({
      visible: true,
      title,
      message,
      icon,
    });
  };

  const closeModal = () => {
    setModalConfig(prev => ({ ...prev, visible: false }));
  };

  const meet = (): void => {
    if (id.trim()) {
      const rawInput = id.trim();
      const isOnlyNumeric = /^[0-9]+$/.test(rawInput);
      const numericId = parseInt(rawInput);
      if (isOnlyNumeric && !isNaN(numericId)) {
        navigation.navigate('VideoCallScreen', {
          id: numericId.toString(),
          type: 'join',
          joinCode: numericId.toString()
        });
      } else {
        const cleanCode = rawInput.toUpperCase();

        if (/^[A-Z0-9]{4,8}$/.test(cleanCode)) {
          navigation.navigate('VideoCallScreen', {
            id: Date.now().toString(),
            type: 'join',
            joinCode: cleanCode
          });
        } else {
          showModal("Invalid Code", "Join codes should be 4-8 characters using letters and numbers only.", "alert-circle");
        }
      }
    } else {
      showModal("Missing Meeting ID", "Please enter a valid meeting ID or join code to join the call.", "information-circle");
    }
  };
  
  const createMeeting = (): void => {
    const meetingId = `INSTANT_${Date.now()}`;
    navigation.navigate('VideoCallScreen', {
      id: meetingId,
      type: 'instant'
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        automaticallyAdjustKeyboardInsets={true}
        nestedScrollEnabled={false}
      >
        <View style={styles.actionsSection}>
          <View style={styles.instantActions}>
            <TouchableOpacity
              style={[styles.primaryActionCard, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
              onPress={createMeeting}
            >
              <Ionicons name="videocam" size={32} color="#8b5cf6" />
              <Text style={[styles.primaryActionTitle, { color: colors.text }]}>Start a meeting</Text>
              <Text style={[styles.primaryActionSubtitle, { color: colors.textSecondary }]}>Begin translating immediately</Text>
            </TouchableOpacity>

            <View style={styles.secondaryActions}>
              <TouchableOpacity
                style={[styles.secondaryActionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => {}}
              >
                <View style={styles.secondaryActionContent}>
                  <Ionicons name="mic" size={24} color="#8b5cf6" />
                  <Text style={[styles.secondaryActionTitle, { color: colors.text }]}>Voice Only</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryActionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => {}}
              >
                <View style={styles.secondaryActionContent}>
                  <Ionicons name="people" size={24} color="#8b5cf6" />
                  <Text style={[styles.secondaryActionTitle, { color: colors.text }]}>Group Call</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.joinSection}>
          <View style={[styles.joinCard, { backgroundColor: colors.surface }]}>
            <View style={styles.joinHeader}>
              <Ionicons name="enter-outline" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Join a Meeting</Text>
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                ref={textInputRef}
                style={[styles.meetingInput, { backgroundColor: colors.backgroundTertiary, color: colors.text, borderColor: colors.border }]}
                placeholder="Enter meeting code (e.g. ABC123)"
                placeholderTextColor={colors.textTertiary}
                value={id}
                onChangeText={setID}
                autoCapitalize="characters"
                autoCorrect={false}
                autoComplete="off"
                keyboardType="default"
                returnKeyType="done"
                onSubmitEditing={meet}
              />
            </View>

            <TouchableOpacity
              style={[styles.joinMeetingButton, { backgroundColor: colors.surface, borderColor: '#8b5cf6', borderWidth: 1 }, !id.trim() && { borderColor: colors.border }]}
              onPress={meet}
              disabled={!id.trim()}
            >
              <Text style={[styles.joinMeetingButtonText, { color: '#8b5cf6' }, !id.trim() && { color: colors.textTertiary }]}>
                Join Meeting
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <GlassModal
        isVisible={modalConfig.visible}
        onClose={closeModal}
        title={modalConfig.title}
        icon={modalConfig.icon}
        height={250}
      >
        <Text style={[styles.modalMessage, { color: colors.text }]}>
          {modalConfig.message}
        </Text>
        <View style={styles.modalButtons}>
          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: '#8b5cf6' }]}
            onPress={closeModal}
          >
            <Text style={styles.modalButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </GlassModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  actionsSection: {
    marginBottom: 24,
  },
  instantActions: {
    gap: 16,
  },
  primaryActionCard: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
  },
  primaryActionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 4,
  },
  primaryActionSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryActionCard: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryActionContent: {
    alignItems: 'center',
  },
  secondaryActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  joinSection: {
    marginBottom: 24,
  },
  joinCard: {
    borderRadius: 20,
    padding: 24,
  },
  joinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  inputContainer: {
    marginBottom: 20,
  },
  meetingInput: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    borderWidth: 2,
  },
  joinMeetingButton: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinMeetingButtonDisabled: {
  },
  joinMeetingButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  joinMeetingButtonTextDisabled: {
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 20,
    borderWidth: 2,
  },
  inputWrapperFocused: {
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 2,
  },
  joinButtonDisabled: {
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  joinButtonTextDisabled: {
  },
  joinButtonIcon: {
    marginLeft: 8,
  },
  languageBanner: {
    marginBottom: 24,
  },
  languageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
  },
  languageContent: {
    flex: 1,
    marginLeft: 16,
  },
  languageTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  languageSubtitle: {
    fontSize: 14,
  },
  languageButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalMessage: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
