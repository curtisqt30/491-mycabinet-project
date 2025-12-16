import React, { useMemo, useRef, useState, useCallback } from 'react';
import { router, Link } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import FormButton from '@/components/ui/FormButton';
import AuthInput from '@/components/ui/AuthInput';
import { DarkTheme as Colors } from '@/components/ui/ColorPalette';
import PasswordRules from '@/components/ui/PasswordRules';
import { SignupFlowStore } from '../lib/signup-flow';

const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  process.env.EXPO_PUBLIC_API_BASE ??
  'http://127.0.0.1:8000/api/v1';

const MIN_LEN = 10;
const RESEND_COOLDOWN = 30; // seconds
const MAX_EMAIL_RETRIES = 3;
const RETRY_DELAY = 1500; // ms between retries

async function fetchExists(email: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${API_BASE}/auth/exists?email=${encodeURIComponent(email)}`,
    );
    if (!res.ok) return false;
    const j = await res.json().catch(() => null);
    return !!j?.exists;
  } catch {
    return false; // fail-closed to "doesn't exist" if API unreachable
  }
}

// Helper to send OTP with retry logic for bounces
async function sendOTPWithRetry(
  email: string,
  intent: 'verify' | 'login' | 'reset',
  maxRetries: number = MAX_EMAIL_RETRIES,
): Promise<{ success: boolean; attempts: number; error?: string }> {
  let attempts = 0;
  let lastError = '';

  while (attempts < maxRetries) {
    attempts++;
    try {
      const res = await fetch(`${API_BASE}/auth/otp/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ email, intent }),
      });

      // Check for bounce/failure indicators in response
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        // If the API indicates a bounce or temporary failure, retry
        if (data.bounced || data.retry) {
          lastError = data.message || 'Email delivery issue, retrying...';
          if (attempts < maxRetries) {
            await new Promise((r) => setTimeout(r, RETRY_DELAY));
            continue;
          }
        }
        return { success: true, attempts };
      }

      // Handle specific error codes
      if (res.status === 429) {
        return {
          success: false,
          attempts,
          error: 'Too many requests. Please wait a moment.',
        };
      }

      if (res.status >= 500) {
        lastError = 'Server error, retrying...';
        if (attempts < maxRetries) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY));
          continue;
        }
      }

      // 2xx-4xx responses (except 429) - don't retry
      return { success: true, attempts }; // API returns 200 even for non-existent emails
    } catch (e: any) {
      lastError = e?.message || 'Network error';
      if (attempts < maxRetries) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY));
        continue;
      }
    }
  }

  return { success: false, attempts, error: lastError };
}

