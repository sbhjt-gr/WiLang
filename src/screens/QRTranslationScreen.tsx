import React, { useContext, useLayoutEffect, useRef, useEffect, useState, useCallback } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import { WebRTCContext } from '../store/WebRTCContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import GlassModal from '../components/GlassModal';
import { useTheme } from '../theme';
import { VideoCallTranslation, type TranslationState } from '../services/video-call-translation';
import { CallTranslationPrefs } from '../services/call-translation-prefs';
import { qrPairingService } from '../services/qr-pairing-service';
import type { SourceLangCode, TargetLangCode } from '../services/palabra/types';

const { width, height } = Dimensions.get('window');

type QRTranslationScreenNavigationProp = StackNavigationProp<RootStackParamList, 'QRTranslationScreen'>;
type QRTranslationScreenRouteProp = RouteProp<RootStackParamList, 'QRTranslationScreen'>;

interface Props {
    navigation: QRTranslationScreenNavigationProp;
    route: QRTranslationScreenRouteProp;
}

const LANGUAGES: Record<string, string> = {
    'auto': 'Auto Detect',
    'en-us': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'hi': 'Hindi',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'pt': 'Portuguese',
    'ar': 'Arabic',
};

interface TranscriptEntry {
    id: string;
    original: string;
    translated: string;
    timestamp: number;
    isFinal: boolean;
}

