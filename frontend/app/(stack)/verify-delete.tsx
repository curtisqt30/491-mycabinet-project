import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import FormButton from '@/components/ui/FormButton';
import { DarkTheme as Colors } from '@/components/ui/ColorPalette';
import { useAuth } from '../lib/AuthContext';

const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  process.env.EXPO_PUBLIC_API_BASE ??
  'http://127.0.0.1:8000/api/v1';

const CODE_LEN = 6;

export default function VerifyDeleteScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const { accessToken, logout } = useAuth();

  const [codes, setCodes] = useState<string[]>(Array(CODE_LEN).fill(''));
  const [submitting, setSubmitting] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  const normalizedEmail = useMemo(
    () => (email || '').toLowerCase().trim(),
    [email],
  );

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  const setDigit = (idx: number, value: string) => {
    const v = value.replace(/\D/g, '');
    setCodes((prev) => {
      const nextCodes = [...prev];
      nextCodes[idx] = v.slice(-1);
      return nextCodes;
    });
    if (v && idx < CODE_LEN - 1) inputs.current[idx + 1]?.focus();
  };

  const onKeyPress = (idx: number, key: string) => {
    if (key === 'Backspace' && !codes[idx] && idx > 0)
      inputs.current[idx - 1]?.focus();
  };

  const codeString = useMemo(() => codes.join(''), [codes]);
  const canSubmit = useMemo(
    () => codeString.length === CODE_LEN && !!normalizedEmail,
    [codeString, normalizedEmail],
  );

  const handleVerify = async () => {
    if (!canSubmit || submitting) {
      return;
    }
    
    if (!accessToken) {
      Alert.alert('Error', 'You must be logged in to delete your account.');
      return;
    }

    try {
      setSubmitting(true);

      // Call the delete account endpoint with OTP verification
      const deleteRes = await fetch(`${API_BASE}/auth/account`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          email: normalizedEmail,
          intent: 'delete',
          code: codeString,
        }),
      });

      if (!deleteRes.ok) {
        const j = await deleteRes.json().catch(() => null);
        const detail =
          j?.detail && typeof j.detail === 'string'
            ? j.detail
            : 'Invalid or expired code';
        Alert.alert("Couldn't verify", detail);
        return;
      }

      // Account successfully deleted
      await deleteRes.json();

      // Clear auth tokens
      await logout();

      // Force redirect to login after a brief delay
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 100);

      // Show success message
      Alert.alert(
        'Account Deleted',
        "Your account has been permanently deleted. We're sorry to see you go.",
        [{ text: 'OK' }],
      );
    } catch (e: any) {
      Alert.alert('Network error', e?.message ?? 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!normalizedEmail) return;
    try {
      await fetch(`${API_BASE}/auth/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, intent: 'delete' }),
      });
      Alert.alert('Code sent', 'Check your inbox for a new code.');
    } catch {
      Alert.alert("Couldn't resend", 'Please try again shortly.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Confirm Account Deletion</Text>
      <Text style={styles.subtitle}>
        We sent a 6-digit code to {normalizedEmail || 'your email'}. Enter it to
        permanently delete your account.
      </Text>
      <Text style={styles.warning}>⚠️ This action cannot be undone</Text>

      <View style={styles.row}>
        {Array.from({ length: CODE_LEN }).map((_, i) => (
          <TextInput
            key={i}
            ref={(el) => {
              inputs.current[i] = el;
            }}
            value={codes[i]}
            onChangeText={(v) => setDigit(i, v)}
            onKeyPress={({ nativeEvent }) => onKeyPress(i, nativeEvent.key)}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            maxLength={1}
            style={styles.box}
            returnKeyType={i === CODE_LEN - 1 ? 'done' : 'next'}
          />
        ))}
      </View>

      <FormButton
        title={submitting ? 'Deleting...' : 'Delete Account'}
        onPress={() => {
          void handleVerify();
        }}
        disabled={!canSubmit || submitting}
        variant="danger"
      />

      <Text
        style={styles.resend}
        onPress={() => {
          void handleResend();
        }}
      >
        Resend code
      </Text>

      <Text style={styles.cancel} onPress={() => router.back()}>
        Cancel
      </Text>
    </View>
  );
}

const BOX_SIZE = 50;

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
    fontSize: 24,
    marginBottom: 8,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  warning: {
    fontSize: 14,
    color: '#ff6b6b',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    textAlign: 'center',
    fontSize: 20,
    color: Colors.textPrimary,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  resend: {
    marginTop: 12,
    color: Colors.link,
    fontSize: 14,
  },
  cancel: {
    marginTop: 8,
    color: Colors.textSecondary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});