import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from './lib/AuthContext';
import { DarkTheme as Colors } from '@/components/ui/ColorPalette';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    // Once auth state is determined, redirect appropriately
    if (isAuthenticated) {
      router.replace('/(tabs)/home');
    } else {
      // Show onboarding for new users, or login for returning users
      // For now, always go to onboarding first (user can skip)
      router.replace('/(auth)/onboarding');
    }
  }, [isAuthenticated, isLoading]);

  // Show loading state while checking auth
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.textPrimary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
