import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import QRCode from 'react-native-qrcode-styled';
import { useTheme } from '../theme';

interface QRDisplayProps {
    data: string | null;
    expiresAt?: number;
    size?: number;
}

export default function QRDisplay({ data, expiresAt, size = 200 }: QRDisplayProps) {
    const { colors } = useTheme();
    const [countdown, setCountdown] = useState<number>(0);

    useEffect(() => {
        if (!expiresAt) return;

        const updateCountdown = () => {
            const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
            setCountdown(remaining);
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, [expiresAt]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!data) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#8b5cf6" />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                    Generating QR code...
                </Text>
            </View>
        );
    }

    const isExpired = countdown <= 0;

    return (
        <View style={styles.container}>
            <View style={[styles.qrContainer, { backgroundColor: '#ffffff' }]}>
                <QRCode
                    data={data}
                    size={size}
                    style={{ backgroundColor: 'white' }}
                    padding={20}
                    pieceScale={0.8}
                    pieceBorderRadius={4}
                    gradient={{
                        type: 'linear',
                        options: {
                            start: [0, 0],
                            end: [1, 1],
                            colors: isExpired ? ['#9ca3af', '#6b7280'] : ['#8b5cf6', '#6366f1'],
                        },
                    }}
                    outerEyesOptions={{
                        borderRadius: 12,
                        scale: 0.9,
                        color: isExpired ? '#9ca3af' : '#8b5cf6',
                    }}
                    innerEyesOptions={{
                        borderRadius: 8,
                        scale: 0.9,
                        color: isExpired ? '#6b7280' : '#4f46e5',
                    }}
                />
                {isExpired && (
                    <View style={styles.expiredOverlay}>
                        <Text style={styles.expiredText}>Expired</Text>
                    </View>
                )}
            </View>
            {expiresAt && (
                <View style={styles.timerContainer}>
                    <Text style={[
                        styles.timerText,
                        { color: countdown < 30 ? '#ef4444' : colors.textSecondary }
                    ]}>
                        {isExpired ? 'Code expired' : `Expires in ${formatTime(countdown)}`}
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    qrContainer: {
        padding: 16,
        borderRadius: 16,
        position: 'relative',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
    },
    timerContainer: {
        marginTop: 16,
    },
    timerText: {
        fontSize: 14,
        fontWeight: '500',
    },
    expiredOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255,255,255,0.9)',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
    },
    expiredText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#ef4444',
    },
});
