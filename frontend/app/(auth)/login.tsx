import React, { useMemo, useRef, useState } from 'react';
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
import { Link } from 'expo-router';
import { DarkTheme as Colors } from '@/components/ui/ColorPalette';
import FormButton from '@/components/ui/FormButton';
import AuthInput from '@/components/ui/AuthInput';
import CheckBox from '@/components/ui/CheckBox';
import { useAuth } from '../lib/AuthContext';

export default function LoginScreen() {
  const { login, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // shake animation
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

  const emailValid = useMemo(() => /\S+@\S+\.\S+/.test(email.trim()), [email]);
  const pwValid = useMemo(() => password.trim().length >= 1, [password]);
  const allValid = useMemo(() => emailValid && pwValid, [emailValid, pwValid]);
  const isLoading = busy || authLoading;

  const handleLogin = async () => {
    if (!allValid || isLoading) {
      setError('Please enter a valid email and password.');
      shake();
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);

    try {
      // Use the auth context login - it handles token storage
      await login(email.trim().toLowerCase(), password, rememberMe);

      setSuccess('Signed in! Redirecting…');
      // AuthGuard will handle the redirect to home
    } catch (e: any) {
      const message = e?.message || 'Login failed';

      if (message.includes('Invalid') || message.includes('401')) {
        setError('Invalid email or password.');
      } else if (message.includes('Network') || message.includes('fetch')) {
        setError('Network error. Please check your connection.');
      } else {
        setError(message);
      }
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
              <Text style={styles.title}>Sign in</Text>
            </Animated.View>
            <Text style={styles.subtitle}>Please enter your account here</Text>

            <AuthInput
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              type="email"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              editable={!isLoading}
            />

            <AuthInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              type="password"
              autoComplete="password"
              textContentType="password"
              returnKeyType="go"
              editable={!isLoading}
              onSubmitEditing={() => {
                void handleLogin();
              }}
            />

            <View style={styles.row}>
              <CheckBox
                checked={rememberMe}
                onChange={setRememberMe}
                label="Keep me signed in"
                disabled={isLoading}
              />
              <Link href="/reset-password" asChild>
                <Text style={styles.forgotLink}>Forgot password?</Text>
              </Link>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {success ? <Text style={styles.success}>{success}</Text> : null}

            <FormButton
              title={isLoading ? 'Signing in…' : 'Login'}
              onPress={() => {
                void handleLogin();
              }}
              disabled={!allValid || isLoading}
            />
            {isLoading ? <ActivityIndicator style={{ marginTop: 12 }} /> : null}

            <Text style={styles.newUserText}>
              New user?{' '}
              <Link href="/create-account" asChild>
                <Text style={styles.link}>Sign up here</Text>
              </Link>
            </Text>

            {/* Info about remember me */}
            <Text style={styles.infoText}>
              {rememberMe
                ? '✓ You will stay signed in on this device'
                : 'You will need to sign in again next time'}
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
    marginBottom: 20,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  link: { color: Colors.link },
  newUserText: { marginTop: 15, color: Colors.textSecondary, fontSize: 14 },
  forgotLink: { color: Colors.link, fontSize: 14 },
  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  error: { marginTop: 8, color: '#ff6b6b', fontSize: 13, textAlign: 'center' },
  success: {
    marginTop: 8,
    color: '#22c55e',
    fontSize: 13,
    textAlign: 'center',
  },
  infoText: {
    marginTop: 12,
    color: Colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
  },
});
