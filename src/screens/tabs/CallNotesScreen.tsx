import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useFocusEffect } from '@react-navigation/native';
import { callNotesStorage } from '../../services/call-notes-storage';
import { geminiSummaryService } from '../../services/gemini-summary';
import { CallNotePreview, CallType } from '../../types/call-summary';
import GlassModal from '../../components/GlassModal';

type FilterType = 'all' | 'video' | 'voice' | 'qr-translation';

export default function CallNotesScreen() {
  const { colors } = useTheme();
  const [notes, setNotes] = useState<CallNotePreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedNote, setSelectedNote] = useState<CallNotePreview | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [noteDetail, setNoteDetail] = useState<{
    summary: string;
    keyPoints: string[];
    actionItems?: string[];
    topics?: string[];
    sentiment?: string;
  } | null>(null);

  const loadNotes = async (forceRefresh: boolean = false) => {
    try {
      const callType = filter === 'all' ? undefined : filter as CallType;
      const fetchedNotes = await callNotesStorage.getCallNotes(50, 0, callType);
      setNotes(fetchedNotes);
    } catch (error) {
      console.error('[CallNotes] Load failed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadNotes(false);
    }, [filter])
  );

  useEffect(() => {
    loadNotes(true);
  }, [filter]);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotes(true);
  };

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m`;
    }
    return `${seconds}s`;
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays === 1) {
      return 'Yesterday';
    }
    if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getCallTypeIcon = (type: CallType): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'video':
        return 'videocam';
      case 'voice':
        return 'call';
      case 'qr-translation':
        return 'scan';
      default:
        return 'chatbubble';
    }
  };

  const getCallTypeColor = (type: CallType): string => {
    switch (type) {
      case 'video':
        return '#8b5cf6';
      case 'voice':
        return '#10b981';
      case 'qr-translation':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const handleNotePress = async (note: CallNotePreview) => {
    setSelectedNote(note);
    setShowDetailModal(true);
    setDetailLoading(true);

    try {
      const fullNote = await callNotesStorage.getCallNote(note.id);
      if (fullNote) {
        setNoteDetail({
          summary: fullNote.summary.summary,
          keyPoints: fullNote.summary.keyPoints,
          actionItems: fullNote.summary.actionItems,
          topics: fullNote.summary.topics,
          sentiment: fullNote.summary.sentiment,
        });
      }
    } catch (error) {
      console.error('[CallNotes] Load detail failed:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDeleteNote = (noteId: string) => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this call note? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await callNotesStorage.deleteCallNote(noteId);
            setShowDetailModal(false);
            loadNotes(true);
          },
        },
      ]
    );
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedNote(null);
    setNoteDetail(null);
  };

  const getSentimentIcon = (sentiment?: string): keyof typeof Ionicons.glyphMap => {
    switch (sentiment) {
      case 'positive':
        return 'happy';
      case 'negative':
        return 'sad';
      default:
        return 'remove';
    }
  };

  const getSentimentColor = (sentiment?: string): string => {
    switch (sentiment) {
      case 'positive':
        return '#10b981';
      case 'negative':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const renderFilterButtons = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filterContainer}
      contentContainerStyle={styles.filterContent}
    >
      {[
        { key: 'all', label: 'All', icon: 'layers' },
        { key: 'video', label: 'Video', icon: 'videocam' },
        { key: 'voice', label: 'Voice', icon: 'call' },
        { key: 'qr-translation', label: 'Translate', icon: 'scan' },
      ].map(({ key, label, icon }) => (
        <TouchableOpacity
          key={key}
          style={[
            styles.filterButton,
            {
              backgroundColor: filter === key ? '#8b5cf6' : colors.surface,
              borderColor: filter === key ? '#8b5cf6' : colors.border,
            },
          ]}
          onPress={() => setFilter(key as FilterType)}
        >
          <Ionicons
            name={icon as keyof typeof Ionicons.glyphMap}
            size={16}
            color={filter === key ? '#ffffff' : colors.textSecondary}
          />
          <Text
            style={[
              styles.filterButtonText,
              { color: filter === key ? '#ffffff' : colors.textSecondary },
            ]}
          >
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderNoteCard = (note: CallNotePreview) => (
    <TouchableOpacity
      key={note.id}
      style={[styles.noteCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => handleNotePress(note)}
      activeOpacity={0.7}
    >
      <View style={styles.noteHeader}>
        <View style={[styles.typeIcon, { backgroundColor: getCallTypeColor(note.callType) + '20' }]}>
          <Ionicons
            name={getCallTypeIcon(note.callType)}
            size={18}
            color={getCallTypeColor(note.callType)}
          />
        </View>
        <View style={styles.noteHeaderText}>
          <Text style={[styles.noteTitle, { color: colors.text }]} numberOfLines={1}>
            {note.title}
          </Text>
          <View style={styles.noteMeta}>
            <Text style={[styles.noteMetaText, { color: colors.textSecondary }]}>
              {formatDate(note.startTime)}
            </Text>
            <Text style={[styles.noteMetaDot, { color: colors.textTertiary }]}>•</Text>
            <Text style={[styles.noteMetaText, { color: colors.textSecondary }]}>
              {formatDuration(note.duration)}
            </Text>
            {note.participants.length > 0 && (
              <>
                <Text style={[styles.noteMetaDot, { color: colors.textTertiary }]}>•</Text>
                <Ionicons name="people" size={12} color={colors.textSecondary} />
                <Text style={[styles.noteMetaText, { color: colors.textSecondary }]}>
                  {note.participants.length}
                </Text>
              </>
            )}
          </View>
        </View>
        <View style={styles.keyPointsBadge}>
          <Ionicons name="bulb" size={12} color="#f59e0b" />
          <Text style={styles.keyPointsText}>{note.keyPointsCount}</Text>
        </View>
      </View>
      <Text
        style={[styles.noteSummary, { color: colors.textSecondary }]}
        numberOfLines={2}
      >
        {note.summaryPreview}
      </Text>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.surface }]}>
        <Ionicons name="document-text-outline" size={48} color={colors.textTertiary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Call Notes Yet</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        {geminiSummaryService.isConfigured()
          ? 'Your call summaries and key points will appear here after your calls.'
          : 'Add your Gemini API key in settings to enable AI-powered call summaries.'}
      </Text>
      {!geminiSummaryService.isConfigured() && (
        <View style={styles.apiKeyWarning}>
          <Ionicons name="key" size={16} color="#f59e0b" />
          <Text style={[styles.apiKeyWarningText, { color: '#f59e0b' }]}>
            Gemini API key required
          </Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading call notes...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderFilterButtons()}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" />
        }
      >
        {notes.length === 0 ? (
          renderEmptyState()
        ) : (
          notes.map(renderNoteCard)
        )}
      </ScrollView>

      <GlassModal
        isVisible={showDetailModal}
        onClose={closeDetailModal}
        title={selectedNote?.title || 'Call Note'}
        icon="document-text"
        height={500}
      >
        {detailLoading ? (
          <View style={styles.detailLoading}>
            <ActivityIndicator size="small" color="#8b5cf6" />
            <Text style={[styles.detailLoadingText, { color: colors.textSecondary }]}>
              Loading details...
            </Text>
          </View>
        ) : noteDetail ? (
          <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
            {/* Sentiment Badge */}
            {noteDetail.sentiment && (
              <View style={styles.sentimentBadge}>
                <Ionicons
                  name={getSentimentIcon(noteDetail.sentiment)}
                  size={16}
                  color={getSentimentColor(noteDetail.sentiment)}
                />
                <Text style={[styles.sentimentText, { color: getSentimentColor(noteDetail.sentiment) }]}>
                  {noteDetail.sentiment.charAt(0).toUpperCase() + noteDetail.sentiment.slice(1)} tone
                </Text>
              </View>
            )}

            {/* Summary */}
            <View style={styles.detailSection}>
              <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Summary</Text>
              <Text style={[styles.detailSectionText, { color: colors.textSecondary }]}>
                {noteDetail.summary}
              </Text>
            </View>

            {/* Key Points */}
            {noteDetail.keyPoints.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>
                  <Ionicons name="bulb" size={14} color="#f59e0b" /> Key Points
                </Text>
                {noteDetail.keyPoints.map((point, index) => (
                  <View key={index} style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={[styles.bulletText, { color: colors.textSecondary }]}>
                      {point}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Action Items */}
            {noteDetail.actionItems && noteDetail.actionItems.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>
                  <Ionicons name="checkbox" size={14} color="#10b981" /> Action Items
                </Text>
                {noteDetail.actionItems.map((item, index) => (
                  <View key={index} style={styles.bulletPoint}>
                    <Ionicons name="square-outline" size={14} color="#10b981" />
                    <Text style={[styles.bulletText, { color: colors.textSecondary }]}>
                      {item}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Topics */}
            {noteDetail.topics && noteDetail.topics.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Topics</Text>
                <View style={styles.topicsContainer}>
                  {noteDetail.topics.map((topic, index) => (
                    <View key={index} style={[styles.topicTag, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.topicText, { color: colors.textSecondary }]}>
                        {topic}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Delete Button */}
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => selectedNote && handleDeleteNote(selectedNote.id)}
            >
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
              <Text style={styles.deleteButtonText}>Delete Note</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : null}
      </GlassModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  filterContainer: {
    maxHeight: 50,
    marginTop: 8,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  noteCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  noteHeaderText: {
    flex: 1,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  noteMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  noteMetaText: {
    fontSize: 12,
  },
  noteMetaDot: {
    fontSize: 12,
  },
  keyPointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  keyPointsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f59e0b',
  },
  noteSummary: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  apiKeyWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  apiKeyWarningText: {
    fontSize: 13,
    fontWeight: '500',
  },
  detailLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  detailLoadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  detailScroll: {
    flex: 1,
  },
  sentimentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    marginBottom: 16,
    gap: 6,
  },
  sentimentText: {
    fontSize: 12,
    fontWeight: '500',
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  detailSectionText: {
    fontSize: 14,
    lineHeight: 22,
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 10,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8b5cf6',
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  topicsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topicTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  topicText: {
    fontSize: 13,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#ef4444',
  },
});
