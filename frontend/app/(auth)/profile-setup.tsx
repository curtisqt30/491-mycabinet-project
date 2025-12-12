import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FormButton from '@/components/ui/FormButton';
import { DarkTheme as Colors } from '@/components/ui/ColorPalette';
import { useAuth } from '../lib/AuthContext';

const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  process.env.EXPO_PUBLIC_API_BASE ??
  'http://127.0.0.1:8000/api/v1';

// Placeholder avatars for selection
const AVATAR_OPTIONS = [
  'https://api.dicebear.com/7.x/avataaars/png?seed=felix',
  'https://api.dicebear.com/7.x/avataaars/png?seed=aneka',
  'https://api.dicebear.com/7.x/avataaars/png?seed=bailey',
  'https://api.dicebear.com/7.x/avataaars/png?seed=charlie',
  'https://api.dicebear.com/7.x/avataaars/png?seed=dusty',
  'https://api.dicebear.com/7.x/avataaars/png?seed=ginger',
  'https://api.dicebear.com/7.x/avataaars/png?seed=max',
  'https://api.dicebear.com/7.x/avataaars/png?seed=lily',
  'https://api.dicebear.com/7.x/avataaars/png?seed=oliver',
  'https://api.dicebear.com/7.x/avataaars/png?seed=mia',
  'https://api.dicebear.com/7.x/avataaars/png?seed=leo',
  'https://api.dicebear.com/7.x/avataaars/png?seed=zoe',
  'https://api.dicebear.com/7.x/avataaars/png?seed=jack',
  'https://api.dicebear.com/7.x/avataaars/png?seed=luna',
  'https://api.dicebear.com/7.x/avataaars/png?seed=rocky',
];

export default function ProfileSetupScreen() {
  const insets = useSafeAreaInsets();
  const { accessToken, refreshUser } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shakeX = useRef(new Animated.Value(0)).current;

  const shake = () => {
    shakeX.setValue(0);
    Animated.sequence([
      Animated.timing(shakeX, {
        toValue: 8,
        duration: 60,
        useNativeDriver: true,
        easing: Easing.linear,
      }),
      Animated.timing(shakeX, {
        toValue: -8,
        duration: 60,
        useNativeDriver: true,
        easing: Easing.linear,
      }),
      Animated.timing(shakeX, {
        toValue: 0,
        duration: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const displayNameTrimmed = useMemo(() => displayName.trim(), [displayName]);
  const isValid = useMemo(
    () => displayNameTrimmed.length >= 1 && displayNameTrimmed.length <= 100,
    [displayNameTrimmed],
  );

  const handleComplete = async () => {
    if (!isValid || busy) {
      setError('Please enter a display name.');
      shake();
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/profile/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          display_name: displayNameTrimmed,
          avatar_url: selectedAvatar,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || 'Failed to save profile');
      }

      // Refresh user data in context - this will update needsOnboarding
      await refreshUser();

      // AuthGuard will automatically redirect to home now that onboarding is complete
    } catch (e: any) {
      setError(e?.message || 'Something went wrong');
      shake();
    } finally {
      setBusy(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip profile setup?',
      'You can always update your profile later in settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          onPress: () => {
            // run the async work in a fire-and-forget IIFE
            void (async () => {
              setBusy(true);
              try {
                await fetch(`${API_BASE}/profile/skip-onboarding`, {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                  },
                });
                await refreshUser();
                // AuthGuard will redirect
              } catch {
                // Force redirect even if API fails
                router.replace('/(tabs)/home');
              } finally {
                setBusy(false);
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
        <Animated.View style={{ transform: [{ translateX: shakeX }] }}>
          <Text style={styles.title}>Set up your profile</Text>
        </Animated.View>
        <Text style={styles.subtitle}>Let others know who you are</Text>

        {/* Avatar Selection */}
        <View style={styles.avatarSection}>
          <Image source={{ uri: selectedAvatar }} style={styles.mainAvatar} />
          <Text style={styles.avatarLabel}>Choose an avatar</Text>
          <View style={styles.avatarGrid}>
            {AVATAR_OPTIONS.map((url) => (
              <TouchableOpacity
                key={url}
                onPress={() => setSelectedAvatar(url)}
                style={[
                  styles.avatarOption,
                  selectedAvatar === url && styles.avatarOptionSelected,
                ]}
              >
                <Image source={{ uri: url }} style={styles.avatarThumb} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Display Name Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Display Name</Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="What should we call you?"
            placeholderTextColor={Colors.textSecondary}
            style={styles.input}
            maxLength={100}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={() => void handleComplete()}
          />
          <Text style={styles.charCount}>{displayNameTrimmed.length}/100</Text>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        {/* Actions */}
        <View style={styles.actions}>
          <FormButton
            title={busy ? 'Saving...' : 'Continue'}
            onPress={() => void handleComplete()}
            disabled={!isValid || busy}
          />
          {busy && <ActivityIndicator style={{ marginTop: 12 }} />}

          <TouchableOpacity
            onPress={() => void handleSkip()}
            style={styles.skipButton}
            disabled={busy}
          >
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },

  // Avatar section
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  mainAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surface,
    marginBottom: 16,
  },
  avatarLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  avatarOption: {
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 2,
  },
  avatarOptionSelected: {
    borderColor: Colors.link,
  },
  avatarThumb: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
  },

  // Input section
  inputSection: {
    width: '100%',
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  charCount: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'right',
    marginTop: 6,
  },

  // Actions
  actions: {
    width: '100%',
    marginTop: 8,
  },
  skipButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },

  error: {
    color: '#ff6b6b',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
});
