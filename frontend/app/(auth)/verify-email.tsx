import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import FormButton from '@/components/ui/FormButton';
import { DarkTheme as Colors } from '@/components/ui/ColorPalette';
import { useAuth } from '../lib/AuthContext';
import type { Href } from 'expo-router';

const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  process.env.EXPO_PUBLIC_API_BASE ??
  'http://127.0.0.1:8000/api/v1';

const CODE_LEN = 6;

export default function VerifyEmailCodeScreen() {
  const { email, next } = useLocalSearchParams<{
    email?: string;
    intent?: string;
    next?: string;
  }>();

  const { register } = useAuth();

  const intent: 'verify' = 'verify';
  const title = 'Verify your email';
  const subtitle = 'We emailed you a 6-digit verification code.';

  const [codes, setCodes] = useState<string[]>(Array(CODE_LEN).fill(''));
  const [submitting, setSubmitting] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  const normalizedEmail = useMemo(
    () => (email || '').toLowerCase().trim(),
    [email],
  );

  const targetRoute = useMemo<Href>(() => {
    const n = typeof next === 'string' ? next : '';
    // Allow only absolute paths; otherwise fallback to a known route literal
    return n.startsWith('/') ? (n as unknown as Href) : '/(tabs)/home';
  }, [next]);

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
    if (!canSubmit || submitting) return;
    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE}/auth/otp/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          email: normalizedEmail,
          intent,
          code: codeString,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        const detail =
          j?.detail && typeof j.detail === 'string'
            ? j.detail
            : 'Invalid or expired code';
        Alert.alert("Couldn't verify", detail);
        return;
      }

      // If this is a signup flow, finalize by creating the user now
      try {
        const pending = (
          await import('../lib/signup-flow')
        ).SignupFlowStore.get();

        if (pending && pending.email === normalizedEmail) {
          // Use the auth context register which handles token storage
          try {
            await register(normalizedEmail, pending.password, true); // rememberMe = true
            (await import('../lib/signup-flow')).SignupFlowStore.clear();
            // AuthGuard will redirect to home
            return;
          } catch (regError: any) {
            // If user already exists (409), try to just redirect
            if (
              regError?.message?.includes('409') ||
              regError?.message?.includes('already')
            ) {
              Alert.alert(
                'Account exists',
                'This email is already registered. Please log in instead.',
                [
                  {
                    text: 'OK',
                    onPress: () => router.replace('/(auth)/login'),
                  },
                ],
              );
              return;
            }
            throw regError;
          }
        }
      } catch (e: any) {
        if (!e?.message?.includes('already')) {
          Alert.alert(
            'Account creation failed',
            e?.message || 'Please try again.',
          );
          return;
        }
      }

      // If we get here without registering, just navigate to target
      router.replace(targetRoute);
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
        body: JSON.stringify({ email: normalizedEmail, intent }),
      });
      Alert.alert('Code sent', 'Check your inbox for a new code.');
    } catch {
      Alert.alert("Couldn't resend", 'Please try again shortly.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>
        {subtitle} {normalizedEmail ? `(${normalizedEmail})` : ''}
      </Text>

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
            editable={!submitting}
          />
        ))}
      </View>

      <FormButton
        title={submitting ? 'Verifying…' : 'Verify'}
        onPress={() => {
          void handleVerify();
        }}
        disabled={!canSubmit || submitting}
      />

      <Text
        style={styles.resend}
        onPress={() => {
          void handleResend();
        }}
      >
        Resend code
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
    marginBottom: 16,
  },
  row: { flexDirection: 'row', gap: 10, marginBottom: 20 },
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
  resend: { marginTop: 12, color: Colors.link, fontSize: 14 },
});
