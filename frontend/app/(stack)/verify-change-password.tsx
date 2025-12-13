import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import FormButton from '@/components/ui/FormButton';
import { DarkTheme as Colors } from '@/components/ui/ColorPalette';

const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  process.env.EXPO_PUBLIC_API_BASE ??
  'http://127.0.0.1:8000/api/v1';

const CODE_LEN = 6;

export default function VerifyChangePasswordScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();

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
    if (!canSubmit || submitting) return;

    // Don't verify OTP here - pass it to the change-password screen
    // which will verify it when actually changing the password.
    // This prevents double-consumption of the OTP.
    router.replace(
      `/(stack)/change-password?verified=true&email=${encodeURIComponent(normalizedEmail)}&code=${encodeURIComponent(codeString)}`,
    );
  };

  const handleResend = async () => {
    if (!normalizedEmail) return;
    try {
      await fetch(`${API_BASE}/auth/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, intent: 'verify' }),
      });
      Alert.alert('Code sent', 'Check your inbox for a new code.');
    } catch {
      Alert.alert("Couldn't resend", 'Please try again shortly.');
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
            <Text style={styles.title}>Verify Your Identity</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit code to {normalizedEmail || 'your email'} to
              confirm this password change.
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
                />
              ))}
            </View>

            <FormButton
              title={submitting ? 'Verifying...' : 'Continue'}
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

            <Text style={styles.cancel} onPress={() => router.back()}>
              Cancel
            </Text>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const BOX_SIZE = 50;

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingTop: 140,
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
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
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