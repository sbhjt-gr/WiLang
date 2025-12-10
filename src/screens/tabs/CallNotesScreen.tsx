import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme';
import { useFocusEffect } from '@react-navigation/native';
import { callNotesStorage } from '../../services/call-notes-storage';
import { geminiSummaryService } from '../../services/gemini-summary';
import { CallNotePreview, CallType } from '../../types/call-summary';
import GlassModal from '../../components/GlassModal';

const { width } = Dimensions.get('window');

type FilterType = 'all' | 'video' | 'voice' | 'qr-translation';

export default function CallNotesScreen() {
  const { colors, isDark } = useTheme();
  const [notes, setNotes] = useState<CallNotePreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedNote, setSelectedNote] = useState<CallNotePreview | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [geminiConfigured, setGeminiConfigured] = useState(false);
  const [noteDetail, setNoteDetail] = useState<{
    summary: string;
    keyPoints: string[];
    actionItems?: string[];
    topics?: string[];
    sentiment?: string;
  } | null>(null);

  const stats = useMemo(() => {
    const totalNotes = notes.length;
    const totalKeyPoints = notes.reduce((acc, note) => acc + note.keyPointsCount, 0);
    const videoNotes = notes.filter(n => n.callType === 'video').length;
    const voiceNotes = notes.filter(n => n.callType === 'voice').length;
    return { totalNotes, totalKeyPoints, videoNotes, voiceNotes };
  }, [notes]);

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
      geminiSummaryService.isConfigured().then(setGeminiConfigured);
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

  const getCallTypeLabel = (type: CallType): string => {
    switch (type) {
      case 'video':
        return 'Video';
      case 'voice':
        return 'Voice';
      case 'qr-translation':
        return 'Translation';
      default:
        return 'Call';
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

  const renderStatsHeader = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.statIconContainer, { backgroundColor: '#8b5cf620' }]}>
            <Ionicons name="document-text" size={18} color="#8b5cf6" />
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalNotes}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Notes</Text>
          </View>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.statIconContainer, { backgroundColor: '#f59e0b20' }]}>
            <Ionicons name="bulb" size={18} color="#f59e0b" />
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalKeyPoints}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Key Points</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderFilterButtons = () => (
    <View style={styles.filterWrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContent}
      >
        {[
          { key: 'all', label: 'All', icon: 'layers' },
          { key: 'video', label: 'Video', icon: 'videocam' },
          { key: 'voice', label: 'Voice', icon: 'call' },
          { key: 'qr-translation', label: 'Translate', icon: 'scan' },
        ].map(({ key, label, icon }) => {
          const isActive = filter === key;
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.filterPill,
                {
                  backgroundColor: isActive ? '#8b5cf6' : colors.surface,
                  borderColor: isActive ? '#8b5cf6' : colors.border,
                },
              ]}
              onPress={() => setFilter(key as FilterType)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={icon as keyof typeof Ionicons.glyphMap}
                size={14}
                color={isActive ? '#ffffff' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.filterPillText,
                  { color: isActive ? '#ffffff' : colors.textSecondary },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderNoteCard = (note: CallNotePreview, index: number) => {
    const typeColor = getCallTypeColor(note.callType);
    
    return (
      <TouchableOpacity
        key={note.id}
        style={[styles.noteCard, { backgroundColor: colors.surface }]}
        onPress={() => handleNotePress(note)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[typeColor + '12', 'transparent']}
          style={styles.noteCardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.noteCardContent}>
          <View style={styles.noteHeader}>
            <View style={[styles.typeIconWrapper, { backgroundColor: typeColor + '20' }]}>
              <Ionicons
                name={getCallTypeIcon(note.callType)}
                size={18}
                color={typeColor}
              />
            </View>
            <View style={styles.noteHeaderInfo}>
              <Text style={[styles.noteTitle, { color: colors.text }]} numberOfLines={1}>
                {note.title}
              </Text>
              <View style={styles.noteMetaRow}>
                <View style={styles.noteMetaItem}>
                  <Ionicons name="time-outline" size={11} color={colors.textTertiary} />
                  <Text style={[styles.noteMetaText, { color: colors.textTertiary }]}>
                    {formatDate(note.startTime)}
                  </Text>
                </View>
                <View style={[styles.metaDot, { backgroundColor: colors.textTertiary }]} />
                <View style={styles.noteMetaItem}>
                  <Ionicons name="hourglass-outline" size={11} color={colors.textTertiary} />
                  <Text style={[styles.noteMetaText, { color: colors.textTertiary }]}>
                    {formatDuration(note.duration)}
                  </Text>
                </View>
                {note.participants.length > 0 && (
                  <>
                    <View style={[styles.metaDot, { backgroundColor: colors.textTertiary }]} />
                    <View style={styles.noteMetaItem}>
                      <Ionicons name="people-outline" size={11} color={colors.textTertiary} />
                      <Text style={[styles.noteMetaText, { color: colors.textTertiary }]}>
                        {note.participants.length}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </View>
            <View style={styles.keyPointsBadge}>
              <Ionicons name="bulb" size={12} color="#f59e0b" />
              <Text style={styles.keyPointsCount}>{note.keyPointsCount}</Text>
            </View>
          </View>

          <View style={[styles.summaryContainer, { borderColor: colors.border }]}>
            <Text
              style={[styles.noteSummary, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {note.summaryPreview}
            </Text>
          </View>

          <View style={styles.noteFooter}>
            <View style={[styles.typeTag, { backgroundColor: typeColor + '15' }]}>
              <Text style={[styles.typeTagText, { color: typeColor }]}>
                {getCallTypeLabel(note.callType)}
              </Text>
            </View>
            <View style={styles.viewMore}>
              <Text style={[styles.viewMoreText, { color: colors.textTertiary }]}>View details</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <LinearGradient
        colors={['#8b5cf620', 'transparent']}
        style={styles.emptyGradient}
      />
      <View style={[styles.emptyIconWrapper, { backgroundColor: colors.surface }]}>
        <View style={[styles.emptyIconInner, { backgroundColor: '#8b5cf615' }]}>
          <Ionicons name="document-text-outline" size={40} color="#8b5cf6" />
        </View>
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Call Notes Yet</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        {geminiConfigured
          ? 'Your AI-generated call summaries and key points will appear here after your calls end.'
          : 'Enable AI summaries by adding your Gemini API key in settings.'}
      </Text>
      {!geminiConfigured && (
        <View style={styles.apiKeyBanner}>
          <LinearGradient
            colors={['#f59e0b20', '#f59e0b10']}
            style={styles.apiKeyBannerGradient}
          />
          <View style={styles.apiKeyContent}>
            <View style={[styles.apiKeyIconWrapper, { backgroundColor: '#f59e0b20' }]}>
              <Ionicons name="key" size={18} color="#f59e0b" />
            </View>
            <View style={styles.apiKeyTextContainer}>
              <Text style={[styles.apiKeyTitle, { color: colors.text }]}>API Key Required</Text>
              <Text style={[styles.apiKeySubtitle, { color: colors.textSecondary }]}>
                Add your Gemini API key to get started
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </View>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContent}>
          <View style={[styles.loadingIconWrapper, { backgroundColor: '#8b5cf615' }]}>
            <ActivityIndicator size="large" color="#8b5cf6" />
          </View>
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading Notes</Text>
          <Text style={[styles.loadingSubtext, { color: colors.textSecondary }]}>
            Fetching your call summaries...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" />
        }
      >
        {renderStatsHeader()}
        {renderFilterButtons()}
        
        <View style={styles.notesContainer}>
          {notes.length === 0 ? (
            renderEmptyState()
          ) : (
            <>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Notes</Text>
                <Text style={[styles.sectionCount, { color: colors.textTertiary }]}>
                  {notes.length} {notes.length === 1 ? 'note' : 'notes'}
                </Text>
              </View>
              {notes.map((note, index) => renderNoteCard(note, index))}
            </>
          )}
        </View>
      </ScrollView>

      <GlassModal
        isVisible={showDetailModal}
        onClose={closeDetailModal}
        title={selectedNote?.title || 'Call Note'}
        icon="document-text"
        height={550}
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
            {selectedNote && (
              <View style={styles.detailMeta}>
                <View style={[styles.detailMetaItem, { backgroundColor: colors.surface }]}>
                  <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.detailMetaText, { color: colors.textSecondary }]}>
                    {formatDate(selectedNote.startTime)}
                  </Text>
                </View>
                <View style={[styles.detailMetaItem, { backgroundColor: colors.surface }]}>
                  <Ionicons name="hourglass-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.detailMetaText, { color: colors.textSecondary }]}>
                    {formatDuration(selectedNote.duration)}
                  </Text>
                </View>
                {noteDetail.sentiment && (
                  <View style={[styles.detailMetaItem, { backgroundColor: getSentimentColor(noteDetail.sentiment) + '15' }]}>
                    <Ionicons
                      name={getSentimentIcon(noteDetail.sentiment)}
                      size={14}
                      color={getSentimentColor(noteDetail.sentiment)}
                    />
                    <Text style={[styles.detailMetaText, { color: getSentimentColor(noteDetail.sentiment) }]}>
                      {noteDetail.sentiment}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View style={[styles.detailSection, { backgroundColor: colors.surface }]}>
              <View style={styles.detailSectionHeader}>
                <View style={[styles.detailSectionIcon, { backgroundColor: '#8b5cf615' }]}>
                  <Ionicons name="document-text" size={16} color="#8b5cf6" />
                </View>
                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Summary</Text>
              </View>
              <Text style={[styles.detailSectionText, { color: colors.textSecondary }]}>
                {noteDetail.summary}
              </Text>
            </View>

            {noteDetail.keyPoints.length > 0 && (
              <View style={[styles.detailSection, { backgroundColor: colors.surface }]}>
                <View style={styles.detailSectionHeader}>
                  <View style={[styles.detailSectionIcon, { backgroundColor: '#f59e0b15' }]}>
                    <Ionicons name="bulb" size={16} color="#f59e0b" />
                  </View>
                  <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Key Points</Text>
                  <View style={styles.detailSectionBadge}>
                    <Text style={styles.detailSectionBadgeText}>{noteDetail.keyPoints.length}</Text>
                  </View>
                </View>
                {noteDetail.keyPoints.map((point, index) => (
                  <View key={index} style={styles.bulletPoint}>
                    <View style={[styles.bulletDot, { backgroundColor: '#f59e0b' }]} />
                    <Text style={[styles.bulletText, { color: colors.textSecondary }]}>
                      {point}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {noteDetail.actionItems && noteDetail.actionItems.length > 0 && (
              <View style={[styles.detailSection, { backgroundColor: colors.surface }]}>
                <View style={styles.detailSectionHeader}>
                  <View style={[styles.detailSectionIcon, { backgroundColor: '#10b98115' }]}>
                    <Ionicons name="checkbox" size={16} color="#10b981" />
                  </View>
                  <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Action Items</Text>
                  <View style={[styles.detailSectionBadge, { backgroundColor: '#10b98120' }]}>
                    <Text style={[styles.detailSectionBadgeText, { color: '#10b981' }]}>
                      {noteDetail.actionItems.length}
                    </Text>
                  </View>
                </View>
                {noteDetail.actionItems.map((item, index) => (
                  <View key={index} style={styles.actionItem}>
                    <View style={[styles.actionCheckbox, { borderColor: '#10b981' }]}>
                      <Ionicons name="checkmark" size={10} color="transparent" />
                    </View>
                    <Text style={[styles.bulletText, { color: colors.textSecondary }]}>
                      {item}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {noteDetail.topics && noteDetail.topics.length > 0 && (
              <View style={[styles.detailSection, { backgroundColor: colors.surface }]}>
                <View style={styles.detailSectionHeader}>
                  <View style={[styles.detailSectionIcon, { backgroundColor: '#6366f115' }]}>
                    <Ionicons name="pricetags" size={16} color="#6366f1" />
                  </View>
                  <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Topics</Text>
                </View>
                <View style={styles.topicsContainer}>
                  {noteDetail.topics.map((topic, index) => (
                    <View key={index} style={[styles.topicChip, { backgroundColor: colors.background }]}>
                      <Text style={[styles.topicChipText, { color: colors.textSecondary }]}>
                        {topic}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => selectedNote && handleDeleteNote(selectedNote.id)}
              activeOpacity={0.7}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  
  // Stats Section
  statsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    gap: 12,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },

  // Filter Section
  filterWrapper: {
    marginTop: 16,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Notes List
  notesContainer: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionCount: {
    fontSize: 13,
  },

  // Note Card
  noteCard: {
    borderRadius: 20,
    marginBottom: 14,
    overflow: 'hidden',
  },
  noteCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  noteCardContent: {
    padding: 16,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteHeaderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  noteMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noteMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  noteMetaText: {
    fontSize: 11,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 6,
  },
  keyPointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b15',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  keyPointsCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f59e0b',
  },
  summaryContainer: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  noteSummary: {
    fontSize: 14,
    lineHeight: 21,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  typeTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  typeTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  viewMore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewMoreText: {
    fontSize: 12,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  emptyGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    borderRadius: 100,
  },
  emptyIconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyIconInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  apiKeyBanner: {
    width: '100%',
    borderRadius: 16,
    marginTop: 24,
    overflow: 'hidden',
  },
  apiKeyBannerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  apiKeyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  apiKeyIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  apiKeyTextContainer: {
    flex: 1,
  },
  apiKeyTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  apiKeySubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  featureList: {
    marginTop: 24,
    gap: 10,
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 14,
  },

  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
  },
  loadingSubtext: {
    fontSize: 14,
    marginTop: 4,
  },

  // Detail Modal
  detailLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  detailLoadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  detailScroll: {
    flex: 1,
  },
  detailMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  detailMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 5,
  },
  detailMetaText: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  detailSection: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  detailSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  detailSectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  detailSectionBadge: {
    backgroundColor: '#f59e0b20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  detailSectionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f59e0b',
  },
  detailSectionText: {
    fontSize: 14,
    lineHeight: 22,
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  actionCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  topicsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topicChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  topicChipText: {
    fontSize: 13,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 8,
    marginBottom: 20,
    borderRadius: 12,
    backgroundColor: '#ef444415',
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ef4444',
  },
});
