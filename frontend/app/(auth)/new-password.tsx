import React, { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  ScrollView,
} from 'react-native';
import FormButton from '@/components/ui/FormButton';
import AuthInput from '@/components/ui/AuthInput';
import { DarkTheme as Colors } from '@/components/ui/ColorPalette';
import PasswordRules from '@/components/ui/PasswordRules';

const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  process.env.EXPO_PUBLIC_API_BASE ??
  'http://127.0.0.1:8000/api/v1';

// Helper to safely extract string from search params (handles array case)
const getParamString = (
  param: string | string[] | undefined,
): string | undefined => {
  if (Array.isArray(param)) return param[0];
  return param;
};

export default function NewPasswordScreen() {
  const params = useLocalSearchParams<{
    email?: string;
    code?: string;
  }>();

  const emailParam = getParamString(params.email);
  const codeParam = getParamString(params.code);

  const normalizedEmail = useMemo(
    () => (emailParam || '').toLowerCase().trim(),
    [emailParam],
  );
  const normalizedCode = useMemo(
    () => (codeParam || '').replace(/\D/g, ''),
    [codeParam],
  );

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const passwordValid = useMemo(
    () => password.length >= 8 && /\d/.test(password),
    [password],
  );
  const passwordsMatch = useMemo(
    () => confirmPassword.length > 0 && password === confirmPassword,
    [password, confirmPassword],
  );
  const allValid = useMemo(
    () =>
      !!normalizedEmail && !!normalizedCode && passwordValid && passwordsMatch,
    [normalizedEmail, normalizedCode, passwordValid, passwordsMatch],
  );

  const handleSubmit = async () => {
    if (!allValid || submitting) return;
    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE}/auth/reset/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          email: normalizedEmail,
          code: normalizedCode,
          new_password: password,
        }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        Alert.alert(
          'Could not reset password',
          txt || 'Invalid or expired code.',
        );
        return;
      }
      Alert.alert(
        'Password updated',
        'You can now sign in with your new password.',
      );
      router.replace('/(auth)/login');
    } catch (e: any) {
      Alert.alert('Network error', e?.message ?? 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoid}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <Text style={styles.title}>Create New Password</Text>
            <Text style={styles.subtitle}>
              Set a new password for {normalizedEmail || 'your account'}.
            </Text>

            <AuthInput
              placeholder="New password"
              value={password}
              onChangeText={setPassword}
              type="password"
              returnKeyType="next"
            />

            <AuthInput
              placeholder="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              type="password"
              returnKeyType="go"
              onSubmitEditing={() => {
                if (allValid) void handleSubmit();
              }}
            />

            <PasswordRules
              password={password}
              confirmPassword={confirmPassword}
            />

            <FormButton
              title={submitting ? 'Updating…' : 'Reset Password'}
              onPress={() => {
                void handleSubmit();
              }}
              disabled={!allValid || submitting}
            />
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingTop: 60,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.background,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 24,
    marginBottom: 8,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
});
