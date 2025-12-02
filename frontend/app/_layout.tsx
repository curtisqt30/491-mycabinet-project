import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DarkTheme as Colors } from '@/components/ui/ColorPalette';
import { AuthProvider } from './lib/AuthContext';
import { AuthGuard } from './lib/AuthGuard';

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
        <ThemeProvider value={navTheme}>
          <AuthGuard>
            <Stack
              screenOptions={{
                contentStyle: { backgroundColor: Colors.background },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="(stack)" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen
                name="+not-found"
                options={{
                  headerStyle: { backgroundColor: Colors.background },
                  headerTintColor: '#F5F0E1',
                }}
              />
            </Stack>
          </AuthGuard>
          <StatusBar style="light" backgroundColor="#101010" />
        </ThemeProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
