import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { WebRTCContext } from '../../store/WebRTCContext';
import { qrPairingService, QRSession, QRPeerInfo } from '../../services/qr-pairing-service';
import { CallTranslationPrefs } from '../../services/call-translation-prefs';
import QRDisplay from '../../components/qr-display';
import QRScanner from '../../components/qr-scanner';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/navigation';
import type { SourceLangCode, TargetLangCode } from '../../services/palabra/types';

const LANGUAGES = [
    { code: 'auto', label: 'Auto Detect' },
    { code: 'en-us', label: 'English' },
    { code: 'es', label: 'Spanish' },
    { code: 'fr', label: 'French' },
    { code: 'de', label: 'German' },
    { code: 'hi', label: 'Hindi' },
    { code: 'ja', label: 'Japanese' },
    { code: 'ko', label: 'Korean' },
    { code: 'zh', label: 'Chinese' },
    { code: 'pt', label: 'Portuguese' },
    { code: 'ar', label: 'Arabic' },
];

type NavigationProp = StackNavigationProp<RootStackParamList>;

export default function QRPairScreen() {
    const { colors } = useTheme();
    const navigation = useNavigation<NavigationProp>();
    const webRTCContext = useContext(WebRTCContext);

    const [showQRModal, setShowQRModal] = useState(false);
    const [showScanModal, setShowScanModal] = useState(false);
    const [showLangModal, setShowLangModal] = useState(false);
    const [session, setSession] = useState<QRSession | null>(null);
    const [sourceLang, setSourceLang] = useState<SourceLangCode>('auto');
    const [targetLang, setTargetLang] = useState<TargetLangCode>('en-us');
    const [loading, setLoading] = useState(false);
    const [peerInfo, setPeerInfo] = useState<QRPeerInfo | null>(null);
    const [langSelectType, setLangSelectType] = useState<'source' | 'target'>('source');

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
            setPeerInfo(peer);
            setShowQRModal(false);
            Alert.alert(
                'Partner Found!',
                `${peer.username || 'Someone'} wants to connect.\nTheir language: ${getLangLabel(peer.sourceLang)} → ${getLangLabel(peer.targetLang)}`,
                [
                    { text: 'Cancel', style: 'cancel', onPress: () => qrPairingService.cancelSession() },
                    {
                        text: 'Start Translation',
                        onPress: () => startTranslationCall(peer)
                    },
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
        navigation.reset({
            index: 0,
            routes: [{
                name: 'QRTranslationScreen',
                params: {
                    peerId: peer.peerId,
                    peerName: peer.username,
                    peerSourceLang: peer.sourceLang,
                    peerTargetLang: peer.targetLang,
                    isHost: true,
                },
            }],
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

            navigation.reset({
                index: 0,
                routes: [{
                    name: 'QRTranslationScreen',
                    params: {
                        peerId: host.peerId,
                        peerName: host.username,
                        peerSourceLang: host.sourceLang,
                        peerTargetLang: host.targetLang,
                        isHost: false,
                    },
                }],
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

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.heroSection}>
                    <View style={styles.heroIcon}>
                        <Ionicons name="qr-code" size={48} color="#8b5cf6" />
                    </View>
                    <Text style={[styles.heroTitle, { color: colors.text }]}>
                        Live Translation
                    </Text>
                    <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
                        Connect with anyone nearby. Speak different languages, understand each other instantly.
                    </Text>
                </View>

                <View style={styles.langSection}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        Your Language Settings
                    </Text>
                    <View style={styles.langRow}>
                        <TouchableOpacity
                            style={[styles.langBtn, { backgroundColor: colors.surface }]}
                            onPress={() => openLangSelect('source')}
                        >
                            <Text style={[styles.langLabel, { color: colors.textSecondary }]}>
                                I speak
                            </Text>
                            <Text style={[styles.langValue, { color: colors.text }]}>
                                {getLangLabel(sourceLang)}
                            </Text>
                            <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                        </TouchableOpacity>

                        <Ionicons name="arrow-forward" size={20} color={colors.textTertiary} />

                        <TouchableOpacity
                            style={[styles.langBtn, { backgroundColor: colors.surface }]}
                            onPress={() => openLangSelect('target')}
                        >
                            <Text style={[styles.langLabel, { color: colors.textSecondary }]}>
                                Translate to
                            </Text>
                            <Text style={[styles.langValue, { color: colors.text }]}>
                                {getLangLabel(targetLang)}
                            </Text>
                            <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.actionSection}>
                    <TouchableOpacity
                        style={styles.primaryBtn}
                        onPress={handleShowQR}
                        disabled={loading}
                    >
                        <Ionicons name="qr-code-outline" size={24} color="#ffffff" />
                        <Text style={styles.primaryBtnText}>Show My QR Code</Text>
                        {loading && <ActivityIndicator size="small" color="#ffffff" style={styles.btnLoader} />}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.secondaryBtn, { backgroundColor: colors.surface }]}
                        onPress={() => setShowScanModal(true)}
                        disabled={loading}
                    >
                        <Ionicons name="scan-outline" size={24} color="#8b5cf6" />
                        <Text style={[styles.secondaryBtnText, { color: colors.text }]}>
                            Scan Partner's QR
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.howItWorks}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        How It Works
                    </Text>
                    <View style={[styles.stepCard, { backgroundColor: colors.surface }]}>
                        <View style={styles.stepRow}>
                            <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
                            <Text style={[styles.stepText, { color: colors.text }]}>
                                Set your language and what you want to hear
                            </Text>
                        </View>
                        <View style={styles.stepRow}>
                            <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
                            <Text style={[styles.stepText, { color: colors.text }]}>
                                Show your QR or scan their QR code
                            </Text>
                        </View>
                        <View style={styles.stepRow}>
                            <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
                            <Text style={[styles.stepText, { color: colors.text }]}>
                                Start talking – both hear translations live
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            <Modal visible={showQRModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>
                                Your QR Code
                            </Text>
                            <TouchableOpacity onPress={handleCloseQR}>
                                <Ionicons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                            Ask your partner to scan this code
                        </Text>
                        <View style={styles.qrWrapper}>
                            <QRDisplay
                                data={qrPairingService.generateQRData()}
                                expiresAt={session?.expiresAt}
                                size={220}
                            />
                        </View>
                        <View style={styles.langInfo}>
                            <Text style={[styles.langInfoText, { color: colors.textSecondary }]}>
                                {getLangLabel(sourceLang)} → {getLangLabel(targetLang)}
                            </Text>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal visible={showScanModal} animationType="slide">
                <QRScanner
                    onScan={handleScan}
                    onClose={() => setShowScanModal(false)}
                />
            </Modal>

            <Modal visible={showLangModal} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.langModalContent, { backgroundColor: colors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>
                                {langSelectType === 'source' ? 'I Speak' : 'Translate To'}
                            </Text>
                            <TouchableOpacity onPress={() => setShowLangModal(false)}>
                                <Ionicons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.langList}>
                            {LANGUAGES.filter(l => langSelectType === 'source' || l.code !== 'auto').map(lang => (
                                <TouchableOpacity
                                    key={lang.code}
                                    style={[
                                        styles.langItem,
                                        { borderBottomColor: colors.border },
                                        (langSelectType === 'source' ? sourceLang : targetLang) === lang.code && styles.langItemActive,
                                    ]}
                                    onPress={() => handleLangSelect(lang.code)}
                                >
                                    <Text style={[styles.langItemText, { color: colors.text }]}>
                                        {lang.label}
                                    </Text>
                                    {(langSelectType === 'source' ? sourceLang : targetLang) === lang.code && (
                                        <Ionicons name="checkmark" size={20} color="#8b5cf6" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollView: { flex: 1 },
    scrollContent: { padding: 20, paddingTop: 24 },
    heroSection: { alignItems: 'center', marginBottom: 32 },
    heroIcon: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: 'rgba(139,92,246,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    heroTitle: { fontSize: 26, fontWeight: '700', marginBottom: 8 },
    heroSubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22, paddingHorizontal: 16 },
    langSection: { marginBottom: 24 },
    sectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.7 },
    langRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    langBtn: { flex: 1, padding: 14, borderRadius: 12 },
    langLabel: { fontSize: 11, marginBottom: 4 },
    langValue: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
    actionSection: { gap: 12, marginBottom: 32 },
    primaryBtn: {
        backgroundColor: '#8b5cf6',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        borderRadius: 16,
        gap: 10,
    },
    primaryBtnText: { color: '#ffffff', fontSize: 17, fontWeight: '600' },
    btnLoader: { marginLeft: 8 },
    secondaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        borderRadius: 16,
        gap: 10,
    },
    secondaryBtnText: { fontSize: 17, fontWeight: '600' },
    howItWorks: { marginBottom: 24 },
    stepCard: { borderRadius: 16, padding: 16 },
    stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    stepNum: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#8b5cf6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    stepNumText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
    stepText: { flex: 1, fontSize: 14, lineHeight: 20 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
    modalContent: { borderRadius: 24, padding: 24, alignItems: 'center' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 8 },
    modalTitle: { fontSize: 20, fontWeight: '600' },
    modalSubtitle: { fontSize: 14, marginBottom: 24, textAlign: 'center' },
    qrWrapper: { marginBottom: 16 },
    langInfo: { marginTop: 8 },
    langInfoText: { fontSize: 14 },
    langModalContent: { borderRadius: 20, maxHeight: '70%', overflow: 'hidden' },
    langList: { maxHeight: 400 },
    langItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
    langItemActive: { backgroundColor: 'rgba(139,92,246,0.1)' },
    langItemText: { fontSize: 16 },
});
