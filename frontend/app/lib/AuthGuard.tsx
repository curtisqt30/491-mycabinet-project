import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router, useSegments, useRootNavigationState } from 'expo-router';
import { useAuth } from './AuthContext';
import { DarkTheme as Colors } from '@/components/ui/ColorPalette';

// Routes that don't require authentication
const PUBLIC_SEGMENTS = ['(auth)'];

// Check if the current route is public
function isPublicRoute(segments: string[]): boolean {
  return segments.length > 0 && PUBLIC_SEGMENTS.includes(segments[0]);
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    // Wait for navigation to be ready
    if (!navigationState?.key) return;

    const inPublicRoute = isPublicRoute(segments);

    if (!isLoading) {
      if (!isAuthenticated && !inPublicRoute) {
        // User is not authenticated and trying to access protected route
        router.replace('/(auth)/login');
      } else if (isAuthenticated && inPublicRoute) {
        // User is authenticated but on auth screens (login, register, etc.)
        // Skip redirect if on onboarding (user might want to see it)
        const currentPath = `/${segments.join('/')}`;
        if (!currentPath.includes('onboarding')) {
          router.replace('/(tabs)/home');
        }
      }
    }
  }, [isAuthenticated, isLoading, segments, navigationState?.key]);

  // Show loading screen while checking auth
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.textPrimary} />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
