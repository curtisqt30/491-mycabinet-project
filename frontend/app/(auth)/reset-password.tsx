import React, { useState, useRef, useCallback } from 'react';
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
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Link, router } from 'expo-router';
import FormButton from '@/components/ui/FormButton';
import AuthInput from '@/components/ui/AuthInput';
import { DarkTheme as Colors } from '@/components/ui/ColorPalette';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  process.env.EXPO_PUBLIC_API_BASE ??
  'http://127.0.0.1:8000/api/v1';

const RESEND_COOLDOWN = 30; // seconds
const MAX_EMAIL_RETRIES = 3;
const RETRY_DELAY = 1500; // ms between retries

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

export default function ResetPasswordScreen() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const insets = useSafeAreaInsets();

  // Resend state
  const [codeSent, setCodeSent] = useState(false);
  const [lastSentEmail, setLastSentEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isValidEmail = (e: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

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

  const handleReset = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !isValidEmail(trimmed)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    try {
      setSubmitting(true);

      // Request a reset OTP with retry logic
      const result = await sendOTPWithRetry(trimmed, 'reset');

      if (!result.success) {
        Alert.alert(
          'Email Delivery Issue',
          `We had trouble sending the reset code after ${result.attempts} attempts.\n\n${result.error || 'Please check your email address and try again.'}`,
          [{ text: 'OK' }],
        );
        return;
      }

      // Track for resend
      setCodeSent(true);
      setLastSentEmail(trimmed);
      startCooldown();

      // Show success and navigate
      Alert.alert(
        'Reset Code Sent! ✉️',
        `If an account exists for ${trimmed}, you'll receive a reset code.\n\nPlease check your inbox (and spam folder).${result.attempts > 1 ? `\n\n(Sent after ${result.attempts} attempts)` : ''}`,
        [
          {
            text: 'Enter Code',
            onPress: () => {
              const q = encodeURIComponent(trimmed);
              router.push(`/(auth)/verify-reset?email=${q}`);
            },
          },
          {
            text: 'Stay Here',
            style: 'cancel',
          },
        ],
      );
    } catch (_e) {
      Alert.alert(
        'Network Error',
        'Unable to connect to the server. Please check your internet connection and try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || submitting) return;

    // Use the last sent email if available, otherwise current input
    const targetEmail = lastSentEmail || email.trim().toLowerCase();

    if (!targetEmail || !isValidEmail(targetEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setSubmitting(true);

    const result = await sendOTPWithRetry(targetEmail, 'reset');

    if (result.success) {
      setLastSentEmail(targetEmail);
      startCooldown();
      Alert.alert(
        'Code Resent! ✉️',
        `A new reset code has been sent to ${targetEmail}.\n\nPlease check your inbox (and spam folder).${result.attempts > 1 ? `\n\n(Sent after ${result.attempts} attempts)` : ''}`,
        [
          {
            text: 'Enter Code',
            onPress: () => {
              const q = encodeURIComponent(targetEmail);
              router.push(`/(auth)/verify-reset?email=${q}`);
            },
          },
          {
            text: 'OK',
            style: 'cancel',
          },
        ],
      );
    } else {
      Alert.alert(
        'Failed to Resend',
        result.error ||
          'Unable to send reset email. Please check your email address and try again.',
        [{ text: 'OK' }],
      );
    }

    setSubmitting(false);
  };

  const handleContinueToVerify = () => {
    const targetEmail = lastSentEmail || email.trim().toLowerCase();
    if (targetEmail && isValidEmail(targetEmail)) {
      const q = encodeURIComponent(targetEmail);
      router.push(`/(auth)/verify-reset?email=${q}`);
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
            <Text style={styles.title}>Reset your password</Text>
            <Text style={styles.subtitle}>
              Enter the email associated with your account and we will send you
              a reset code.
            </Text>

            <AuthInput
              placeholder="Email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                // Reset sent state if email changes
                if (text.trim().toLowerCase() !== lastSentEmail) {
                  setCodeSent(false);
                }
              }}
              type="email"
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="go"
              onSubmitEditing={() => {
                if (email.trim()) void handleReset();
              }}
            />

            <FormButton
              title={
                submitting
                  ? 'Sending...'
                  : codeSent
                    ? 'Send New Code'
                    : 'Send Code'
              }
              onPress={() => {
                void handleReset();
              }}
              disabled={submitting || !email.trim()}
            />

            {/* Code sent status and options */}
            {codeSent && lastSentEmail && (
              <View style={styles.sentContainer}>
                <Text style={styles.sentText}>
                  ✉️ Code sent to {lastSentEmail}
                </Text>

                {/* Continue to verify button */}
                <TouchableOpacity
                  style={styles.continueButton}
                  onPress={handleContinueToVerify}
                >
                  <Text style={styles.continueText}>
                    Continue to enter code →
                  </Text>
                </TouchableOpacity>

                {/* Resend button with cooldown */}
                <TouchableOpacity
                  style={[
                    styles.resendButton,
                    (resendCooldown > 0 || submitting) &&
                      styles.resendButtonDisabled,
                  ]}
                  onPress={() => {
                    void handleResendCode();
                  }}
                  disabled={resendCooldown > 0 || submitting}
                >
                  <Text
                    style={[
                      styles.resendText,
                      (resendCooldown > 0 || submitting) &&
                        styles.resendTextDisabled,
                    ]}
                  >
                    {resendCooldown > 0
                      ? `Resend code (${resendCooldown}s)`
                      : "Didn't receive it? Resend code"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {submitting && <ActivityIndicator style={{ marginTop: 12 }} />}

            <Text style={styles.backText}>
              Remembered it?{' '}
              <Link href="/(auth)/login" asChild>
                <Text style={styles.link}>Back to login</Text>
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
    fontSize: 24,
    marginBottom: 8,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  backText: { marginTop: 14, color: Colors.textSecondary, fontSize: 14 },
  link: { color: Colors.link },
  backWrap: {
    position: 'absolute',
    left: 14,
    zIndex: 10,
  },
  sentContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  sentText: {
    color: '#22c55e',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  continueButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: Colors.link,
    borderRadius: 8,
    marginBottom: 8,
  },
  continueText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  resendButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  resendButtonDisabled: {
    opacity: 0.5,
  },
  resendText: {
    color: Colors.link,
    fontSize: 13,
    textAlign: 'center',
  },
  resendTextDisabled: {
    color: Colors.textSecondary,
  },
});
