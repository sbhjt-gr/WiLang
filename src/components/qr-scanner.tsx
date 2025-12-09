import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

interface QRScannerProps {
    onScan: (data: string) => void;
    onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
    const { colors } = useTheme();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);

    useEffect(() => {
        if (!permission?.granted) {
            requestPermission();
        }
    }, [permission, requestPermission]);

    const handleBarCodeScanned = ({ data }: { type: string; data: string }) => {
        if (scanned) return;
        setScanned(true);
        onScan(data);
    };

    const handleRetry = () => {
        setScanned(false);
    };

    if (!permission) {
        return (
            <View style={styles.container}>
                <Text style={[styles.text, { color: colors.text }]}>
                    Requesting camera permission...
                </Text>
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Ionicons name="camera-outline" size={64} color={colors.textSecondary} />
                <Text style={[styles.title, { color: colors.text }]}>
                    Camera Access Required
                </Text>
                <Text style={[styles.text, { color: colors.textSecondary }]}>
                    Please allow camera access to scan QR codes
                </Text>
                <TouchableOpacity
                    style={styles.permissionBtn}
                    onPress={requestPermission}
                >
                    <Text style={styles.permissionBtnText}>Grant Permission</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                    <Text style={[styles.closeBtnText, { color: colors.textSecondary }]}>
                        Cancel
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                barcodeScannerSettings={{
                    barcodeTypes: ['qr'],
                }}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            />
            <View style={styles.overlay}>
                <View style={styles.topOverlay} />
                <View style={styles.middleRow}>
                    <View style={styles.sideOverlay} />
                    <View style={styles.scanArea}>
                        <View style={[styles.corner, styles.topLeft]} />
                        <View style={[styles.corner, styles.topRight]} />
                        <View style={[styles.corner, styles.bottomLeft]} />
                        <View style={[styles.corner, styles.bottomRight]} />
                    </View>
                    <View style={styles.sideOverlay} />
                </View>
                <View style={styles.bottomOverlay}>
                    <Text style={styles.instructionText}>
                        {scanned ? 'Processing...' : 'Point camera at QR code'}
                    </Text>
                    {scanned && (
                        <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
                            <Text style={styles.retryBtnText}>Scan Again</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={28} color="#ffffff" />
            </TouchableOpacity>
        </View>
    );
}

const SCAN_SIZE = 250;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
    },
    text: {
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 32,
    },
    permissionBtn: {
        marginTop: 24,
        backgroundColor: '#8b5cf6',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
    },
    permissionBtnText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    closeBtn: {
        marginTop: 16,
        padding: 12,
    },
    closeBtnText: {
        fontSize: 16,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    topOverlay: {
        flex: 1,
        width: '100%',
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    middleRow: {
        flexDirection: 'row',
    },
    sideOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    scanArea: {
        width: SCAN_SIZE,
        height: SCAN_SIZE,
    },
    corner: {
        position: 'absolute',
        width: 30,
        height: 30,
        borderColor: '#8b5cf6',
    },
    topLeft: {
        top: 0,
        left: 0,
        borderTopWidth: 4,
        borderLeftWidth: 4,
        borderTopLeftRadius: 8,
    },
    topRight: {
        top: 0,
        right: 0,
        borderTopWidth: 4,
        borderRightWidth: 4,
        borderTopRightRadius: 8,
    },
    bottomLeft: {
        bottom: 0,
        left: 0,
        borderBottomWidth: 4,
        borderLeftWidth: 4,
        borderBottomLeftRadius: 8,
    },
    bottomRight: {
        bottom: 0,
        right: 0,
        borderBottomWidth: 4,
        borderRightWidth: 4,
        borderBottomRightRadius: 8,
    },
    bottomOverlay: {
        flex: 1,
        width: '100%',
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        paddingTop: 32,
    },
    instructionText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '500',
    },
    retryBtn: {
        marginTop: 16,
        backgroundColor: '#8b5cf6',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    retryBtnText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
    closeButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
