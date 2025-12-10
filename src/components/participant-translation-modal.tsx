import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GlassModal from './GlassModal';
import { useTheme } from '../theme';
import { SOURCE_LANGS, TARGET_LANGS, getSourceLabel, getTargetLabel } from '../constants/palabra-langs';
import type { SourceLangCode, TargetLangCode } from '../services/palabra/types';

export interface ParticipantTranslation {
  peerId: string;
  name: string;
  enabled: boolean;
  source: SourceLangCode;
  target: TargetLangCode;
}

interface Props {
  isVisible: boolean;
  onClose: () => void;
  participants: ParticipantTranslation[];
  onSave: (settings: ParticipantTranslation[]) => void;
  localUser?: { name: string };
}

type SelectingLang = { peerId: string; type: 'source' | 'target' } | null;

export default function ParticipantTranslationModal({
  isVisible,
  onClose,
  participants,
  onSave,
  localUser,
}: Props) {
  const { colors } = useTheme();
  const [settings, setSettings] = useState<ParticipantTranslation[]>(participants);
  const [selectingLang, setSelectingLang] = useState<SelectingLang>(null);
  const [search, setSearch] = useState('');

  React.useEffect(() => {
    if (isVisible) {
      setSettings(participants);
    }
  }, [isVisible, participants]);

  const handleToggle = useCallback((peerId: string, enabled: boolean) => {
    setSettings(prev =>
      prev.map(p => (p.peerId === peerId ? { ...p, enabled } : p))
    );
  }, []);

  const handleSourceChange = useCallback((peerId: string, source: SourceLangCode) => {
    setSettings(prev =>
      prev.map(p => (p.peerId === peerId ? { ...p, source } : p))
    );
    setSelectingLang(null);
    setSearch('');
  }, []);

  const handleTargetChange = useCallback((peerId: string, target: TargetLangCode) => {
    setSettings(prev =>
      prev.map(p => (p.peerId === peerId ? { ...p, target } : p))
    );
    setSelectingLang(null);
    setSearch('');
  }, []);

  const handleSave = useCallback(() => {
    onSave(settings);
    onClose();
  }, [settings, onSave, onClose]);

  const handleClose = useCallback(() => {
    setSelectingLang(null);
    setSearch('');
    onClose();
  }, [onClose]);

  const filteredSource = useMemo(() => {
    if (!search.trim()) return SOURCE_LANGS;
    return SOURCE_LANGS.filter(l =>
      l.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  const filteredTarget = useMemo(() => {
    if (!search.trim()) return TARGET_LANGS;
    return TARGET_LANGS.filter(l =>
      l.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  const renderLangItem = useCallback(
    ({
      item,
      isSelected,
      onSelect,
    }: {
      item: { id: string; label: string };
      isSelected: boolean;
      onSelect: (id: string) => void;
    }) => (
      <TouchableOpacity
        style={[styles.langItem, isSelected && styles.langItemSelected]}
        onPress={() => onSelect(item.id)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.langText,
            { color: colors.text },
            isSelected && styles.langTextSelected,
          ]}
        >
          {item.label}
        </Text>
        {isSelected && <Ionicons name="checkmark" size={20} color="#8b5cf6" />}
      </TouchableOpacity>
    ),
    [colors.text]
  );

  const currentParticipant = selectingLang
    ? settings.find(p => p.peerId === selectingLang.peerId)
    : null;

  if (selectingLang && currentParticipant) {
    const isSource = selectingLang.type === 'source';
    return (
      <GlassModal
        isVisible={isVisible}
        onClose={() => {
          setSelectingLang(null);
          setSearch('');
        }}
        title={isSource ? 'Speaker Language' : 'Translate To'}
        subtitle={`For ${currentParticipant.name}`}
        icon={isSource ? 'mic-outline' : 'ear-outline'}
        height={500}
      >
        <View
          style={[
            styles.searchRow,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search languages..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        {isSource ? (
          <FlatList
            data={filteredSource}
            keyExtractor={item => item.id}
            renderItem={({ item }) =>
              renderLangItem({
                item: { id: item.id, label: item.label },
                isSelected: item.id === currentParticipant.source,
                onSelect: id => handleSourceChange(selectingLang.peerId, id as SourceLangCode),
              })
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.langList}
          />
        ) : (
          <FlatList
            data={filteredTarget}
            keyExtractor={item => item.id}
            renderItem={({ item }) =>
              renderLangItem({
                item: { id: item.id, label: item.label },
                isSelected: item.id === currentParticipant.target,
                onSelect: id => handleTargetChange(selectingLang.peerId, id as TargetLangCode),
              })
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.langList}
          />
        )}
      </GlassModal>
    );
  }

  return (
    <GlassModal
      isVisible={isVisible}
      onClose={handleClose}
      title="Participant Translation"
      subtitle="Configure translation for each speaker"
      icon="language"
      height={520}
      headerActions={
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: '#8b5cf6' }]}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      >
        {localUser && (
          <View style={[styles.localCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.participantHeader}>
              <View style={styles.avatarLocal}>
                <Ionicons name="person" size={18} color="#ffffff" />
              </View>
              <View style={styles.participantInfo}>
                <Text style={[styles.participantName, { color: colors.text }]}>
                  {localUser.name} (You)
                </Text>
                <Text style={[styles.participantSub, { color: colors.textSecondary }]}>
                  Your speech will be translated
                </Text>
              </View>
            </View>
          </View>
        )}

        {settings.map(participant => (
          <View
            key={participant.peerId}
            style={[
              styles.participantCard,
              { backgroundColor: colors.background, borderColor: colors.border },
            ]}
          >
            <View style={styles.participantHeader}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={18} color="#ffffff" />
              </View>
              <View style={styles.participantInfo}>
                <Text style={[styles.participantName, { color: colors.text }]}>
                  {participant.name}
                </Text>
                <Text style={[styles.participantSub, { color: colors.textSecondary }]}>
                  {participant.enabled
                    ? `${getSourceLabel(participant.source)} → ${getTargetLabel(participant.target)}`
                    : 'Translation disabled'}
                </Text>
              </View>
              <Switch
                value={participant.enabled}
                onValueChange={val => handleToggle(participant.peerId, val)}
                trackColor={{ false: colors.border, true: '#8b5cf6' }}
                thumbColor="#fff"
              />
            </View>

            {participant.enabled && (
              <View style={styles.langSettings}>
                <TouchableOpacity
                  style={[styles.langPicker, { borderColor: colors.border }]}
                  onPress={() =>
                    setSelectingLang({ peerId: participant.peerId, type: 'source' })
                  }
                >
                  <Ionicons name="mic-outline" size={18} color="#8b5cf6" />
                  <View style={styles.langPickerText}>
                    <Text style={[styles.langLabel, { color: colors.textSecondary }]}>
                      Speaks
                    </Text>
                    <Text style={[styles.langValue, { color: colors.text }]}>
                      {getSourceLabel(participant.source)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.langPicker, { borderColor: colors.border }]}
                  onPress={() =>
                    setSelectingLang({ peerId: participant.peerId, type: 'target' })
                  }
                >
                  <Ionicons name="ear-outline" size={18} color="#8b5cf6" />
                  <View style={styles.langPickerText}>
                    <Text style={[styles.langLabel, { color: colors.textSecondary }]}>
                      Translate to
                    </Text>
                    <Text style={[styles.langValue, { color: colors.text }]}>
                      {getTargetLabel(participant.target)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}

        {settings.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No other participants in the call yet
            </Text>
          </View>
        )}
      </ScrollView>
    </GlassModal>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    paddingBottom: 20,
  },
  localCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    opacity: 0.7,
  },
  participantCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  participantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLocal: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 15,
    fontWeight: '600',
  },
  participantSub: {
    fontSize: 12,
    marginTop: 2,
  },
  langSettings: {
    marginTop: 14,
    gap: 10,
  },
  langPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  langPickerText: {
    flex: 1,
  },
  langLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  langValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  langList: {
    paddingBottom: 20,
  },
  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  langItemSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 8,
    marginHorizontal: -4,
    paddingHorizontal: 8,
  },
  langText: {
    fontSize: 16,
  },
  langTextSelected: {
    color: '#8b5cf6',
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
