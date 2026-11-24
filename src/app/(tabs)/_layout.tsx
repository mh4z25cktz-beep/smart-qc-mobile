import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '공정 관리 & SPC',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.focusedIconContainer]}>
              <Text style={styles.iconEmoji}>📊</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'AI 불량 예측',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.focusedIconContainer]}>
              <Text style={styles.iconEmoji}>🤖</Text>
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    height: 62,
    paddingBottom: 8,
    paddingTop: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 8,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 34,
    height: 28,
    borderRadius: 8,
  },
  focusedIconContainer: {
    backgroundColor: '#EFF6FF',
  },
  iconEmoji: {
    fontSize: 18,
  },
});
