import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
    Alert,
    ActivityIndicator,
    TextInput,
    FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { WebRTCContext } from '../../store/WebRTCContext';
import { qrPairingService, QRSession, QRPeerInfo } from '../../services/qr-pairing-service';
import { CallTranslationPrefs } from '../../services/call-translation-prefs';
import QRDisplay from '../../components/qr-display';
import QRScanner from '../../components/qr-scanner';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/navigation';
import type { SourceLangCode, TargetLangCode } from '../../services/palabra/types';
import GlassModal from '../../components/GlassModal';

const LANGUAGES = [
    { code: 'auto', label: 'Auto Detect', icon: 'flash-outline' },
    { code: 'en-us', label: 'English', icon: 'language-outline' },
    { code: 'es', label: 'Spanish', icon: 'language-outline' },
    { code: 'fr', label: 'French', icon: 'language-outline' },
    { code: 'de', label: 'German', icon: 'language-outline' },
    { code: 'hi', label: 'Hindi', icon: 'language-outline' },
    { code: 'ja', label: 'Japanese', icon: 'language-outline' },
    { code: 'ko', label: 'Korean', icon: 'language-outline' },
    { code: 'zh', label: 'Chinese', icon: 'language-outline' },
    { code: 'pt', label: 'Portuguese', icon: 'language-outline' },
    { code: 'ar', label: 'Arabic', icon: 'language-outline' },
];

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface Props {
    navigation: NavigationProp;
}

