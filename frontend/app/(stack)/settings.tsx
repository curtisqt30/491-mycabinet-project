import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  LayoutAnimation,
  Platform,
  UIManager,
  Alert,
} from 'react-native';
import { router, Stack } from 'expo-router';
import FormButton from '@/components/ui/FormButton';
import { DarkTheme as Colors } from '@/components/ui/ColorPalette';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import BackButton from '@/components/ui/BackButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native-gesture-handler';
import { useAuth } from '../lib/AuthContext';

// Safe env lookup for RN/Jest
const __ENV__ =
  typeof process !== 'undefined' && process.env
    ? process.env
    : ((globalThis as any).__APP_ENV__ ?? {});
const API_BASE =
  __ENV__.EXPO_PUBLIC_API_BASE_URL ??
  __ENV__.EXPO_PUBLIC_API_BASE ??
  'http://127.0.0.1:8000/api/v1';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function Chevron({ open }: { open: boolean }) {
  return <Text style={styles.chevron}>{open ? '˅' : '›'}</Text>;
}

export default function SettingsScreen() {
  const { user, logout, isLoading: authLoading } = useAuth();

  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);
  const [confirmDeleteAcct, setConfirmDeleteAcct] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const insets = useSafeAreaInsets();

  const [isLoading, setIsLoading] = useState(false);

  const getUserEmail = () => {
    return user?.email || 'no-reply@mycabinet.me';
  };

  const toggle = (fn: React.Dispatch<React.SetStateAction<boolean>>) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    fn((v) => !v);
  };

  const handleDeleteAccountWithVerification = async () => {
    setConfirmDeleteAcct(false);
    setIsLoading(true);

    try {
      const userEmail = getUserEmail();

      const response = await fetch(`${API_BASE}/auth/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          intent: 'delete',
        }),
      });

      if (!response.ok && response.status !== 200) {
        throw new Error('Failed to send verification code');
      }

      router.push(
        `/(stack)/verify-delete?email=${encodeURIComponent(userEmail)}`,
      );
    } catch {
      Alert.alert(
        'Error',
        'Unable to send verification code. Please try again.',
        [{ text: 'OK' }],
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePasswordDirect = () => {
    router.push('/(stack)/change-password');
  };

  const handleChangePasswordWithVerification = async () => {
    setIsLoading(true);

    try {
      const userEmail = getUserEmail();

      const response = await fetch(`${API_BASE}/auth/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          intent: 'verify',
        }),
      });

      if (!response.ok && response.status !== 200) {
        throw new Error('Failed to send verification code');
      }

      router.push(
        `/(stack)/verify-change-password?email=${encodeURIComponent(userEmail)}`,
      );
    } catch {
      Alert.alert(
        'Error',
        'Unable to send verification code. Please try again.',
        [{ text: 'OK' }],
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setConfirmSignOut(false);

    try {
      await logout();
    } catch {
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  const isBusy = isLoading || authLoading;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.backWrap, { top: Math.max(14, insets.top) }]}>
        <BackButton />
      </View>

      <View style={[styles.headerWrap, { paddingTop: insets.top + 56 }]}>
        <Text style={styles.title}>Settings</Text>
        {user && <Text style={styles.userEmail}>{user.email}</Text>}
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Account */}
        <Text style={styles.section}>Account</Text>
        <Row
          label="Delete My Account"
          right={<Chevron open={showDeleteAccount} />}
          onPress={() => toggle(setShowDeleteAccount)}
        />
        {showDeleteAccount && (
          <View style={styles.reveal}>
            <FormButton
              title="Delete Account (Permanent)"
              onPress={() => setConfirmDeleteAcct(true)}
              variant="danger"
              disabled={isBusy}
            />
          </View>
        )}

        <Row
          label="Change Password"
          right={<Chevron open={showChangePw} />}
          onPress={() => toggle(setShowChangePw)}
        />
        {showChangePw && (
          <View style={styles.reveal}>
            <FormButton
              title="Change Password"
              onPress={handleChangePasswordDirect}
              disabled={isBusy}
            />
            <Text style={styles.helperText}>
              Forgot your current password?{' '}
              <Text
                style={styles.link}
                onPress={() => void handleChangePasswordWithVerification()}
              >
                Reset via email
              </Text>
            </Text>
          </View>
        )}

        {/* Sign Out */}
        <View style={styles.footer}>
          <FormButton
            title={isBusy ? 'Signing Out...' : 'Sign Out'}
            onPress={() => setConfirmSignOut(true)}
            variant="dangerLogo"
            disabled={isBusy}
          />
        </View>

        <View style={{ height: 8 }} />
      </ScrollView>

      <ConfirmDialog
        visible={confirmDeleteAcct}
        title="Delete Account"
        message="This permanently deletes your account and data. You will need to verify this action via email."
        confirmText="Send Code"
        onCancel={() => setConfirmDeleteAcct(false)}
        onConfirm={() => void handleDeleteAccountWithVerification()}
      />

      <ConfirmDialog
        visible={confirmSignOut}
        title="Sign Out"
        message="Do you want to log out?"
        confirmText="Log Out"
        onCancel={() => setConfirmSignOut(false)}
        onConfirm={() => void handleSignOut()}
      />
    </>
  );
}

function Row({
  label,
  right,
  onPress,
}: {
  label: string;
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  const Wrapper: any = onPress ? Pressable : View;
  return (
    <Wrapper onPress={onPress} style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={{ marginLeft: 12 }}>{right}</View>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20 },
  headerWrap: { backgroundColor: Colors.background },
  backWrap: { position: 'absolute', left: 14, zIndex: 10 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  section: {
    marginTop: 18,
    marginBottom: 6,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  row: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: { fontSize: 16, color: Colors.textSecondary },
  chevron: {
    fontSize: 22,
    color: Colors.textSecondary,
    includeFontPadding: false,
  },
  reveal: { paddingVertical: 8 },
  footer: { marginTop: 24 },
  helperText: {
    marginTop: 8,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  link: {
    color: Colors.link,
    textDecorationLine: 'underline',
  },
});
