import React, { useMemo, useState } from 'react';
import { Alert, View, Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import FormButton from '@/components/ui/FormButton';
import AuthInput from '@/components/ui/AuthInput';
import PasswordRules from '@/components/ui/PasswordRules';
import { DarkTheme as Colors } from '@/components/ui/ColorPalette';
import { useAuth } from '@/app/lib/AuthContext';

const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  process.env.EXPO_PUBLIC_API_BASE ??
  'http://127.0.0.1:8000/api/v1';

// Screen for changing password - supports two flows:
// 1. Direct: User knows current password (no query params)
// 2. OTP-verified: User came from email verification (verified=true, email, code params)
export default function ChangePasswordScreen() {
  const { user, accessToken } = useAuth();

  // Check if coming from OTP verification flow
  const { verified, email, code } = useLocalSearchParams<{
    verified?: string;
    email?: string;
    code?: string;
  }>();

  const isOtpFlow = verified === 'true' && !!email && !!code;
  const normalizedEmail = useMemo(
    () => (email || user?.email || '').toLowerCase().trim(),
    [email, user?.email],
  );

  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Validation checks
  const passwordValid = useMemo(() => password.length >= 10, [password]);
  const passwordsMatch = useMemo(
    () => confirmPassword.length > 0 && password === confirmPassword,
    [password, confirmPassword],
  );

  // For direct flow, also require current password
  const currentPasswordValid = useMemo(
    () => isOtpFlow || currentPassword.length >= 1,
    [isOtpFlow, currentPassword],
  );

  const allValid = useMemo(
    () => passwordValid && passwordsMatch && currentPasswordValid,
    [passwordValid, passwordsMatch, currentPasswordValid],
  );

  // API call for direct password change (with current password)
  // Backend: POST /auth/password/change-with-current
  const updatePasswordDirect = async (): Promise<void> => {
    const res = await fetch(`${API_BASE}/auth/password/change-with-current`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: password,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || 'Failed to update password');
    }
  };

  // API call for OTP-verified password change (uses code instead of current password)
  // Backend: POST /auth/password/change
  const updatePasswordWithOtp = async (): Promise<void> => {
    const res = await fetch(`${API_BASE}/auth/password/change`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        email: normalizedEmail,
        code: code,
        new_password: password,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || 'Failed to update password');
    }
  };

  const onSubmit = async (): Promise<void> => {
    if (!allValid) {
      Alert.alert('Check your entries', 'Please fix the highlighted issues.');
      return;
    }

    try {
      setSubmitting(true);

      if (isOtpFlow) {
        await updatePasswordWithOtp();
      } else {
        await updatePasswordDirect();
      }

      Alert.alert('Password updated', 'Your password has been changed.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      const message = e?.message || 'Please try again.';

      // Provide more specific error messages
      if (message.includes('incorrect') || message.includes('Invalid')) {
        Alert.alert('Update failed', 'Your current password is incorrect.');
      } else if (message.includes('expired')) {
        Alert.alert(
          'Code expired',
          'Your verification code has expired. Please request a new one.',
          [{ text: 'OK', onPress: () => router.back() }],
        );
      } else {
        Alert.alert('Update failed', message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {isOtpFlow ? 'Set New Password' : 'Change Password'}
      </Text>
      <Text style={styles.subtitle}>
        {isOtpFlow
          ? `Create a new password for ${normalizedEmail}`
          : 'Enter your current password and choose a new one'}
      </Text>

      {/* Current password - only shown for direct flow */}
      {!isOtpFlow && (
        <AuthInput
          placeholder="Current Password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          type="password"
          returnKeyType="next"
          autoComplete="current-password"
        />
      )}

      <AuthInput
        placeholder="New Password"
        value={password}
        onChangeText={setPassword}
        type="password"
        returnKeyType="next"
        autoComplete="new-password"
      />

      <AuthInput
        placeholder="Confirm New Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        type="password"
        returnKeyType="done"
        onSubmitEditing={() => {
          if (allValid) void onSubmit();
        }}
      />

      <PasswordRules
        password={password}
        confirmPassword={confirmPassword}
        email={normalizedEmail}
      />

      <FormButton
        title={submitting ? 'Updating...' : 'Update Password'}
        onPress={() => {
          void onSubmit();
        }}
        disabled={!allValid || submitting}
      />

      <Text style={styles.backText} onPress={() => router.back()}>
        {isOtpFlow ? 'Cancel' : 'Back to Settings'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.background,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 28,
    marginBottom: 10,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  backText: {
    marginTop: 16,
    color: Colors.link,
    fontSize: 14,
    textAlign: 'center',
  },
});
