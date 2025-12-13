import React, { useMemo, useRef, useState } from 'react';
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

export default function CreateAccountScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
      // 0) If the email already exists, do NOT start verify-signup.
      const exists = await fetchExists(emailTrimmed);
      if (exists) {
        setError('That email is already registered.');
        // simple redirect to password login
        router.replace('/(auth)/login');
        shake();
        return;
      }

      // 1) Stash creds in-memory for post-verify registration
      SignupFlowStore.set(emailTrimmed, password);

      // 2) Request a verification code (no DB insert yet)
      await fetch(`${API_BASE}/auth/otp/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ email: emailTrimmed, intent: 'verify' }),
      }).catch(() => {
        /* ignore */
      });

      // 3) Go to code entry screen (verify first)
      setSuccess('Check your email for a verification code.');
      goToCode(emailTrimmed, 'verify');
    } catch (e: any) {
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
});