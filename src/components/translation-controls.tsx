import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TranslationState } from '../services/video-call-translation';
import { getSourceLabel, getTargetLabel } from '../constants/palabra-langs';
import type { SourceLangCode, TargetLangCode } from '../services/palabra/types';

interface Props {
  state: TranslationState;
  enabled: boolean;
  sourceLang: SourceLangCode;
  targetLang: TargetLangCode;
  onToggle: () => void;
  onSettings: () => void;
}

const TranslationControls: React.FC<Props> = ({
  state,
  enabled,
  sourceLang,
  targetLang,
  onToggle,
  onSettings,
}) => {
  const getStatusColor = () => {
    switch (state) {
      case 'active':
        return '#22c55e';
      case 'connecting':
        return '#f59e0b';
      case 'error':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusText = () => {
    switch (state) {
      case 'active':
        return 'Live';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Error';
      default:
        return 'Off';
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.toggleBtn, enabled && styles.toggleActive]}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        {state === 'connecting' ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons
            name={enabled ? 'language' : 'language-outline'}
            size={20}
            color="#fff"
          />
        )}
      </TouchableOpacity>

      {enabled && (
        <TouchableOpacity style={styles.infoRow} onPress={onSettings}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <Text style={styles.statusText}>{getStatusText()}</Text>
          <Text style={styles.langText}>
            {getSourceLabel(sourceLang)} to {getTargetLabel(targetLang)}
          </Text>
          <Ionicons name="chevron-forward" size={14} color="#9ca3af" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: '#8b5cf6',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  langText: {
    fontSize: 11,
    color: '#d1d5db',
  },
});

export default TranslationControls;
