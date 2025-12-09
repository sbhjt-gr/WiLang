import React, { useContext, useLayoutEffect, useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
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
import TranslationControls from '../components/translation-controls';
import TranscriptionOverlay from '../components/transcription-overlay';
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
    'auto': 'Auto',
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

    const [callDuration, setCallDuration] = useState(0);
    const [isConnected, setIsConnected] = useState(false);
    const [palabraEnabled, setPalabraEnabled] = useState(true);
    const [palabraState, setPalabraState] = useState<TranslationState>('idle');
    const [palabraSource, setPalabraSource] = useState<SourceLangCode>('auto');
    const [palabraTarget, setPalabraTarget] = useState<TargetLangCode>('en-us');
    const [palabraTranscript, setPalabraTranscript] = useState<string | null>(null);
    const [palabraTranslation, setPalabraTranslation] = useState<string | null>(null);
    const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
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
    const callStartTime = useRef<number | null>(null);
    const initializationAttempted = useRef(false);

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
        if (!palabraEnabled) {
            if (palabraServiceRef.current) {
                palabraServiceRef.current.stop();
                palabraServiceRef.current = null;
                setPalabraState('idle');
                setPalabraTranscript(null);
                setPalabraTranslation(null);
                restoreOriginalAudioRef.current?.();
            }
            return;
        }

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
                callStartTime.current = Date.now();
            }
        };

        const handleTranscription = (data: { text: string; isFinal?: boolean }) => {
            setPalabraTranscript(data.text);
        };

        const handleTranslation = (data: { text: string; isFinal?: boolean }) => {
            setPalabraTranslation(data.text);
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
    }, [palabraEnabled, palabraSource, palabraTarget, showModal, isConnected]);

    useEffect(() => {
        if (!palabraEnabled || !palabraServiceRef.current) return;

        const service = palabraServiceRef.current;
        if (service.getState() !== 'idle') return;

        service.start();
    }, [palabraEnabled]);

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
            if (callStartTime.current) {
                setCallDuration(Math.floor((Date.now() - callStartTime.current) / 1000));
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

    const handlePalabraToggle = useCallback(() => {
        setPalabraEnabled(prev => !prev);
    }, []);

    const handleSubtitlesToggle = useCallback(() => {
        setSubtitlesEnabled(prev => !prev);
    }, []);

    const handleSpeakerToggle = useCallback(() => {
        setIsSpeakerOn(prev => !prev);
    }, []);

    const handleCloseCall = useCallback(async () => {
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
                handleCloseCall();
            }
        };

        qrPairingService.on('sessionEnded', handleSessionEnded);

        return () => {
            qrPairingService.off('sessionEnded', handleSessionEnded);
        };
    }, [sessionId, peerId, handleCloseCall]);

    const getInitials = (name: string) => {
        const names = name.split(' ');
        if (names.length >= 2) {
            return (names[0][0] + names[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    const displayName = peerName || 'Partner';

    if (!localStream) {
        return (
            <View style={[styles.container, { backgroundColor: '#0a0a0a' }]}>
                <StatusBar backgroundColor="black" style="light" />
                <View style={styles.loadingContent}>
                    <ActivityIndicator size="large" color="#8b5cf6" />
                    <Text style={styles.loadingText}>Setting up translation...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar backgroundColor="black" style="light" />

            <LinearGradient
                colors={['#1a1a2e', '#16213e', '#0f0f1a']}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.topSection}>
                    <View style={styles.statusRow}>
                        <View style={styles.langBadge}>
                            <Ionicons name="language" size={14} color="#8b5cf6" />
                            <Text style={styles.langBadgeText}>
                                {LANGUAGES[peerSourceLang] || peerSourceLang} → {LANGUAGES[peerTargetLang] || peerTargetLang}
                            </Text>
                        </View>
                        <View style={styles.callInfo}>
                            <Text style={styles.callInfoText}>Live Translation</Text>
                            <Text style={styles.roleText}>
                                {isHost ? 'You showed QR' : 'You scanned QR'}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.centerSection}>
                    <View style={styles.avatarContainer}>
                        <MotiView
                            from={{ scale: 1, opacity: 0.5 }}
                            animate={{ scale: isConnected ? 1.15 : 1.05, opacity: isConnected ? 0.3 : 0.5 }}
                            transition={{
                                type: 'timing',
                                duration: isConnected ? 1500 : 2000,
                                loop: true,
                                repeatReverse: true,
                            }}
                            style={styles.avatarPulseOuter}
                        />
                        <MotiView
                            from={{ scale: 1, opacity: 0.6 }}
                            animate={{ scale: isConnected ? 1.1 : 1.03, opacity: isConnected ? 0.4 : 0.6 }}
                            transition={{
                                type: 'timing',
                                duration: isConnected ? 1200 : 1600,
                                loop: true,
                                repeatReverse: true,
                            }}
                            style={styles.avatarPulseInner}
                        />
                        <View style={styles.avatarInner}>
                            <Text style={styles.avatarText}>{getInitials(displayName)}</Text>
                        </View>
                        {isMuted && (
                            <View style={styles.mutedBadge}>
                                <Ionicons name="mic-off" size={16} color="#fff" />
                            </View>
                        )}
                    </View>

                    <Text style={styles.callerName}>{displayName}</Text>

                    <View style={styles.callStatusContainer}>
                        {isConnected ? (
                            <View style={styles.connectedStatus}>
                                <View style={styles.connectedDot} />
                                <Text style={styles.durationText}>{formatDuration(callDuration)}</Text>
                            </View>
                        ) : (
                            <View style={styles.connectingStatus}>
                                <ActivityIndicator size="small" color="#8b5cf6" />
                                <Text style={styles.connectingText}>Connecting translation...</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.yourLangContainer}>
                        <Text style={styles.yourLangLabel}>Your settings:</Text>
                        <Text style={styles.yourLangText}>
                            {LANGUAGES[palabraSource] || palabraSource} → {LANGUAGES[palabraTarget] || palabraTarget}
                        </Text>
                    </View>
                </View>

                <TranscriptionOverlay
                    sourceText={palabraTranscript}
                    translatedText={palabraTranslation}
                    visible={subtitlesEnabled && palabraEnabled && palabraState !== 'idle' && palabraState !== 'error'}
                    isConnecting={palabraState === 'connecting'}
                />

                <View style={styles.bottomSection}>
                    <View style={styles.controlsRow}>
                        <TouchableOpacity
                            style={[styles.controlBtn, subtitlesEnabled && styles.controlBtnActive]}
                            onPress={handleSubtitlesToggle}
                        >
                            <Ionicons
                                name={subtitlesEnabled ? "text" : "text-outline"}
                                size={22}
                                color="#fff"
                            />
                            <Text style={styles.controlLabel}>Subtitles</Text>
                        </TouchableOpacity>

                        <TranslationControls
                            state={palabraState}
                            enabled={palabraEnabled}
                            onToggle={handlePalabraToggle}
                            style={styles.controlBtn}
                            activeStyle={styles.controlBtnActive}
                            labelStyle={styles.controlLabel}
                        />

                        <TouchableOpacity
                            style={[styles.endCallBtn]}
                            onPress={handleCloseCall}
                        >
                            <Ionicons name="call" size={28} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.controlBtn, isMuted && styles.controlBtnMuted]}
                            onPress={toggleMute}
                        >
                            <Ionicons
                                name={isMuted ? "mic-off" : "mic"}
                                size={22}
                                color="#fff"
                            />
                            <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.controlBtn, isSpeakerOn && styles.controlBtnActive]}
                            onPress={handleSpeakerToggle}
                        >
                            <Ionicons
                                name={isSpeakerOn ? "volume-high" : "volume-low"}
                                size={22}
                                color="#fff"
                            />
                            <Text style={styles.controlLabel}>Speaker</Text>
                        </TouchableOpacity>
                    </View>
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
    container: { flex: 1, backgroundColor: '#0a0a0a' },
    gradient: { flex: 1 },
    loadingContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: '#ffffff', marginTop: 16, fontSize: 16 },
    topSection: { paddingTop: 60, paddingHorizontal: 20 },
    statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    langBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(139,92,246,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 6,
    },
    langBadgeText: { color: '#8b5cf6', fontSize: 12, fontWeight: '500' },
    callInfo: { alignItems: 'flex-end' },
    callInfoText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
    roleText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },
    centerSection: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 40 },
    avatarContainer: { alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
    avatarPulseOuter: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: 'rgba(139,92,246,0.3)',
    },
    avatarPulseInner: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(139,92,246,0.4)',
    },
    avatarInner: {
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: '#8b5cf6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: { fontSize: 36, fontWeight: '700', color: '#ffffff' },
    mutedBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#ef4444',
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    callerName: { fontSize: 28, fontWeight: '700', color: '#ffffff', marginBottom: 8 },
    callStatusContainer: { marginTop: 8 },
    connectedStatus: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    connectedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' },
    durationText: { color: '#ffffff', fontSize: 18, fontWeight: '500' },
    connectingStatus: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    connectingText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
    yourLangContainer: { marginTop: 24, alignItems: 'center' },
    yourLangLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 4 },
    yourLangText: { color: '#10b981', fontSize: 14, fontWeight: '600' },
    bottomSection: { paddingBottom: 50, paddingHorizontal: 20 },
    controlsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
    controlBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 56,
        height: 70,
    },
    controlBtnActive: { opacity: 1 },
    controlBtnMuted: { opacity: 1 },
    controlLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 10, marginTop: 4 },
    endCallBtn: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#ef4444',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalMessage: { fontSize: 16, lineHeight: 24, marginBottom: 24 },
    modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
    modalButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        backgroundColor: '#8b5cf6',
        minWidth: 80,
        alignItems: 'center',
    },
    modalButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});
