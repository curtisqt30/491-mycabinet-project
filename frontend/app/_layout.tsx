import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DarkTheme as Colors } from '@/components/ui/ColorPalette';
import { AuthProvider } from './lib/AuthContext';
import { AuthGuard } from './lib/AuthGuard';
import { DrinksProvider } from './lib/DrinksContext';
import BottomNav from '@/components/ui/BottomNav';

const TABS = [
  { icon: 'home-outline', route: '/home' },
  { icon: 'cube-outline', route: '/cabinet' },
  { icon: 'heart-outline', route: '/favorites' },
  { icon: 'search-outline', route: '/search' },
  { icon: 'chatbubble-outline', route: '/assistant' },
  { icon: 'person-outline', route: '/profile' },
];

function RootLayoutNav() {
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  
  // Only show bottom nav in (tabs) group
  const showBottomNav = segments[0] === '(tabs)';

  return (
    <View style={styles.container}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(stack)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      
      {showBottomNav && (
        <View style={[styles.dock, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <BottomNav items={TABS as any} />
        </View>
      )}
      
      <StatusBar style="light" backgroundColor="#101010" />
    </View>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  if (!loaded) return null;

  const navTheme = {
    ...(DarkTheme as any),
    colors: {
      ...(DarkTheme as any).colors,
      background: Colors.background,
      card: Colors.background,
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <DrinksProvider>
          <ThemeProvider value={navTheme}>
            <AuthGuard>
              <RootLayoutNav />
            </AuthGuard>
          </ThemeProvider>
        </DrinksProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  dock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: 'transparent',
  },
});