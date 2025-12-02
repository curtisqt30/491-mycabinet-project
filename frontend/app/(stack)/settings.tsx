import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
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

  const [push, setPush] = useState(false);
  const [publicProfile, setPublicProfile] = useState(false);
  const [showDeleteLocal, setShowDeleteLocal] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [showUnits, setShowUnits] = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);
  const [useMetric, setUseMetric] = useState(false);
  const [confirmClearCache, setConfirmClearCache] = useState(false);
  const [confirmDeleteAcct, setConfirmDeleteAcct] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const insets = useSafeAreaInsets();

  // Add loading state for async operations
  const [isLoading, setIsLoading] = useState(false);

  // Get user email from auth context
  const getUserEmail = () => {
    return user?.email || 'no-reply@mycabinet.me';
  };

  const toggle = (fn: React.Dispatch<React.SetStateAction<boolean>>) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    fn((v) => !v);
  };

  // Handler for initiating account deletion with email verification
  const handleDeleteAccountWithVerification = async () => {
    setConfirmDeleteAcct(false);
    setIsLoading(true);

    try {
      const userEmail = getUserEmail();

      // Request deletion OTP
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

      // Navigate to verification screen
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

  // Handler for direct password change (requires current password)
  const handleChangePasswordDirect = () => {
    // Navigate directly to change password screen without OTP
    router.push('/(stack)/change-password');
  };

  // Handler for password change with email verification (if user forgot current password)
  const handleChangePasswordWithVerification = async () => {
    setIsLoading(true);

    try {
      const userEmail = getUserEmail();

      // Request verification OTP for password change
      const response = await fetch(`${API_BASE}/auth/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          intent: 'verify', // Using verify intent for authenticated operations
        }),
      });

      if (!response.ok && response.status !== 200) {
        throw new Error('Failed to send verification code');
      }

      // Navigate to verification screen for password change
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
      // Use auth context logout - it handles token clearing and API call
      await logout();
      // AuthGuard will redirect to login
    } catch {
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  const isBusy = isLoading || authLoading;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Back button overlay*/}
      <View style={[styles.backWrap, { top: Math.max(14, insets.top) }]}>
        <BackButton />
      </View>

      {/* Fixed header */}
      <View style={[styles.headerWrap, { paddingTop: insets.top + 56 }]}>
        <Text style={styles.title}>Settings</Text>
        {user && <Text style={styles.userEmail}>{user.email}</Text>}
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Notifications */}
        <Text style={styles.section}>Notifications</Text>
        <Row
          label="Push Notification"
          right={
            <Switch
              value={push}
              onValueChange={setPush}
              trackColor={{
                false: Colors.textSecondary,
                true: Colors.textSecondary,
              }}
              thumbColor={Colors.textPrimary}
              ios_backgroundColor={Colors.textSecondary}
            />
          }
        />

        {/* Profile */}
        <Text style={styles.section}>Profile</Text>
        <Row
          label="Public Profile"
          right={
            <Switch
              value={publicProfile}
              onValueChange={setPublicProfile}
              trackColor={{
                false: Colors.textSecondary,
                true: Colors.textSecondary,
              }}
              thumbColor={Colors.textPrimary}
              ios_backgroundColor={Colors.textSecondary}
            />
          }
        />

        {/* Account */}
        <Text style={styles.section}>Account</Text>
        <Row
          label="Delete My Local Data"
          right={<Chevron open={showDeleteLocal} />}
          onPress={() => toggle(setShowDeleteLocal)}
        />
        {showDeleteLocal && (
          <View style={styles.reveal}>
            <FormButton
              title="Clear Local Cache"
              onPress={() => setConfirmClearCache(true)}
            />
          </View>
        )}

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

        {/* General */}
        <Text style={styles.section}>General</Text>
        <Row
          label="Alcohol Calculator Units"
          right={<Chevron open={showUnits} />}
          onPress={() => toggle(setShowUnits)}
        />
        {showUnits && (
          <View style={[styles.reveal, { flexDirection: 'row', gap: 10 }]}>
            <Pressable
              style={[styles.chip, !useMetric && styles.chipActive]}
              onPress={() => setUseMetric(false)}
            >
              <Text
                style={[styles.chipText, !useMetric && styles.chipTextActive]}
              >
                oz (Imperial)
              </Text>
            </Pressable>
            <Pressable
              style={[styles.chip, useMetric && styles.chipActive]}
              onPress={() => setUseMetric(true)}
            >
              <Text
                style={[styles.chipText, useMetric && styles.chipTextActive]}
              >
                ml (Metric)
              </Text>
            </Pressable>
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

        {/* Bottom Sign Out */}
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

      {/* Confirm dialogs */}
      <ConfirmDialog
        visible={confirmClearCache}
        title="Clear Local Cache"
        message="This will remove locally stored data on this device."
        confirmText="Clear Cache"
        onCancel={() => setConfirmClearCache(false)}
        onConfirm={() => {
          setConfirmClearCache(false);
          // TODO: Implement cache clearing logic
        }}
      />

      <ConfirmDialog
        visible={confirmDeleteAcct}
        title="Delete Account"
        message="This permanently deletes your account and data. You will need to verify this action via email."
        confirmText="Send Verification Code"
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
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: Colors.buttonBackground,
  },
  chipActive: { backgroundColor: '#2a2a2a' },
  chipText: { color: Colors.textSecondary, fontWeight: '600' },
  chipTextActive: { color: Colors.textPrimary },
  footer: { marginTop: 16 },
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
