import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router, useSegments, useRootNavigationState } from 'expo-router';
import { useAuth } from './AuthContext';
import { DarkTheme as Colors } from '@/components/ui/ColorPalette';

/**
 * AuthGuard - Handles authentication and onboarding routing
 * 1. Redirect unauthenticated users to login
 * 2. Redirect new users to profile setup
 * 3. Allow authenticated users with completed onboarding to access main app
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, needsOnboarding } = useAuth();
  const segments = useSegments() as string[];
  const navigationState = useRootNavigationState();

  useEffect(() => {
    // Wait for navigation to be ready
    if (!navigationState?.key) return;
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[1] === 'profile-setup';

    if (!isAuthenticated) {
      // Not logged in - redirect to login
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
    } else if (needsOnboarding) {
      // Logged in but hasn't completed onboarding
      if (!inOnboarding) {
        router.replace('/(auth)/profile-setup');
      }
    } else {
      // Fully authenticated and onboarded
      if (inAuthGroup) {
        router.replace('/(tabs)/home');
      }
    }
  }, [
    isAuthenticated,
    isLoading,
    needsOnboarding,
    segments,
    navigationState?.key,
  ]);

  // Show loading spinner while checking auth state
  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.textPrimary} />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
