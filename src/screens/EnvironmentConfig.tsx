import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ScrollView,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import {
  SIGNALING_SERVER_URL,
  FALLBACK_SERVER_URLS,
  NODE_ENV,
  WEBRTC_TIMEOUT,
  WEBRTC_RECONNECTION_ATTEMPTS,
  WEBRTC_RECONNECTION_DELAY,
  STUN_SERVERS,
} from '@env';

const EnvironmentConfig: React.FC = () => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const envConfig = {
    'Signaling Server': {
      'Primary URL': SIGNALING_SERVER_URL || 'Not configured',
      'Fallback URLs': FALLBACK_SERVER_URLS || 'Not configured',
      'Environment': NODE_ENV || 'production',
    },
    'WebRTC Settings': {
      'Connection Timeout': `${WEBRTC_TIMEOUT || '20000'}ms`,
      'Reconnection Attempts': WEBRTC_RECONNECTION_ATTEMPTS || '3',
      'Reconnection Delay': `${WEBRTC_RECONNECTION_DELAY || '1000'}ms`,
    },
    'STUN Servers': {
      'Servers': STUN_SERVERS || 'Default Google STUN servers',
    },
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const testConnection = async () => {
    Alert.alert(
      'Connection Test',
      'This would test the connection to the configured signaling server.',
      [{ text: 'OK' }]
    );
  };

  const switchEnvironment = () => {
    Alert.alert(
      'Switch Environment',
      'To switch environments, update the SIGNALING_SERVER_URL in your .env file and restart the app.',
      [{ text: 'OK' }]
    );
  };

  const renderConfigSection = (title: string, config: Record<string, string>) => {
    const isExpanded = expandedSection === title;
    
    return (
      <View key={title} style={styles.configSection}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection(title)}
        >
          <LinearGradient
            colors={['rgba(139, 92, 246, 0.8)', 'rgba(236, 72, 153, 0.8)']}
            style={styles.sectionGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.sectionTitle}>{title}</Text>
            <Ionicons 
              name={isExpanded ? 'chevron-up' : 'chevron-down'} 
              size={20} 
              color="#ffffff" 
            />
          </LinearGradient>
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={styles.sectionContent}>
            {Object.entries(config).map(([key, value]) => (
              <View key={key} style={styles.configRow}>
                <Text style={styles.configKey}>{key}:</Text>
                <Text style={styles.configValue}>{value}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor='black' style='light' />
      
      <View style={styles.header}>
        <LinearGradient
          colors={['#8b5cf6', '#ec4899']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.headerTitle}>Environment Configuration</Text>
          <Text style={styles.headerSubtitle}>
            Current Mode: {NODE_ENV || 'Production'}
          </Text>
        </LinearGradient>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.statusCard}>
          <LinearGradient
            colors={['rgba(0, 0, 0, 0.8)', 'rgba(0, 0, 0, 0.6)']}
            style={styles.statusGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statusHeader}>
              <Ionicons name="server" size={24} color="#ffffff" />
              <Text style={styles.statusTitle}>Signaling Server Status</Text>
            </View>
            <Text style={styles.serverUrl}>
              {SIGNALING_SERVER_URL || 'Using default server'}
            </Text>
            <View style={styles.statusIndicator}>
              <View style={[
                styles.statusDot,
                { backgroundColor: SIGNALING_SERVER_URL?.includes('localhost') ? '#f59e0b' : '#10b981' }
              ]} />
              <Text style={styles.statusText}>
                {SIGNALING_SERVER_URL?.includes('localhost') ? 'Development' : 'Production'} Mode
              </Text>
            </View>
          </LinearGradient>
        </View>

        {Object.entries(envConfig).map(([section, config]) => 
          renderConfigSection(section, config)
        )}

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={testConnection}>
            <LinearGradient
              colors={['rgba(59, 130, 246, 0.9)', 'rgba(37, 99, 235, 0.9)']}
              style={styles.actionGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="flash" size={20} color="#ffffff" />
              <Text style={styles.actionText}>Test Connection</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={switchEnvironment}>
            <LinearGradient
              colors={['rgba(236, 72, 153, 0.9)', 'rgba(219, 39, 119, 0.9)']}
              style={styles.actionGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="swap-horizontal" size={20} color="#ffffff" />
              <Text style={styles.actionText}>Switch Environment</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.instructions}>
          <LinearGradient
            colors={['rgba(0, 0, 0, 0.7)', 'rgba(0, 0, 0, 0.5)']}
            style={styles.instructionsGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.instructionsTitle}>📝 Configuration Instructions</Text>
            <Text style={styles.instructionsText}>
              • Edit the .env file in your project root{'\n'}
              • Set SIGNALING_SERVER_URL to your desired server{'\n'}
              • For development: http://localhost:3000{'\n'}
              • For production: update with your production URL{'\n'}
              • Restart the app after changes
            </Text>
          </LinearGradient>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  header: {
    marginTop: 20,
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  headerGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  statusCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  statusGradient: {
    padding: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
  serverUrl: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  configSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionGradient: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  sectionContent: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  configKey: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    flex: 1,
  },
  configValue: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'monospace',
    flex: 2,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionGradient: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  instructions: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  instructionsGradient: {
    padding: 16,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 18,
  },
});

export default EnvironmentConfig;
