import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  SOURCE_LANGS,
  TARGET_LANGS,
  type LangOption,
} from '../constants/palabra-langs';
import type { SourceLangCode, TargetLangCode } from '../services/palabra/types';

type Mode = 'source' | 'target';

interface Props {
  visible: boolean;
  mode: Mode;
  currentCode: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}

const LanguageSelector: React.FC<Props> = ({
  visible,
  mode,
  currentCode,
  onSelect,
  onClose,
}) => {
  const [search, setSearch] = useState('');

  const languages = mode === 'source' ? SOURCE_LANGS : TARGET_LANGS;

  const filtered = languages.filter((lang: LangOption<SourceLangCode | TargetLangCode>) =>
    lang.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (code: string) => {
    onSelect(code);
    setSearch('');
    onClose();
  };

  const renderItem = ({ item }: { item: LangOption<SourceLangCode | TargetLangCode> }) => {
    const isSelected = item.id === currentCode;
    return (
      <TouchableOpacity
        style={[styles.item, isSelected && styles.itemSelected]}
        onPress={() => handleSelect(item.id)}
        activeOpacity={0.7}
      >
        <Text style={[styles.itemText, isSelected && styles.itemTextSelected]}>
          {item.label}
        </Text>
        {isSelected && (
          <Ionicons name="checkmark" size={20} color="#8b5cf6" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.title}>
            {mode === 'source' ? 'Source Language' : 'Target Language'}
          </Text>
          <View style={styles.closeBtn} />
        </View>

        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search languages..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  itemSelected: {
    backgroundColor: '#f5f3ff',
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  itemText: {
    fontSize: 16,
    color: '#374151',
  },
  itemTextSelected: {
    color: '#8b5cf6',
    fontWeight: '600',
  },
});

export default LanguageSelector;