export default function QRTranslationScreen({ navigation, route }: Props) {
    const { colors } = useTheme();
    const { peerId, peerName, peerSourceLang, peerTargetLang, isHost, sessionId } = route.params;

    const {
        localStream,
        isMuted,
        toggleMute,
        initialize,
        closeCall,
        replaceAudioTrack,
        restoreOriginalAudio,
    } = useContext(WebRTCContext);

    const [sessionDuration, setSessionDuration] = useState(0);
    const [isConnected, setIsConnected] = useState(false);
    const [palabraState, setPalabraState] = useState<TranslationState>('idle');
    const [palabraSource, setPalabraSource] = useState<SourceLangCode>('auto');
    const [palabraTarget, setPalabraTarget] = useState<TargetLangCode>('en-us');
    const [currentTranscript, setCurrentTranscript] = useState<string>('');
    const [currentTranslation, setCurrentTranslation] = useState<string>('');
    const [transcriptHistory, setTranscriptHistory] = useState<TranscriptEntry[]>([]);
    const [isSpeakerOn, setIsSpeakerOn] = useState(true);
    const [modalConfig, setModalConfig] = useState<{
        visible: boolean;
        title: string;
        message: string;
        icon: string;
        buttons: Array<{ text: string; onPress?: () => void }>;
    }>({
        visible: false,
        title: '',
        message: '',
        icon: 'information-circle',
        buttons: [],
    });

    const palabraServiceRef = useRef<VideoCallTranslation | null>(null);
    const sessionStartTime = useRef<number | null>(null);
    const initializationAttempted = useRef(false);
    const scrollViewRef = useRef<ScrollView>(null);
    const entryIdCounter = useRef(0);

    const showModal = useCallback((title: string, message: string, icon: string = 'information-circle', buttons: Array<{ text: string; onPress?: () => void }> = [{ text: 'OK' }]) => {
        setModalConfig({ visible: true, title, message, icon, buttons });
    }, []);

    const closeModal = useCallback(() => {
        setModalConfig(prev => ({ ...prev, visible: false }));
    }, []);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerShown: false,
            gestureEnabled: false,
        });
    }, [navigation]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', (e) => {
            if (e.data.action.type === 'GO_BACK' || e.data.action.type === 'POP') {
                e.preventDefault();
            }
        });
        return unsubscribe;
    }, [navigation]);

    useEffect(() => {
        const loadPrefs = async () => {
            const [source, target] = await Promise.all([
                CallTranslationPrefs.getSource(),
                CallTranslationPrefs.getTarget(),
            ]);
            setPalabraSource(source);
            setPalabraTarget(target);
        };
        loadPrefs();
    }, []);

    const replaceAudioTrackRef = useRef(replaceAudioTrack);
    const restoreOriginalAudioRef = useRef(restoreOriginalAudio);

    useEffect(() => {
        replaceAudioTrackRef.current = replaceAudioTrack;
        restoreOriginalAudioRef.current = restoreOriginalAudio;
    });

    useEffect(() => {
        let service = palabraServiceRef.current;
        if (!service) {
            service = new VideoCallTranslation();
            palabraServiceRef.current = service;
        }

        service.setLanguages(palabraSource, palabraTarget);

        const handleStateChange = (state: TranslationState) => {
            setPalabraState(state);
            if (state === 'active' && !isConnected) {
                setIsConnected(true);
                sessionStartTime.current = Date.now();
            }
        };

        const handleTranscription = (data: { text: string; isFinal?: boolean }) => {
            setCurrentTranscript(data.text);
            if (data.isFinal && data.text.trim()) {
                const newEntry: TranscriptEntry = {
                    id: `entry-${entryIdCounter.current++}`,
                    original: data.text,
                    translated: currentTranslation || data.text,
                    timestamp: Date.now(),
                    isFinal: true,
                };
                setTranscriptHistory(prev => [...prev.slice(-49), newEntry]);
                setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 100);
            }
        };

        const handleTranslation = (data: { text: string; isFinal?: boolean }) => {
            setCurrentTranslation(data.text);
        };

        const handleRemoteTrack = (tracks: Array<{ track: MediaStreamTrack }>) => {
            if (tracks.length > 0) {
                const translatedTrack = tracks[0].track;
                replaceAudioTrackRef.current?.(translatedTrack);
            }
        };

        const handleError = (err: Error) => {
            showModal('Translation Error', err.message || 'An error occurred', 'alert-circle');
        };

        service.on('stateChange', handleStateChange);
        service.on('transcription', handleTranscription);
        service.on('translation', handleTranslation);
        service.on('remoteTrack', handleRemoteTrack);
        service.on('error', handleError);

        return () => {
            service.off('stateChange', handleStateChange);
            service.off('transcription', handleTranscription);
            service.off('translation', handleTranslation);
            service.off('remoteTrack', handleRemoteTrack);
            service.off('error', handleError);
        };
    }, [palabraSource, palabraTarget, showModal, isConnected, currentTranslation]);

    useEffect(() => {
        if (!palabraServiceRef.current) return;

        const service = palabraServiceRef.current;
        if (service.getState() !== 'idle') return;

        service.start();
    }, []);

    useEffect(() => {
        return () => {
            if (palabraServiceRef.current) {
                palabraServiceRef.current.stop();
                palabraServiceRef.current = null;
            }
            restoreOriginalAudioRef.current?.();
        };
    }, []);

    useEffect(() => {
        if (!isConnected) return;

        const timer = setInterval(() => {
            if (sessionStartTime.current) {
                setSessionDuration(Math.floor((Date.now() - sessionStartTime.current) / 1000));
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [isConnected]);

    useEffect(() => {
        if (initializationAttempted.current) return;
        initializationAttempted.current = true;

        const initializeSession = async () => {
            try {
                if (!localStream) {
                    await initialize('QR User');
                }
            } catch (err) {
                showModal(
                    'Initialization Error',
                    'Failed to initialize audio. Please check microphone permissions.',
                    'alert-circle',
                    [{ text: 'OK', onPress: () => { closeModal(); navigation.reset({ index: 0, routes: [{ name: 'HomeScreen' }] }); } }]
                );
            }
        };

        initializeSession();
    }, [localStream, initialize, showModal, closeModal, navigation]);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const handleSpeakerToggle = useCallback(() => {
        setIsSpeakerOn(prev => !prev);
    }, []);

    const handleEndSession = useCallback(async () => {
        try {
            qrPairingService.endSession(sessionId);
            if (palabraServiceRef.current) {
                await palabraServiceRef.current.stop();
                palabraServiceRef.current = null;
            }
            await restoreOriginalAudioRef.current?.();
            closeCall();
        } catch (err) {
            console.log('cleanup_err', err);
        } finally {
            navigation.reset({ index: 0, routes: [{ name: 'HomeScreen' }] });
        }
    }, [closeCall, navigation, sessionId]);

    useEffect(() => {
        qrPairingService.setSessionId(sessionId);

        const handleSessionEnded = (data: { endedBy: string; reason?: string }) => {
            if (data.endedBy !== peerId) {
                handleEndSession();
            }
        };

        qrPairingService.on('sessionEnded', handleSessionEnded);

        return () => {
            qrPairingService.off('sessionEnded', handleSessionEnded);
        };
    }, [sessionId, peerId, handleEndSession]);

    const displayName = peerName || 'Partner';

    const getStatusColor = () => {
        switch (palabraState) {
            case 'active': return '#10b981';
            case 'connecting': return '#f59e0b';
            case 'error': return '#ef4444';
            default: return '#6b7280';
        }
    };

    const getStatusText = () => {
        switch (palabraState) {
            case 'active': return 'Live';
            case 'connecting': return 'Connecting...';
            case 'error': return 'Error';
            default: return 'Starting...';
        }
    };

    if (!localStream) {
        return (
            <View style={[styles.container, { backgroundColor: '#0f0f1a' }]}>
                <StatusBar backgroundColor="transparent" style="light" />
                <View style={styles.loadingContent}>
                    <MotiView
                        from={{ rotate: '0deg' }}
                        animate={{ rotate: '360deg' }}
                        transition={{ type: 'timing', duration: 1500, loop: true }}
                    >
                        <Ionicons name="language" size={48} color="#8b5cf6" />
                    </MotiView>
                    <Text style={styles.loadingText}>Initializing translation...</Text>
                    <Text style={styles.loadingSubText}>Setting up real-time speech recognition</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar backgroundColor="transparent" style="light" />

            <LinearGradient
                colors={['#0f0f1a', '#1a1a2e', '#0f0f1a']}
                style={styles.gradient}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]}>
                            {palabraState === 'active' && (
                                <MotiView
                                    from={{ opacity: 0.5 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ type: 'timing', duration: 800, loop: true, repeatReverse: true }}
                                    style={[styles.statusPulse, { backgroundColor: getStatusColor() }]}
                                />
                            )}
                        </View>
                        <View>
                            <Text style={styles.statusText}>{getStatusText()}</Text>
                            <Text style={styles.durationText}>{formatDuration(sessionDuration)}</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.endButton} onPress={handleEndSession}>
                        <Ionicons name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Language Info Card */}
                <View style={styles.languageCard}>
                    <View style={styles.languageRow}>
                        <View style={styles.languageItem}>
                            <Text style={styles.languageLabel}>Speaking</Text>
                            <View style={styles.languageValue}>
                                <Ionicons name="mic" size={16} color="#8b5cf6" />
                                <Text style={styles.languageText}>{LANGUAGES[palabraSource] || palabraSource}</Text>
                            </View>
                        </View>
                        <View style={styles.languageArrow}>
                            <Ionicons name="arrow-forward" size={20} color="#8b5cf6" />
                        </View>
                        <View style={styles.languageItem}>
                            <Text style={styles.languageLabel}>Translating to</Text>
                            <View style={styles.languageValue}>
                                <Ionicons name="language" size={16} color="#10b981" />
                                <Text style={[styles.languageText, { color: '#10b981' }]}>{LANGUAGES[palabraTarget] || palabraTarget}</Text>
                            </View>
                        </View>
                    </View>
                    <View style={styles.partnerInfo}>
                        <Ionicons name="person" size={14} color="rgba(255,255,255,0.5)" />
                        <Text style={styles.partnerText}>
                            with <Text style={styles.partnerName}>{displayName}</Text>
                        </Text>
                    </View>
                </View>

                {/* Live Translation Display */}
                <View style={styles.translationContainer}>
                    {/* Current Live Text */}
                    {(currentTranscript || currentTranslation) && palabraState === 'active' && (
                        <View style={styles.liveSection}>
                            <View style={styles.liveBadge}>
                                <MotiView
                                    from={{ opacity: 0.5 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ type: 'timing', duration: 600, loop: true, repeatReverse: true }}
                                    style={styles.liveDot}
                                />
                                <Text style={styles.liveText}>LIVE</Text>
                            </View>
                            {currentTranscript && (
                                <View style={styles.currentTextBox}>
                                    <Text style={styles.currentOriginal}>{currentTranscript}</Text>
                                </View>
                            )}
                            {currentTranslation && (
                                <View style={styles.currentTranslationBox}>
                                    <Text style={styles.currentTranslated}>{currentTranslation}</Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Transcript History */}
                    <ScrollView
                        ref={scrollViewRef}
                        style={styles.historyScroll}
                        contentContainerStyle={styles.historyContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {transcriptHistory.length === 0 && palabraState === 'active' && !currentTranscript && (
                            <View style={styles.emptyState}>
                                <MotiView
                                    from={{ scale: 0.95, opacity: 0.5 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: 'timing', duration: 1500, loop: true, repeatReverse: true }}
                                >
                                    <Ionicons name="chatbubbles-outline" size={64} color="rgba(139,92,246,0.3)" />
                                </MotiView>
                                <Text style={styles.emptyTitle}>Listening...</Text>
                                <Text style={styles.emptySubtitle}>Start speaking and your words will appear here with translations</Text>
                            </View>
                        )}

                        {palabraState === 'connecting' && (
                            <View style={styles.emptyState}>
                                <ActivityIndicator size="large" color="#8b5cf6" />
                                <Text style={styles.emptyTitle}>Connecting to translation service...</Text>
                                <Text style={styles.emptySubtitle}>This may take a few seconds</Text>
                            </View>
                        )}

                        {transcriptHistory.map((entry) => (
                            <View key={entry.id} style={styles.historyEntry}>
                                <View style={styles.entryHeader}>
                                    <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.4)" />
                                    <Text style={styles.entryTime}>{formatTime(entry.timestamp)}</Text>
                                </View>
                                <Text style={styles.entryOriginal}>{entry.original}</Text>
                                <Text style={styles.entryTranslated}>{entry.translated}</Text>
                            </View>
                        ))}
                    </ScrollView>
                </View>

                {/* Bottom Controls */}
                <View style={styles.bottomControls}>
                    <TouchableOpacity
                        style={[styles.controlButton, isMuted && styles.controlButtonActive]}
                        onPress={toggleMute}
                    >
                        <View style={[styles.controlIcon, isMuted && styles.controlIconMuted]}>
                            <Ionicons name={isMuted ? "mic-off" : "mic"} size={24} color="#fff" />
                        </View>
                        <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]}
                        onPress={handleSpeakerToggle}
                    >
                        <View style={[styles.controlIcon, isSpeakerOn && styles.controlIconActive]}>
                            <Ionicons name={isSpeakerOn ? "volume-high" : "volume-mute"} size={24} color="#fff" />
                        </View>
                        <Text style={styles.controlLabel}>{isSpeakerOn ? 'Speaker On' : 'Speaker Off'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.endSessionButton} onPress={handleEndSession}>
                        <LinearGradient
                            colors={['#ef4444', '#dc2626']}
                            style={styles.endSessionGradient}
                        >
                            <Ionicons name="stop" size={28} color="#fff" />
                        </LinearGradient>
                        <Text style={styles.endSessionLabel}>End Session</Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            <GlassModal
                isVisible={modalConfig.visible}
                onClose={closeModal}
                title={modalConfig.title}
                icon={modalConfig.icon}
                height={280}
            >
                <Text style={[styles.modalMessage, { color: colors.text }]}>
                    {modalConfig.message}
                </Text>
                <View style={styles.modalButtons}>
                    {modalConfig.buttons.map((btn, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.modalButton}
                            onPress={() => { closeModal(); btn.onPress?.(); }}
                        >
                            <Text style={styles.modalButtonText}>{btn.text}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </GlassModal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f0f1a',
    },
    gradient: {
        flex: 1,
    },
    loadingContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    loadingText: {
        color: '#ffffff',
        marginTop: 24,
        fontSize: 18,
        fontWeight: '600',
    },
    loadingSubText: {
        color: 'rgba(255,255,255,0.5)',
        marginTop: 8,
        fontSize: 14,
        textAlign: 'center',
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    statusIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        overflow: 'hidden',
    },
    statusPulse: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: 6,
    },
    statusText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    durationText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        marginTop: 2,
    },
    endButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Language Card
    languageCard: {
        marginHorizontal: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    languageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    languageItem: {
        flex: 1,
    },
    languageLabel: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    languageValue: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    languageText: {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: '600',
    },
    languageArrow: {
        paddingHorizontal: 12,
    },
    partnerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    partnerText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 13,
    },
    partnerName: {
        color: '#8b5cf6',
        fontWeight: '600',
    },

    // Translation Container
    translationContainer: {
        flex: 1,
        marginTop: 16,
        marginHorizontal: 20,
    },
    liveSection: {
        marginBottom: 16,
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 12,
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ef4444',
    },
    liveText: {
        color: '#ef4444',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
    },
    currentTextBox: {
        backgroundColor: 'rgba(139,92,246,0.15)',
        borderRadius: 12,
        padding: 14,
        borderLeftWidth: 3,
        borderLeftColor: '#8b5cf6',
        marginBottom: 8,
    },
    currentOriginal: {
        color: '#ffffff',
        fontSize: 16,
        lineHeight: 24,
    },
    currentTranslationBox: {
        backgroundColor: 'rgba(16,185,129,0.15)',
        borderRadius: 12,
        padding: 14,
        borderLeftWidth: 3,
        borderLeftColor: '#10b981',
    },
    currentTranslated: {
        color: '#10b981',
        fontSize: 16,
        lineHeight: 24,
        fontWeight: '500',
    },

    // History
    historyScroll: {
        flex: 1,
    },
    historyContent: {
        paddingBottom: 20,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 18,
        fontWeight: '600',
        marginTop: 20,
    },
    emptySubtitle: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 40,
    },
    historyEntry: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    entryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 8,
    },
    entryTime: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 11,
    },
    entryOriginal: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 6,
    },
    entryTranslated: {
        color: '#10b981',
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '500',
    },

    // Bottom Controls
    bottomControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: 20,
        paddingBottom: 40,
        paddingTop: 16,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    controlButton: {
        alignItems: 'center',
        gap: 8,
    },
    controlButtonActive: {},
    controlIcon: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    controlIconMuted: {
        backgroundColor: 'rgba(239,68,68,0.2)',
    },
    controlIconActive: {
        backgroundColor: 'rgba(139,92,246,0.2)',
    },
    controlLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 11,
        fontWeight: '500',
    },
    endSessionButton: {
        alignItems: 'center',
        gap: 8,
    },
    endSessionGradient: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    endSessionLabel: {
        color: '#ef4444',
        fontSize: 11,
        fontWeight: '600',
    },

    // Modal
    modalMessage: {
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 24,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    modalButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        backgroundColor: '#8b5cf6',
        minWidth: 80,
        alignItems: 'center',
    },
    modalButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
});
