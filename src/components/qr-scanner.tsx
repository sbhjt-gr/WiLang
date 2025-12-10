import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
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
    const [scanState, setScanState] = useState<'scanning' | 'detected' | 'processing'>('scanning');
    const [detectedData, setDetectedData] = useState<string | null>(null);
    const scanLockRef = useRef(false);

    useEffect(() => {
        if (!permission?.granted) {
            requestPermission();
        }
    }, [permission, requestPermission]);

    useEffect(() => {
        return () => {
            scanLockRef.current = false;
        };
    }, []);

    const handleBarCodeScanned = ({ data }: { type: string; data: string }) => {
        if (scanLockRef.current) return;
        scanLockRef.current = true;
        
        setDetectedData(data);
        setScanState('detected');
        
        setTimeout(() => {
            setScanState('processing');
            onScan(data);
        }, 300);
    };

    const handleRetry = () => {
        scanLockRef.current = false;
        setDetectedData(null);
        setScanState('scanning');
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
                onBarcodeScanned={scanState === 'scanning' ? handleBarCodeScanned : undefined}
            />
            <View style={styles.overlay}>
                <View style={styles.topOverlay} />
                <View style={styles.middleRow}>
                    <View style={styles.sideOverlay} />
                    <View style={styles.scanArea}>
                        <View style={[
                            styles.corner, 
                            styles.topLeft,
                            scanState === 'detected' && styles.cornerDetected
                        ]} />
                        <View style={[
                            styles.corner, 
                            styles.topRight,
                            scanState === 'detected' && styles.cornerDetected
                        ]} />
                        <View style={[
                            styles.corner, 
                            styles.bottomLeft,
                            scanState === 'detected' && styles.cornerDetected
                        ]} />
                        <View style={[
                            styles.corner, 
                            styles.bottomRight,
                            scanState === 'detected' && styles.cornerDetected
                        ]} />
                        {scanState !== 'scanning' && (
                            <View style={styles.detectedOverlay}>
                                {scanState === 'detected' && (
                                    <Ionicons name="checkmark-circle" size={64} color="#22c55e" />
                                )}
                                {scanState === 'processing' && (
                                    <ActivityIndicator size="large" color="#8b5cf6" />
                                )}
                            </View>
                        )}
                    </View>
                    <View style={styles.sideOverlay} />
                </View>
                <View style={styles.bottomOverlay}>
                    <Text style={styles.instructionText}>
                        {scanState === 'scanning' && 'Point camera at QR code'}
                        {scanState === 'detected' && 'QR Code detected!'}
                        {scanState === 'processing' && 'Connecting...'}
                    </Text>
                    {scanState === 'processing' && (
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
    cornerDetected: {
        borderColor: '#22c55e',
    },
    detectedOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
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