export default function CreateAccountScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Resend state
  const [codeSent, setCodeSent] = useState(false);
  const [lastSentEmail, setLastSentEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
        toValue: 6,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: -6,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: 0,
        duration: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const startCooldown = useCallback(() => {
    setResendCooldown(RESEND_COOLDOWN);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const emailTrimmed = useMemo(() => email.trim().toLowerCase(), [email]);
  const emailValid = useMemo(
    () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed),
    [emailTrimmed],
  );
  const passwordsMatch = useMemo(
    () => confirmPassword.length > 0 && password === confirmPassword,
    [password, confirmPassword],
  );
  const lengthOK = useMemo(() => password.length >= MIN_LEN, [password]);
  const allValid = useMemo(
    () => emailValid && lengthOK && passwordsMatch,
    [emailValid, lengthOK, passwordsMatch],
  );

  const goToCode = (targetEmail: string, intent: 'verify' | 'login') => {
    const q = encodeURIComponent(targetEmail);
    router.replace(`/(auth)/verify-email?email=${q}&intent=${intent}`);
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || !lastSentEmail) return;

    setBusy(true);
    setError(null);

    const result = await sendOTPWithRetry(lastSentEmail, 'verify');

    if (result.success) {
      startCooldown();
      Alert.alert(
        'Code Sent! ✉️',
        `A new verification code has been sent to ${lastSentEmail}.\n\n${result.attempts > 1 ? `(Sent after ${result.attempts} attempts)` : ''}`,
        [{ text: 'OK' }],
      );
      setSuccess('New code sent! Check your email.');
    } else {
      Alert.alert(
        'Failed to Send Code',
        result.error ||
          'Unable to send verification email. Please check your email address and try again.',
        [{ text: 'OK' }],
      );
      setError(result.error || 'Failed to send code. Please try again.');
      shake();
    }

    setBusy(false);
  };

  const handleCreate = async () => {
    if (!allValid || busy) {
      setError('Please fix the issues above.');
      shake();
      return;
    }

    setBusy(true);
    setError(null);
    setSuccess(null);

    try {
      // 0) If the email already exists, notify and redirect
      const exists = await fetchExists(emailTrimmed);
      if (exists) {
        Alert.alert(
          'Account Exists',
          'An account with this email already exists. Would you like to sign in instead?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Sign In',
              onPress: () => router.replace('/(auth)/login'),
            },
          ],
        );
        setError('That email is already registered.');
        shake();
        setBusy(false);
        return;
      }

      // 1) Stash creds in-memory for post-verify registration
      SignupFlowStore.set(emailTrimmed, password);

      // 2) Request a verification code with retry logic
      const result = await sendOTPWithRetry(emailTrimmed, 'verify');

      if (!result.success) {
        Alert.alert(
          'Email Delivery Issue',
          `We had trouble sending the verification email after ${result.attempts} attempts.\n\n${result.error || 'Please check your email address and try again.'}`,
          [{ text: 'OK' }],
        );
        setError('Failed to send verification email. Please try again.');
        shake();
        setBusy(false);
        return;
      }

      // Track for resend
      setCodeSent(true);
      setLastSentEmail(emailTrimmed);
      startCooldown();

      // 3) Show success notification
      Alert.alert(
        'Verification Code Sent!',
        `We've sent a verification code to:\n${emailTrimmed}\n\nPlease check your inbox (and spam folder).${result.attempts > 1 ? `\n\n(Sent after ${result.attempts} attempts)` : ''}`,
        [
          {
            text: 'Continue',
            onPress: () => goToCode(emailTrimmed, 'verify'),
          },
        ],
      );
      setSuccess('Check your email for a verification code.');
    } catch (e: any) {
      Alert.alert(
        'Network Error',
        'Unable to connect to the server. Please check your internet connection and try again.',
        [{ text: 'OK' }],
      );
      setError(`Network error: ${e?.message ?? e}`);
      shake();
    } finally {
      setBusy(false);
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
            <Animated.View style={{ transform: [{ translateX: shakeX }] }}>
              <Text style={styles.title}>Create Account</Text>
            </Animated.View>
            <Text style={styles.subtitle}>Please enter your details</Text>

            <AuthInput
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              type="email"
              returnKeyType="next"
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <AuthInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              type="password"
              returnKeyType="next"
            />

            <AuthInput
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              type="password"
              returnKeyType="go"
              onSubmitEditing={() => {
                void handleCreate();
              }}
            />

            <PasswordRules
              password={password}
              confirmPassword={confirmPassword}
              email={emailTrimmed}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {success ? <Text style={styles.success}>{success}</Text> : null}

            <FormButton
              title={busy ? 'Creating…' : 'Create'}
              onPress={() => {
                void handleCreate();
              }}
              disabled={!allValid || busy}
            />

            {/* Resend Code Button - appears after first send */}
            {codeSent && lastSentEmail && (
              <TouchableOpacity
                style={[
                  styles.resendButton,
                  (resendCooldown > 0 || busy) && styles.resendButtonDisabled,
                ]}
                onPress={handleResendCode}
                disabled={resendCooldown > 0 || busy}
              >
                <Text
                  style={[
                    styles.resendText,
                    (resendCooldown > 0 || busy) && styles.resendTextDisabled,
                  ]}
                >
                  {resendCooldown > 0
                    ? `Resend code (${resendCooldown}s)`
                    : 'Resend verification code'}
                </Text>
              </TouchableOpacity>
            )}

            {busy ? <ActivityIndicator style={{ marginTop: 12 }} /> : null}

            <Text style={styles.newUserText}>
              Already have an account?{' '}
              <Link href="/(auth)/login" asChild>
                <Text style={styles.link}>Sign in here</Text>
              </Link>
            </Text>
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
    fontSize: 28,
    marginBottom: 10,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  link: { color: Colors.link },
  newUserText: { marginTop: 15, color: Colors.textSecondary, fontSize: 14 },
  error: { marginTop: 10, color: '#ff6b6b', fontSize: 13, textAlign: 'center' },
  success: {
    marginTop: 10,
    color: '#22c55e',
    fontSize: 13,
    textAlign: 'center',
  },
  resendButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  resendButtonDisabled: {
    opacity: 0.5,
  },
  resendText: {
    color: Colors.link,
    fontSize: 14,
    textAlign: 'center',
  },
  resendTextDisabled: {
    color: Colors.textSecondary,
  },
});