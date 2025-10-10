import React, { memo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Button as ComposeButton, ButtonElementColors } from '@expo/ui/jetpack-compose';
import type { MaterialIcon } from '@expo/ui/build/jetpack-compose/Button/types';
import { Container, Row } from '@expo/ui/jetpack-compose-primitives';
import { Button as SwiftButton } from '@expo/ui/swift-ui';

export type PlatformTabKey = string;

export interface PlatformTabBarItem {
  key: PlatformTabKey;
  label: string;
  androidIcon: MaterialIcon;
  iosIcon: string;
}

interface PlatformTabBarProps {
  items: PlatformTabBarItem[];
  activeKey: PlatformTabKey;
  onSelect: (key: PlatformTabKey) => void;
}

const ANDROID_ACTIVE_COLORS: ButtonElementColors = {
  containerColor: '#f4f5f9',
  contentColor: '#111320',
  disabledContainerColor: '#282b42',
  disabledContentColor: '#6d7190'
};

const ANDROID_INACTIVE_COLORS: ButtonElementColors = {
  containerColor: '#191d32',
  contentColor: '#8c8ea0',
  disabledContainerColor: '#191d32',
  disabledContentColor: '#8c8ea0'
};

function AndroidTabBar({ items, activeKey, onSelect }: PlatformTabBarProps) {
  return (
    <View style={styles.container}>
      <Container style={styles.androidContainer}>
        <Row horizontalArrangement="spaceEvenly" verticalAlignment="center">
          {items.map(item => {
            const focused = item.key === activeKey;
            return (
              <View key={item.key} style={styles.androidTabItem}>
                <ComposeButton
                  systemImage={item.androidIcon as any}
                  onPress={() => onSelect(item.key)}
                  elementColors={focused ? ANDROID_ACTIVE_COLORS : ANDROID_INACTIVE_COLORS}
                  variant="borderless"
                  style={styles.androidButton}
                  disabled={false}
                >
                  {' '}
                </ComposeButton>
                <View style={[styles.indicator, focused && styles.indicatorActive]} />
              </View>
            );
          })}
        </Row>
      </Container>
    </View>
  );
}

function IOSTabBar({ items, activeKey, onSelect }: PlatformTabBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iosBar}>
        {items.map(item => {
          const focused = item.key === activeKey;
          return (
            <View key={item.key} style={styles.iosTabItem}>
              <SwiftButton
                systemImage={item.iosIcon}
                variant={focused ? 'borderedProminent' : 'borderless'}
                color={focused ? '#0b0d1a' : '#9aa0bc'}
                onPress={() => onSelect(item.key)}
                style={styles.iosButton}
              />
              <View style={[styles.indicator, focused && styles.indicatorActive]} />
            </View>
          );
        })}
      </View>
    </View>
  );
}

function PlatformTabBarComponent(props: PlatformTabBarProps) {
  if (Platform.OS === 'android') {
    return <AndroidTabBar {...props} />;
  }

  return <IOSTabBar {...props} />;
}

export const PlatformTabBar = memo(PlatformTabBarComponent);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 16
  },
  androidContainer: {
    borderRadius: 28,
    backgroundColor: '#0d1020',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  androidTabItem: {
    alignItems: 'center'
  },
  androidButton: {
    width: 56,
    height: 56,
    borderRadius: 28
  },
  iosBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 28,
    backgroundColor: '#0d1020',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)'
  },
  iosTabItem: {
    alignItems: 'center'
  },
  iosButton: {
    width: 56,
    height: 56
  },
  indicator: {
    marginTop: 6,
    height: 4,
    width: 12,
    borderRadius: 999,
    backgroundColor: 'transparent'
  },
  indicatorActive: {
    backgroundColor: '#8aa2ff'
  }
});
