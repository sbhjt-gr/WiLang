import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, View } from 'react-native';
import { Text } from '@rneui/themed';

export default function HistoryScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <Text style={styles.subtitle}>Your recent calls will appear here once they are available.</Text>
      </View>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderTitle}>No history yet</Text>
        <Text style={styles.placeholderSubtitle}>Start or join a call to add it to your history.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c10',
    paddingHorizontal: 24,
    paddingTop: 24
  },
  header: {
    marginBottom: 24
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f4f5f9',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 14,
    color: '#9da3bd'
  },
  placeholder: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1f2234',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f4f5f9',
    marginBottom: 8
  },
  placeholderSubtitle: {
    fontSize: 13,
    color: '#9da3bd',
    textAlign: 'center'
  }
});
