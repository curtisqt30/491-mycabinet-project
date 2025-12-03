import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Slot } from 'expo-router';
import BottomNav from '@/components/ui/BottomNav';

// Check if the path is a user profile path
const isProfilePath = (p: string) => {
  if (!p || p === '/') return false;
  const staticPrefixes = [
    '/home',
    '/cabinet',
    '/search',
    '/settings',
    '/favorites',
    '/assistant',
    '/profile',
  ];
  if (staticPrefixes.some((s) => p.startsWith(s))) return false;
  return p.split('/').length === 2;
};

// Define the tabs for bottom navigation
const TABS = [
  { icon: 'home-outline', route: '/home' },
  { icon: 'cube-outline', route: '/cabinet' },
  { icon: 'heart-outline', route: '/favorites' },
  { icon: 'search-outline', route: '/search' },
  { icon: 'chatbubble-outline', route: '/assistant' },
  {
    icon: 'person-outline',
    route: '/profile',
    match: (p: string) =>
      isProfilePath(p) ||
      p.startsWith('/user-profile') ||
      p.startsWith('/profile'),
  },
];

// Layout component that includes bottom navigation on tab screens
export default function TabsLayout() {
  return (
    <View style={styles.wrap}>
      <View style={styles.content} pointerEvents="box-none">
        <Slot />
      </View>
      <View style={styles.dock} pointerEvents="auto">
        <BottomNav safeArea items={TABS as any} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  content: { flex: 1, paddingBottom: 90 },
  dock: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 18,
    zIndex: 1000,
    elevation: 1000,
  },
});