export default function QRPairScreen({ navigation }: Props) {
    const { colors } = useTheme();
    const webRTCContext = useContext(WebRTCContext);

    const [showQRModal, setShowQRModal] = useState(false);
    const [showScanModal, setShowScanModal] = useState(false);
    const [showLangModal, setShowLangModal] = useState(false);
    const [session, setSession] = useState<QRSession | null>(null);
    const [sourceLang, setSourceLang] = useState<SourceLangCode>('auto');
    const [targetLang, setTargetLang] = useState<TargetLangCode>('en-us');
    const [loading, setLoading] = useState(false);
    const [langSelectType, setLangSelectType] = useState<'source' | 'target'>('source');
    const [search, setSearch] = useState('');

    const filteredLanguages = useMemo(() => {
        let langs = LANGUAGES;
        if (langSelectType === 'target') {
            langs = LANGUAGES.filter(l => l.code !== 'auto');
        }
        if (!search.trim()) return langs;
        return langs.filter(l => l.label.toLowerCase().includes(search.toLowerCase()));
    }, [search, langSelectType]);

    useEffect(() => {
        const loadPrefs = async () => {
            const prefs = await CallTranslationPrefs.getAll();
            setSourceLang(prefs.source);
            setTargetLang(prefs.target);
        };
        loadPrefs();
    }, []);

    useEffect(() => {
        if (webRTCContext?.socket) {
            qrPairingService.setSocket(webRTCContext.socket);
        }
    }, [webRTCContext?.socket]);

    useEffect(() => {
        const handlePeerJoined = (peer: QRPeerInfo) => {
            setShowQRModal(false);
            Alert.alert(
                'Partner Found!',
                `${peer.username || 'Someone'} wants to connect.\nTheir language: ${getLangLabel(peer.sourceLang)} → ${getLangLabel(peer.targetLang)}`,
                [
                    { text: 'Cancel', style: 'cancel', onPress: () => qrPairingService.cancelSession() },
                    { text: 'Start Translation', onPress: () => startTranslationCall(peer) },
                ]
            );
        };

        const handleExpired = () => {
            setSession(null);
            setShowQRModal(false);
            Alert.alert('Session Expired', 'The QR code has expired. Generate a new one.');
        };

        const handleError = (err: Error) => {
            Alert.alert('Error', err.message);
            setLoading(false);
        };

        qrPairingService.on('peerJoined', handlePeerJoined);
        qrPairingService.on('sessionExpired', handleExpired);
        qrPairingService.on('error', handleError);

        return () => {
            qrPairingService.off('peerJoined', handlePeerJoined);
            qrPairingService.off('sessionExpired', handleExpired);
            qrPairingService.off('error', handleError);
        };
    }, []);

    const getLangLabel = (code: string) => {
        const lang = LANGUAGES.find(l => l.code === code);
        return lang?.label || code;
    };

    const startTranslationCall = useCallback((peer: QRPeerInfo) => {
        navigation.navigate('QRTranslationScreen', {
            peerId: peer.peerId,
            peerName: peer.username,
            peerSourceLang: peer.sourceLang,
            peerTargetLang: peer.targetLang,
            isHost: true,
        });
    }, [navigation]);

    const handleShowQR = async () => {
        setLoading(true);
        try {
            const newSession = await qrPairingService.createSession(sourceLang, targetLang);
            setSession(newSession);
            setShowQRModal(true);
        } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create session');
        } finally {
            setLoading(false);
        }
    };

    const handleScan = async (data: string) => {
        const parsed = qrPairingService.parseQRData(data);
        if (!parsed) {
            Alert.alert('Invalid QR', 'This is not a valid WiLang QR code');
            return;
        }

        setLoading(true);
        setShowScanModal(false);

        try {
            const host = await qrPairingService.joinSession(
                parsed.sessionId,
                parsed.secret,
                sourceLang,
                targetLang
            );

            navigation.navigate('QRTranslationScreen', {
                peerId: host.peerId,
                peerName: host.username,
                peerSourceLang: host.sourceLang,
                peerTargetLang: host.targetLang,
                isHost: false,
            });
        } catch (err) {
            Alert.alert('Connection Failed', err instanceof Error ? err.message : 'Failed to connect');
        } finally {
            setLoading(false);
        }
    };

    const handleCloseQR = () => {
        qrPairingService.cancelSession();
        setSession(null);
        setShowQRModal(false);
    };

    const openLangSelect = (type: 'source' | 'target') => {
        setLangSelectType(type);
        setSearch('');
        setShowLangModal(true);
    };

    const handleLangSelect = (code: string) => {
        if (langSelectType === 'source') {
            setSourceLang(code as SourceLangCode);
            CallTranslationPrefs.setSource(code as SourceLangCode);
        } else {
            setTargetLang(code as TargetLangCode);
            CallTranslationPrefs.setTarget(code as TargetLangCode);
        }
        setShowLangModal(false);
    };

    const renderLangItem = ({ item }: { item: { code: string; label: string; icon: string } }) => {
        const isSelected = (langSelectType === 'source' ? sourceLang : targetLang) === item.code;
        return (
            <TouchableOpacity
                style={[
                    styles.langItem,
                    { backgroundColor: isSelected ? 'rgba(139,92,246,0.12)' : 'transparent' },
                ]}
                onPress={() => handleLangSelect(item.code)}
                activeOpacity={0.7}
            >
                <View style={styles.langItemLeft}>
                    <View style={[styles.langIcon, { backgroundColor: isSelected ? '#8b5cf6' : colors.backgroundTertiary }]}>
                        <Ionicons name={item.icon as any} size={16} color={isSelected ? '#fff' : colors.textSecondary} />
                    </View>
                    <Text style={[styles.langItemText, { color: isSelected ? '#8b5cf6' : colors.text }]}>
                        {item.label}
                    </Text>
                </View>
                {isSelected && (
                    <View style={styles.checkIcon}>
                        <Ionicons name="checkmark-circle" size={22} color="#8b5cf6" />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const steps = [
        { icon: 'language-outline', title: 'Set Languages', desc: 'Choose what you speak and hear' },
        { icon: 'qr-code-outline', title: 'Share or Scan', desc: 'Connect with your partner' },
        { icon: 'chatbubbles-outline', title: 'Start Talking', desc: 'Real-time translation begins' },
    ];

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.langCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.langCardHeader}>
                        <Ionicons name="swap-horizontal" size={18} color="#8b5cf6" />
                        <Text style={[styles.langCardTitle, { color: colors.text }]}>
                            Language Settings
                        </Text>
                    </View>
                    <View style={styles.langSelectors}>
                        <TouchableOpacity
                            style={[styles.langSelector, { backgroundColor: colors.backgroundTertiary }]}
                            onPress={() => openLangSelect('source')}
                            activeOpacity={0.8}
                        >
                            <View style={styles.langSelectorIcon}>
                                <Ionicons name="mic" size={18} color="#8b5cf6" />
                            </View>
                            <View style={styles.langSelectorContent}>
                                <Text style={[styles.langSelectorLabel, { color: colors.textSecondary }]}>
                                    I speak
                                </Text>
                                <Text style={[styles.langSelectorValue, { color: colors.text }]}>
                                    {getLangLabel(sourceLang)}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                        </TouchableOpacity>

                        <View style={styles.langArrowContainer}>
                            <View style={[styles.langArrow, { backgroundColor: '#8b5cf6' }]}>
                                <Ionicons name="arrow-forward" size={14} color="#fff" />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.langSelector, { backgroundColor: colors.backgroundTertiary }]}
                            onPress={() => openLangSelect('target')}
                            activeOpacity={0.8}
                        >
                            <View style={styles.langSelectorIcon}>
                                <Ionicons name="ear" size={18} color="#8b5cf6" />
                            </View>
                            <View style={styles.langSelectorContent}>
                                <Text style={[styles.langSelectorLabel, { color: colors.textSecondary }]}>
                                    I hear
                                </Text>
                                <Text style={[styles.langSelectorValue, { color: colors.text }]}>
                                    {getLangLabel(targetLang)}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={styles.primaryBtn}
                        onPress={handleShowQR}
                        disabled={loading}
                        activeOpacity={0.9}
                    >
                        <LinearGradient
                            colors={['#8b5cf6', '#7c3aed']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.primaryBtnGradient}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <View style={styles.primaryBtnIcon}>
                                        <Ionicons name="qr-code" size={22} color="#fff" />
                                    </View>
                                    <View style={styles.primaryBtnContent}>
                                        <Text style={styles.primaryBtnTitle}>Show My QR</Text>
                                        <Text style={styles.primaryBtnSubtitle}>Let others scan to connect</Text>
                                    </View>
                                    <Ionicons name="arrow-forward" size={20} color="rgba(255,255,255,0.8)" />
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.secondaryBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        onPress={() => setShowScanModal(true)}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.secondaryBtnIcon, { backgroundColor: 'rgba(139,92,246,0.12)' }]}>
                            <Ionicons name="scan" size={22} color="#8b5cf6" />
                        </View>
                        <View style={styles.secondaryBtnContent}>
                            <Text style={[styles.secondaryBtnTitle, { color: colors.text }]}>Scan QR Code</Text>
                            <Text style={[styles.secondaryBtnSubtitle, { color: colors.textSecondary }]}>
                                Join partner's session
                            </Text>
                        </View>
                        <Ionicons name="arrow-forward" size={20} color={colors.textTertiary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.stepsSection}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                        How it works
                    </Text>
                    <View style={[styles.stepsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        {steps.map((step, idx) => (
                            <View key={idx} style={styles.stepItem}>
                                <View style={[styles.stepIconContainer, { backgroundColor: 'rgba(139,92,246,0.1)' }]}>
                                    <Ionicons name={step.icon as any} size={20} color="#8b5cf6" />
                                </View>
                                <View style={styles.stepContent}>
                                    <Text style={[styles.stepTitle, { color: colors.text }]}>{step.title}</Text>
                                    <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>{step.desc}</Text>
                                </View>
                                {idx < steps.length - 1 && (
                                    <View style={[styles.stepConnector, { backgroundColor: colors.border }]} />
                                )}
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>

            <Modal visible={showQRModal} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.qrModalContent, { backgroundColor: colors.surface }]}>
                        <LinearGradient
                            colors={['rgba(139,92,246,0.1)', 'transparent']}
                            style={styles.qrModalGradient}
                        />
                        <View style={styles.qrModalHeader}>
                            <View style={styles.qrModalHeaderLeft}>
                                <View style={[styles.qrModalIcon, { backgroundColor: 'rgba(139,92,246,0.12)' }]}>
                                    <Ionicons name="qr-code" size={20} color="#8b5cf6" />
                                </View>
                                <View>
                                    <Text style={[styles.qrModalTitle, { color: colors.text }]}>
                                        Your QR Code
                                    </Text>
                                    <Text style={[styles.qrModalSubtitle, { color: colors.textSecondary }]}>
                                        Ready to connect
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={[styles.qrCloseBtn, { backgroundColor: colors.backgroundTertiary }]}
                                onPress={handleCloseQR}
                            >
                                <Ionicons name="close" size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.qrDisplayWrapper}>
                            <View style={[styles.qrBorder, { borderColor: 'rgba(139,92,246,0.3)' }]}>
                                <QRDisplay
                                    data={qrPairingService.generateQRData()}
                                    expiresAt={session?.expiresAt}
                                    size={200}
                                />
                            </View>
                        </View>

                        <View style={[styles.qrLangInfo, { backgroundColor: colors.backgroundTertiary }]}>
                            <Ionicons name="language" size={16} color="#8b5cf6" />
                            <Text style={[styles.qrLangText, { color: colors.text }]}>
                                {getLangLabel(sourceLang)} → {getLangLabel(targetLang)}
                            </Text>
                        </View>

                        <Text style={[styles.qrHint, { color: colors.textTertiary }]}>
                            Ask your partner to scan this code
                        </Text>
                    </View>
                </View>
            </Modal>

            <Modal visible={showScanModal} animationType="slide">
                <QRScanner
                    onScan={handleScan}
                    onClose={() => setShowScanModal(false)}
                />
            </Modal>

            <GlassModal
                isVisible={showLangModal}
                onClose={() => setShowLangModal(false)}
                title={langSelectType === 'source' ? 'I Speak' : 'I Want to Hear'}
                subtitle={langSelectType === 'source' ? 'Select your language' : 'Select target language'}
                icon={langSelectType === 'source' ? 'mic-outline' : 'ear-outline'}
                height={520}
            >
                <View style={[styles.searchContainer, { backgroundColor: colors.backgroundTertiary, borderColor: colors.border }]}>
                    <Ionicons name="search" size={18} color={colors.textSecondary} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder="Search languages..."
                        placeholderTextColor={colors.textTertiary}
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
                <FlatList
                    data={filteredLanguages}
                    keyExtractor={(item) => item.code}
                    renderItem={renderLangItem}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.langList}
                    ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
                />
            </GlassModal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollView: { flex: 1 },
    scrollContent: { paddingTop: 35, paddingBottom: 40 },

    langCard: {
        marginHorizontal: 20,
        borderRadius: 20,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
    },
    langCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    langCardTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    langSelectors: {
        gap: 12,
    },
    langSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 14,
        gap: 12,
    },
    langSelectorIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(139,92,246,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    langSelectorContent: {
        flex: 1,
    },
    langSelectorLabel: {
        fontSize: 12,
        marginBottom: 2,
    },
    langSelectorValue: {
        fontSize: 16,
        fontWeight: '600',
    },
    langArrowContainer: {
        alignItems: 'center',
        paddingVertical: 4,
    },
    langArrow: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },

    actionButtons: {
        paddingHorizontal: 20,
        gap: 12,
        marginBottom: 28,
    },
    primaryBtn: {
        borderRadius: 18,
        overflow: 'hidden',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    primaryBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        gap: 14,
    },
    primaryBtnIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryBtnContent: {
        flex: 1,
    },
    primaryBtnTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 2,
    },
    primaryBtnSubtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
    },
    secondaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 18,
        gap: 14,
        borderWidth: 1,
    },
    secondaryBtnIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryBtnContent: {
        flex: 1,
    },
    secondaryBtnTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    secondaryBtnSubtitle: {
        fontSize: 13,
    },

    stepsSection: {
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 12,
    },
    stepsCard: {
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
    },
    stepItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        position: 'relative',
        paddingBottom: 20,
    },
    stepIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    stepContent: {
        flex: 1,
        paddingTop: 2,
    },
    stepTitle: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 3,
    },
    stepDesc: {
        fontSize: 13,
        lineHeight: 18,
    },
    stepConnector: {
        position: 'absolute',
        left: 19,
        top: 44,
        width: 2,
        height: 20,
        borderRadius: 1,
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        padding: 24,
    },
    qrModalContent: {
        borderRadius: 28,
        overflow: 'hidden',
        paddingTop: 20,
        paddingHorizontal: 24,
        paddingBottom: 28,
    },
    qrModalGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 120,
    },
    qrModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    qrModalHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    qrModalIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    qrModalTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    qrModalSubtitle: {
        fontSize: 13,
        marginTop: 2,
    },
    qrCloseBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    qrDisplayWrapper: {
        alignItems: 'center',
        marginBottom: 20,
    },
    qrBorder: {
        padding: 16,
        borderRadius: 20,
        borderWidth: 2,
        borderStyle: 'dashed',
    },
    qrLangInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignSelf: 'center',
        marginBottom: 16,
    },
    qrLangText: {
        fontSize: 15,
        fontWeight: '600',
    },
    qrHint: {
        textAlign: 'center',
        fontSize: 13,
    },

    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 16,
        gap: 10,
        borderWidth: 1,
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
        padding: 14,
        borderRadius: 14,
    },
    langItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    langIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    langItemText: {
        fontSize: 16,
        fontWeight: '500',
    },
    checkIcon: {},
});
